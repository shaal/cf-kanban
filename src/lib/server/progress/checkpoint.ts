/**
 * TASK-062: Checkpoint and Restore System
 *
 * Provides checkpoint functionality for execution progress:
 * - Save execution state periodically
 * - Restore from last checkpoint on failure
 * - Support manual checkpoint creation
 * - Cleanup old checkpoints
 */

import { prisma } from '../prisma';
import type { TicketProgress, ProgressStage } from './tracker';

/**
 * Checkpoint data structure stored in database
 */
export interface CheckpointData {
	ticketId: string;
	projectId: string;
	stages: ProgressStage[];
	currentStage: string;
	percentComplete: number;
	logs: Array<{
		timestamp: string;
		level: string;
		message: string;
		stage?: string;
		metadata?: Record<string, unknown>;
	}>;
	startedAt: string;
	context: Record<string, unknown>;
}

/**
 * Checkpoint record with metadata
 */
export interface Checkpoint {
	id: string;
	ticketId: string;
	data: CheckpointData;
	createdAt: Date;
	type: 'auto' | 'manual' | 'stage';
	version: number;
}

/**
 * Checkpoint manager configuration
 */
interface CheckpointConfig {
	autoCheckpointInterval: number; // milliseconds
	maxCheckpointsPerTicket: number;
	retentionPeriod: number; // milliseconds
}

const DEFAULT_CONFIG: CheckpointConfig = {
	autoCheckpointInterval: 60000, // 1 minute
	maxCheckpointsPerTicket: 10,
	retentionPeriod: 7 * 24 * 60 * 60 * 1000 // 7 days
};

/**
 * Checkpoint Manager Class
 *
 * Manages checkpoint creation, storage, and restoration.
 */
export class CheckpointManager {
	private config: CheckpointConfig;
	private autoCheckpointTimers = new Map<string, NodeJS.Timeout>();
	private versionCounters = new Map<string, number>();

