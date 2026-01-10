/**
 * TASK-059: Progress Tracking Service
 *
 * Tracks execution progress for tickets being processed by Claude Flow agents.
 * Provides stage-based tracking, percentage completion, and real-time event emission.
 */

import { publishEvent, TICKET_EVENTS } from '../redis/pubsub';

/**
 * Progress stage status
 */
export type StageStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';

/**
 * Individual progress stage
 */
export interface ProgressStage {
	id: string;
	name: string;
	status: StageStatus;
	startedAt?: Date;
	completedAt?: Date;
	output?: string;
	error?: string;
	duration?: number; // milliseconds
}

/**
 * Complete progress state for a ticket
 */
export interface TicketProgress {
	ticketId: string;
	projectId: string;
	stages: ProgressStage[];
	currentStage: string;
	percentComplete: number;
	estimatedRemaining: number | null; // minutes
	logs: ProgressLogEntry[];
	startedAt: Date;
	lastUpdatedAt: Date;
}

/**
 * Log entry for progress tracking
 */
export interface ProgressLogEntry {
	timestamp: Date;
	level: 'info' | 'warn' | 'error' | 'debug';
	message: string;
	stage?: string;
	metadata?: Record<string, unknown>;
}

/**
 * Default execution stages for ticket processing
 */
export const DEFAULT_STAGES: Array<{ name: string; weight: number }> = [
	{ name: 'Analyzing', weight: 10 },
	{ name: 'Assigning Agents', weight: 5 },
	{ name: 'Initializing Swarm', weight: 10 },
	{ name: 'Executing', weight: 40 },
	{ name: 'Testing', weight: 20 },
	{ name: 'Reviewing', weight: 10 },
	{ name: 'Completing', weight: 5 }
];

/**
 * Progress event types for WebSocket emission
 */
export type ProgressEventType =
	| 'progress:initialized'
	| 'progress:stage-started'
	| 'progress:stage-completed'
	| 'progress:stage-failed'
	| 'progress:log'
	| 'progress:updated'
	| 'progress:completed'
	| 'progress:failed';

/**
 * Progress Tracker Class
 *
 * Manages progress state for multiple tickets and emits real-time updates.
 */
export class ProgressTracker {
	private progress = new Map<string, TicketProgress>();
	private stageWeights = new Map<string, number>();
	private maxLogs = 100;

	constructor() {
		// Initialize stage weights
		for (const stage of DEFAULT_STAGES) {
			this.stageWeights.set(stage.name, stage.weight);
		}
	}

	/**
	 * Initialize progress tracking for a ticket
	 */
	initialize(ticketId: string, projectId: string, customStages?: string[]): TicketProgress {
		const stageNames = customStages || DEFAULT_STAGES.map((s) => s.name);

		const stages: ProgressStage[] = stageNames.map((name, index) => ({
			id: `${ticketId}-stage-${index}`,
			name,
			status: 'pending'
		}));

		const now = new Date();
		const progress: TicketProgress = {
			ticketId,
			projectId,
			stages,
			currentStage: stages[0]?.name || '',
			percentComplete: 0,
			estimatedRemaining: null,
			logs: [],
			startedAt: now,
			lastUpdatedAt: now
		};

		this.progress.set(ticketId, progress);

		// Emit initialization event
		this.emitProgressEvent('progress:initialized', {
			ticketId,
			projectId,
			progress: this.sanitizeProgress(progress)
		});

		return progress;
	}

	/**
	 * Start a stage
	 */
	async startStage(ticketId: string, stageName: string): Promise<void> {
		const progress = this.progress.get(ticketId);
		if (!progress) {
			throw new Error(`No progress tracker for ticket ${ticketId}`);
		}

		const stage = progress.stages.find((s) => s.name === stageName);
		if (!stage) {
			throw new Error(`Stage "${stageName}" not found`);
		}

		stage.status = 'in-progress';
		stage.startedAt = new Date();
		progress.currentStage = stageName;
		progress.lastUpdatedAt = new Date();

		this.updatePercentComplete(progress);

		await this.emitProgressEvent('progress:stage-started', {
			ticketId,
			projectId: progress.projectId,
			stage: this.sanitizeStage(stage),
			percentComplete: progress.percentComplete
		});
	}

