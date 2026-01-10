/**
 * Progress Store - Real-time progress tracking for ticket execution
 *
 * TASK-060: Progress Streaming to UI
 *
 * Features:
 * - Real-time progress updates via WebSocket
 * - Stage-based tracking with completion percentages
 * - Log streaming for execution details
 * - Estimated time remaining calculation
 */

import { writable, derived, get } from 'svelte/store';
import type { Readable, Writable } from 'svelte/store';

/**
 * Progress stage status
 */
export type StageStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';

/**
 * Progress stage definition
 */
export interface ProgressStage {
	id: string;
	name: string;
	status: StageStatus;
	startedAt?: string;
	completedAt?: string;
	output?: string;
	error?: string;
	duration?: number;
}

/**
 * Log entry for progress
 */
export interface ProgressLogEntry {
	timestamp: string;
	level: 'info' | 'warn' | 'error' | 'debug';
	message: string;
	stage?: string;
	metadata?: Record<string, unknown>;
}

/**
 * Complete progress state for a ticket
 */
export interface TicketProgressState {
	ticketId: string;
	projectId: string;
	stages: ProgressStage[];
	currentStage: string;
	percentComplete: number;
	estimatedRemaining: number | null;
	logs: ProgressLogEntry[];
	startedAt: string;
	lastUpdatedAt: string;
	isActive: boolean;
	hasError: boolean;
}

/**
 * Map of ticket ID to progress state
 */
const progressMap = writable<Map<string, TicketProgressState>>(new Map());

/**
 * Currently selected ticket for detailed view
 */
export const selectedProgressTicketId = writable<string | null>(null);

/**
 * Get progress store for a specific ticket
 */
export function getTicketProgress(ticketId: string): Readable<TicketProgressState | undefined> {
	return derived(progressMap, ($map) => $map.get(ticketId));
}

/**
 * Get all active progress trackers
 */
export const activeProgress: Readable<TicketProgressState[]> = derived(progressMap, ($map) =>
	Array.from($map.values()).filter((p) => p.isActive)
);

/**
 * Initialize progress for a ticket
 */
export function initializeProgress(data: {
	ticketId: string;
	projectId: string;
	progress: {
		stages: ProgressStage[];
		currentStage: string;
		percentComplete: number;
		estimatedRemaining: number | null;
		logs: ProgressLogEntry[];
		startedAt: string;
		lastUpdatedAt: string;
	};
}): void {
	progressMap.update((map) => {
		const state: TicketProgressState = {
			ticketId: data.ticketId,
			projectId: data.projectId,
			stages: data.progress.stages,
			currentStage: data.progress.currentStage,
			percentComplete: data.progress.percentComplete,
			estimatedRemaining: data.progress.estimatedRemaining,
			logs: data.progress.logs,
			startedAt: data.progress.startedAt,
			lastUpdatedAt: data.progress.lastUpdatedAt,
			isActive: true,
			hasError: false
		};
		map.set(data.ticketId, state);
		return new Map(map);
	});
}

/**
 * Update stage status
 */
export function updateStage(data: {
	ticketId: string;
	stage: ProgressStage;
	percentComplete?: number;
	estimatedRemaining?: number | null;
}): void {
	progressMap.update((map) => {
		const progress = map.get(data.ticketId);
		if (!progress) return map;

		// Update the specific stage
		const stageIndex = progress.stages.findIndex((s) => s.id === data.stage.id);
		if (stageIndex !== -1) {
			progress.stages[stageIndex] = data.stage;
		}

		// Update current stage if this is in-progress
		if (data.stage.status === 'in-progress') {
			progress.currentStage = data.stage.name;
		}

		// Update percentages
		if (data.percentComplete !== undefined) {
			progress.percentComplete = data.percentComplete;
		}
		if (data.estimatedRemaining !== undefined) {
			progress.estimatedRemaining = data.estimatedRemaining;
		}

		// Check for errors
		if (data.stage.status === 'failed') {
			progress.hasError = true;
		}

		progress.lastUpdatedAt = new Date().toISOString();
		map.set(data.ticketId, { ...progress });
		return new Map(map);
	});
}

/**
 * Add a log entry
 */
export function addProgressLog(data: { ticketId: string; log: ProgressLogEntry }): void {
	progressMap.update((map) => {
		const progress = map.get(data.ticketId);
		if (!progress) return map;

		progress.logs = [...progress.logs, data.log].slice(-100);
		progress.lastUpdatedAt = new Date().toISOString();
		map.set(data.ticketId, { ...progress });
		return new Map(map);
	});
}

/**
 * Mark progress as completed
 */
export function completeProgress(data: { ticketId: string; totalDuration: number }): void {
	progressMap.update((map) => {
		const progress = map.get(data.ticketId);
		if (!progress) return map;

		progress.isActive = false;
		progress.percentComplete = 100;
		progress.estimatedRemaining = 0;
		progress.lastUpdatedAt = new Date().toISOString();
		map.set(data.ticketId, { ...progress });
		return new Map(map);
	});
}

/**
 * Mark progress as failed
 */
export function failProgress(data: { ticketId: string; failedStage: string; error: string }): void {
	progressMap.update((map) => {
		const progress = map.get(data.ticketId);
		if (!progress) return map;

		progress.isActive = false;
		progress.hasError = true;
		progress.lastUpdatedAt = new Date().toISOString();
		map.set(data.ticketId, { ...progress });
		return new Map(map);
	});
}

/**
 * Remove progress tracker for a ticket
 */
export function removeProgress(ticketId: string): void {
	progressMap.update((map) => {
		map.delete(ticketId);
		return new Map(map);
	});
}

/**
 * Check if ticket has active progress
 */
export function hasActiveProgress(ticketId: string): boolean {
	const map = get(progressMap);
	const progress = map.get(ticketId);
	return progress?.isActive || false;
}

/**
 * Setup WebSocket listeners for progress events
 */
export function setupProgressListeners(socket: {
	on: (event: string, callback: (data: unknown) => void) => void;
	off: (event: string, callback?: (data: unknown) => void) => void;
}): () => void {
	const handlers = {
		'progress:initialized': (data: unknown) => {
			const typed = data as {
				ticketId: string;
				projectId: string;
				progress: TicketProgressState;
			};
			initializeProgress(typed);
		},
		'progress:stage-started': (data: unknown) => {
			const typed = data as {
				ticketId: string;
				stage: ProgressStage;
				percentComplete: number;
			};
			updateStage(typed);
		},
		'progress:stage-completed': (data: unknown) => {
			const typed = data as {
				ticketId: string;
				stage: ProgressStage;
				percentComplete: number;
				estimatedRemaining: number | null;
			};
			updateStage(typed);
		},
		'progress:stage-failed': (data: unknown) => {
			const typed = data as {
				ticketId: string;
				stage: ProgressStage;
				error: string;
			};
			updateStage(typed);
		},
		'progress:log': (data: unknown) => {
			const typed = data as {
				ticketId: string;
				log: ProgressLogEntry;
			};
			addProgressLog(typed);
		},
		'progress:completed': (data: unknown) => {
			const typed = data as {
				ticketId: string;
				totalDuration: number;
			};
			completeProgress(typed);
		},
		'progress:failed': (data: unknown) => {
			const typed = data as {
				ticketId: string;
				failedStage: string;
				error: string;
			};
			failProgress(typed);
		}
	};

	// Register handlers
	for (const [event, handler] of Object.entries(handlers)) {
		socket.on(event, handler);
	}

	// Return cleanup function
	return () => {
		for (const [event, handler] of Object.entries(handlers)) {
			socket.off(event, handler);
		}
	};
}