	constructor(config: Partial<CheckpointConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	/**
	 * Create a checkpoint for a ticket's progress
	 */
	async createCheckpoint(
		progress: TicketProgress,
		type: 'auto' | 'manual' | 'stage' = 'auto',
		context: Record<string, unknown> = {}
	): Promise<Checkpoint> {
		const version = this.getNextVersion(progress.ticketId);

		const data: CheckpointData = {
			ticketId: progress.ticketId,
			projectId: progress.projectId,
			stages: progress.stages.map((stage) => ({
				...stage,
				startedAt: stage.startedAt,
				completedAt: stage.completedAt
			})),
			currentStage: progress.currentStage,
			percentComplete: progress.percentComplete,
			logs: progress.logs.map((log) => ({
				timestamp: log.timestamp.toISOString(),
				level: log.level,
				message: log.message,
				stage: log.stage,
				metadata: log.metadata
			})),
			startedAt: progress.startedAt.toISOString(),
			context
		};

		// Store in database
		const checkpoint = await prisma.executionCheckpoint.create({
			data: {
				ticketId: progress.ticketId,
				type,
				version,
				data: data as unknown as Record<string, unknown>
			}
		});

		// Cleanup old checkpoints if limit exceeded
		await this.cleanupOldCheckpoints(progress.ticketId);

		return {
			id: checkpoint.id,
			ticketId: checkpoint.ticketId,
			data,
			createdAt: checkpoint.createdAt,
			type: checkpoint.type as 'auto' | 'manual' | 'stage',
			version: checkpoint.version
		};
	}

	/**
	 * Get the latest checkpoint for a ticket
	 */
	async getLatestCheckpoint(ticketId: string): Promise<Checkpoint | null> {
		const checkpoint = await prisma.executionCheckpoint.findFirst({
			where: { ticketId },
			orderBy: { createdAt: 'desc' }
		});

		if (!checkpoint) return null;

		return {
			id: checkpoint.id,
			ticketId: checkpoint.ticketId,
			data: checkpoint.data as unknown as CheckpointData,
			createdAt: checkpoint.createdAt,
			type: checkpoint.type as 'auto' | 'manual' | 'stage',
			version: checkpoint.version
		};
	}

	/**
	 * Get a specific checkpoint by ID
	 */
	async getCheckpoint(checkpointId: string): Promise<Checkpoint | null> {
		const checkpoint = await prisma.executionCheckpoint.findUnique({
			where: { id: checkpointId }
		});

		if (!checkpoint) return null;

		return {
			id: checkpoint.id,
			ticketId: checkpoint.ticketId,
			data: checkpoint.data as unknown as CheckpointData,
			createdAt: checkpoint.createdAt,
			type: checkpoint.type as 'auto' | 'manual' | 'stage',
			version: checkpoint.version
		};
	}

	/**
	 * List all checkpoints for a ticket
	 */
	async listCheckpoints(ticketId: string): Promise<Checkpoint[]> {
		const checkpoints = await prisma.executionCheckpoint.findMany({
			where: { ticketId },
			orderBy: { createdAt: 'desc' }
		});

		return checkpoints.map((cp) => ({
			id: cp.id,
			ticketId: cp.ticketId,
			data: cp.data as unknown as CheckpointData,
			createdAt: cp.createdAt,
			type: cp.type as 'auto' | 'manual' | 'stage',
			version: cp.version
		}));
	}

	/**
	 * Restore progress from a checkpoint
	 */
	async restoreFromCheckpoint(checkpoint: Checkpoint): Promise<TicketProgress> {
		const data = checkpoint.data;

		return {
			ticketId: data.ticketId,
			projectId: data.projectId,
			stages: data.stages.map((stage) => ({
				...stage,
				startedAt: stage.startedAt ? new Date(stage.startedAt as unknown as string) : undefined,
				completedAt: stage.completedAt
					? new Date(stage.completedAt as unknown as string)
					: undefined
			})),
			currentStage: data.currentStage,
			percentComplete: data.percentComplete,
			estimatedRemaining: null, // Will be recalculated
			logs: data.logs.map((log) => ({
				timestamp: new Date(log.timestamp),
				level: log.level as 'info' | 'warn' | 'error' | 'debug',
				message: log.message,
				stage: log.stage,
				metadata: log.metadata
			})),
			startedAt: new Date(data.startedAt),
			lastUpdatedAt: new Date()
		};
	}

	/**
	 * Start auto-checkpointing for a ticket
	 */
	startAutoCheckpoint(
		ticketId: string,
		getProgress: () => TicketProgress | undefined
	): void {
		// Clear existing timer if any
		this.stopAutoCheckpoint(ticketId);

		const timer = setInterval(async () => {
			const progress = getProgress();
			if (progress) {
				try {
					await this.createCheckpoint(progress, 'auto');
				} catch (error) {
					console.error(`Failed to create auto checkpoint for ${ticketId}:`, error);
				}
			}
		}, this.config.autoCheckpointInterval);

		this.autoCheckpointTimers.set(ticketId, timer);
	}

	/**
	 * Stop auto-checkpointing for a ticket
	 */
	stopAutoCheckpoint(ticketId: string): void {
		const timer = this.autoCheckpointTimers.get(ticketId);
		if (timer) {
			clearInterval(timer);
			this.autoCheckpointTimers.delete(ticketId);
		}
	}

	/**
	 * Create checkpoint on stage completion
	 */
	async checkpointOnStageComplete(
		progress: TicketProgress,
		stageName: string
	): Promise<Checkpoint> {
		return this.createCheckpoint(progress, 'stage', { completedStage: stageName });
	}

	/**
	 * Delete a specific checkpoint
	 */
	async deleteCheckpoint(checkpointId: string): Promise<void> {
		await prisma.executionCheckpoint.delete({
			where: { id: checkpointId }
		});
	}

	/**
	 * Delete all checkpoints for a ticket
	 */
	async deleteAllCheckpoints(ticketId: string): Promise<void> {
		await prisma.executionCheckpoint.deleteMany({
			where: { ticketId }
		});
		this.versionCounters.delete(ticketId);
	}

	/**
	 * Cleanup old checkpoints beyond the limit
	 */
	private async cleanupOldCheckpoints(ticketId: string): Promise<void> {
		// Get all checkpoints sorted by creation time
		const checkpoints = await prisma.executionCheckpoint.findMany({
			where: { ticketId },
			orderBy: { createdAt: 'desc' },
			select: { id: true, createdAt: true, type: true }
		});

		const now = Date.now();
		const toDelete: string[] = [];

		// Keep manual checkpoints and the most recent auto checkpoints
		let autoCount = 0;
		for (const cp of checkpoints) {
			const age = now - cp.createdAt.getTime();

			// Delete if beyond retention period
			if (age > this.config.retentionPeriod) {
				toDelete.push(cp.id);
				continue;
			}

			// Count auto checkpoints and mark excess for deletion
			if (cp.type === 'auto') {
				autoCount++;
				if (autoCount > this.config.maxCheckpointsPerTicket) {
					toDelete.push(cp.id);
				}
			}
		}

		if (toDelete.length > 0) {
			await prisma.executionCheckpoint.deleteMany({
				where: { id: { in: toDelete } }
			});
		}
	}

	/**
	 * Get next version number for a ticket
	 */
	private getNextVersion(ticketId: string): number {
		const current = this.versionCounters.get(ticketId) || 0;
		const next = current + 1;
		this.versionCounters.set(ticketId, next);
		return next;
	}

	/**
	 * Cleanup resources
	 */
	cleanup(): void {
		for (const timer of this.autoCheckpointTimers.values()) {
			clearInterval(timer);
		}
		this.autoCheckpointTimers.clear();
		this.versionCounters.clear();
	}
}

/**
 * Singleton instance
 */
export const checkpointManager = new CheckpointManager();