	/**
	 * Complete a stage
	 */
	async completeStage(ticketId: string, stageName: string, output?: string): Promise<void> {
		const progress = this.progress.get(ticketId);
		if (!progress) {
			throw new Error(`No progress tracker for ticket ${ticketId}`);
		}

		const stage = progress.stages.find((s) => s.name === stageName);
		if (!stage) {
			throw new Error(`Stage "${stageName}" not found`);
		}

		stage.status = 'completed';
		stage.completedAt = new Date();
		stage.output = output;

		if (stage.startedAt) {
			stage.duration = stage.completedAt.getTime() - stage.startedAt.getTime();
		}

		progress.lastUpdatedAt = new Date();
		this.updatePercentComplete(progress);
		this.updateEstimatedRemaining(progress);

		await this.emitProgressEvent('progress:stage-completed', {
			ticketId,
			projectId: progress.projectId,
			stage: this.sanitizeStage(stage),
			percentComplete: progress.percentComplete,
			estimatedRemaining: progress.estimatedRemaining
		});

		// Check if all stages are complete
		if (progress.stages.every((s) => s.status === 'completed' || s.status === 'skipped')) {
			await this.emitProgressEvent('progress:completed', {
				ticketId,
				projectId: progress.projectId,
				totalDuration: new Date().getTime() - progress.startedAt.getTime()
			});
		}
	}

	/**
	 * Mark a stage as failed
	 */
	async failStage(ticketId: string, stageName: string, error: string): Promise<void> {
		const progress = this.progress.get(ticketId);
		if (!progress) {
			throw new Error(`No progress tracker for ticket ${ticketId}`);
		}

		const stage = progress.stages.find((s) => s.name === stageName);
		if (!stage) {
			throw new Error(`Stage "${stageName}" not found`);
		}

		stage.status = 'failed';
		stage.completedAt = new Date();
		stage.error = error;

		if (stage.startedAt) {
			stage.duration = stage.completedAt.getTime() - stage.startedAt.getTime();
		}

		progress.lastUpdatedAt = new Date();

		await this.emitProgressEvent('progress:stage-failed', {
			ticketId,
			projectId: progress.projectId,
			stage: this.sanitizeStage(stage),
			error
		});

		await this.emitProgressEvent('progress:failed', {
			ticketId,
			projectId: progress.projectId,
			failedStage: stageName,
			error
		});
	}

	/**
	 * Skip a stage
	 */
	async skipStage(ticketId: string, stageName: string, reason?: string): Promise<void> {
		const progress = this.progress.get(ticketId);
		if (!progress) {
			throw new Error(`No progress tracker for ticket ${ticketId}`);
		}

		const stage = progress.stages.find((s) => s.name === stageName);
		if (!stage) {
			throw new Error(`Stage "${stageName}" not found`);
		}

		stage.status = 'skipped';
		stage.output = reason || 'Skipped';
		progress.lastUpdatedAt = new Date();

		this.updatePercentComplete(progress);
	}

	/**
	 * Add a log entry
	 */
	async addLog(
		ticketId: string,
		message: string,
		level: ProgressLogEntry['level'] = 'info',
		metadata?: Record<string, unknown>
	): Promise<void> {
		const progress = this.progress.get(ticketId);
		if (!progress) return;

		const entry: ProgressLogEntry = {
			timestamp: new Date(),
			level,
			message,
			stage: progress.currentStage,
			metadata
		};

		progress.logs.push(entry);

		// Keep logs within limit
		if (progress.logs.length > this.maxLogs) {
			progress.logs = progress.logs.slice(-this.maxLogs);
		}

		progress.lastUpdatedAt = new Date();

		await this.emitProgressEvent('progress:log', {
			ticketId,
			projectId: progress.projectId,
			log: {
				...entry,
				timestamp: entry.timestamp.toISOString()
			}
		});
	}

	/**
	 * Get progress for a ticket
	 */
	getProgress(ticketId: string): TicketProgress | undefined {
		return this.progress.get(ticketId);
	}

	/**
	 * Get sanitized progress for external consumption
	 */
	getSanitizedProgress(ticketId: string): Record<string, unknown> | undefined {
		const progress = this.progress.get(ticketId);
		if (!progress) return undefined;
		return this.sanitizeProgress(progress);
	}

	/**
	 * Cleanup progress tracker for a ticket
	 */
	cleanup(ticketId: string): void {
		this.progress.delete(ticketId);
	}

	/**
	 * Get all active progress trackers
	 */
	getAllActive(): TicketProgress[] {
		return Array.from(this.progress.values());
	}

	/**
	 * Update percentage complete based on stage weights
	 */
	private updatePercentComplete(progress: TicketProgress): void {
		let totalWeight = 0;
		let completedWeight = 0;
		let inProgressWeight = 0;

		for (const stage of progress.stages) {
			const weight = this.stageWeights.get(stage.name) || 10;
			totalWeight += weight;

			if (stage.status === 'completed' || stage.status === 'skipped') {
				completedWeight += weight;
			} else if (stage.status === 'in-progress') {
				// Give partial credit for in-progress stages
				inProgressWeight += weight * 0.5;
			}
		}

		if (totalWeight > 0) {
			progress.percentComplete = Math.round(
				((completedWeight + inProgressWeight) / totalWeight) * 100
			);
		}
	}

	/**
	 * Estimate remaining time based on completed stage durations
	 */
	private updateEstimatedRemaining(progress: TicketProgress): void {
		const completedStages = progress.stages.filter(
			(s) => s.status === 'completed' && s.duration !== undefined
		);

		if (completedStages.length === 0) {
			progress.estimatedRemaining = null;
			return;
		}

		// Calculate weighted average duration per weight unit
		let totalDuration = 0;
		let totalWeight = 0;

		for (const stage of completedStages) {
			const weight = this.stageWeights.get(stage.name) || 10;
			totalDuration += stage.duration!;
			totalWeight += weight;
		}

		if (totalWeight === 0) {
			progress.estimatedRemaining = null;
			return;
		}

		const durationPerWeight = totalDuration / totalWeight;

		// Calculate remaining weight
		let remainingWeight = 0;
		for (const stage of progress.stages) {
			if (stage.status === 'pending' || stage.status === 'in-progress') {
				const weight = this.stageWeights.get(stage.name) || 10;
				remainingWeight += stage.status === 'in-progress' ? weight * 0.5 : weight;
			}
		}

		// Estimate remaining time in minutes
		const estimatedMs = durationPerWeight * remainingWeight;
		progress.estimatedRemaining = Math.round(estimatedMs / 60000);
	}

	/**
	 * Emit progress event via Redis pub/sub
	 */
	private async emitProgressEvent(
		type: ProgressEventType,
		data: Record<string, unknown>
	): Promise<void> {
		try {
			await publishEvent(TICKET_EVENTS, {
				type,
				...data
			});
		} catch (error) {
			console.error(`Failed to emit progress event ${type}:`, error);
		}
	}

	/**
	 * Sanitize progress for JSON serialization
	 */
	private sanitizeProgress(progress: TicketProgress): Record<string, unknown> {
		return {
			ticketId: progress.ticketId,
			projectId: progress.projectId,
			stages: progress.stages.map((s) => this.sanitizeStage(s)),
			currentStage: progress.currentStage,
			percentComplete: progress.percentComplete,
			estimatedRemaining: progress.estimatedRemaining,
			logs: progress.logs.slice(-20).map((l) => ({
				...l,
				timestamp: l.timestamp.toISOString()
			})),
			startedAt: progress.startedAt.toISOString(),
			lastUpdatedAt: progress.lastUpdatedAt.toISOString()
		};
	}

	/**
	 * Sanitize stage for JSON serialization
	 */
	private sanitizeStage(stage: ProgressStage): Record<string, unknown> {
		return {
			id: stage.id,
			name: stage.name,
			status: stage.status,
			startedAt: stage.startedAt?.toISOString(),
			completedAt: stage.completedAt?.toISOString(),
			output: stage.output,
			error: stage.error,
			duration: stage.duration
		};
	}
}

/**
 * Singleton instance
 */
export const progressTracker = new ProgressTracker();
