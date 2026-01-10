/**
 * Unit tests for Progress Store
 *
 * TASK-060: Progress Streaming UI Store Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
import {
	getTicketProgress,
	activeProgress,
	selectedProgressTicketId,
	initializeProgress,
	updateStage,
	addProgressLog,
	completeProgress,
	failProgress,
	removeProgress,
	hasActiveProgress,
	setupProgressListeners,
	type ProgressStage,
	type ProgressLogEntry
} from '$lib/stores/progress';

describe('Progress Store', () => {
	beforeEach(() => {
		// Clean up any existing progress data
		removeProgress('ticket-1');
		removeProgress('ticket-2');
		selectedProgressTicketId.set(null);
	});

	describe('initializeProgress', () => {
		it('should initialize progress for a ticket', () => {
			const progressData = {
				ticketId: 'ticket-1',
				projectId: 'project-1',
				progress: {
					stages: [
						{ id: 's1', name: 'Analyzing', status: 'pending' as const },
						{ id: 's2', name: 'Executing', status: 'pending' as const }
					],
					currentStage: 'Analyzing',
					percentComplete: 0,
					estimatedRemaining: 10,
					logs: [],
					startedAt: new Date().toISOString(),
					lastUpdatedAt: new Date().toISOString()
				}
			};

			initializeProgress(progressData);

			const store = getTicketProgress('ticket-1');
			const progress = get(store);

			expect(progress).toBeDefined();
			expect(progress?.ticketId).toBe('ticket-1');
			expect(progress?.projectId).toBe('project-1');
			expect(progress?.isActive).toBe(true);
			expect(progress?.hasError).toBe(false);
		});
	});

	describe('getTicketProgress', () => {
		it('should return undefined for non-existent ticket', () => {
			const store = getTicketProgress('unknown-ticket');
			const progress = get(store);

			expect(progress).toBeUndefined();
		});

		it('should return progress store for initialized ticket', () => {
			initializeProgress({
				ticketId: 'ticket-1',
				projectId: 'project-1',
				progress: {
					stages: [],
					currentStage: '',
					percentComplete: 0,
					estimatedRemaining: null,
					logs: [],
					startedAt: new Date().toISOString(),
					lastUpdatedAt: new Date().toISOString()
				}
			});

			const store = getTicketProgress('ticket-1');
			const progress = get(store);

			expect(progress).toBeDefined();
		});
	});

	describe('activeProgress', () => {
		it('should return only active progress trackers', () => {
			initializeProgress({
				ticketId: 'ticket-1',
				projectId: 'project-1',
				progress: {
					stages: [],
					currentStage: '',
					percentComplete: 0,
					estimatedRemaining: null,
					logs: [],
					startedAt: new Date().toISOString(),
					lastUpdatedAt: new Date().toISOString()
				}
			});

			initializeProgress({
				ticketId: 'ticket-2',
				projectId: 'project-1',
				progress: {
					stages: [],
					currentStage: '',
					percentComplete: 100,
					estimatedRemaining: 0,
					logs: [],
					startedAt: new Date().toISOString(),
					lastUpdatedAt: new Date().toISOString()
				}
			});

			// Complete ticket-2
			completeProgress({ ticketId: 'ticket-2', totalDuration: 5000 });

			const active = get(activeProgress);

			expect(active).toHaveLength(1);
			expect(active[0].ticketId).toBe('ticket-1');
		});
	});

	describe('updateStage', () => {
		it('should update stage status and current stage', () => {
			initializeProgress({
				ticketId: 'ticket-1',
				projectId: 'project-1',
				progress: {
					stages: [
						{ id: 's1', name: 'Analyzing', status: 'pending' as const },
						{ id: 's2', name: 'Executing', status: 'pending' as const }
					],
					currentStage: 'Analyzing',
					percentComplete: 0,
					estimatedRemaining: 10,
					logs: [],
					startedAt: new Date().toISOString(),
					lastUpdatedAt: new Date().toISOString()
				}
			});

			const updatedStage: ProgressStage = {
				id: 's1',
				name: 'Analyzing',
				status: 'in-progress',
				startedAt: new Date().toISOString()
			};

			updateStage({
				ticketId: 'ticket-1',
				stage: updatedStage,
				percentComplete: 10
			});

			const store = getTicketProgress('ticket-1');
			const progress = get(store);

			expect(progress?.currentStage).toBe('Analyzing');
			expect(progress?.percentComplete).toBe(10);
			expect(progress?.stages[0].status).toBe('in-progress');
		});

		it('should set hasError on failed stage', () => {
			initializeProgress({
				ticketId: 'ticket-1',
				projectId: 'project-1',
				progress: {
					stages: [{ id: 's1', name: 'Analyzing', status: 'pending' as const }],
					currentStage: 'Analyzing',
					percentComplete: 0,
					estimatedRemaining: null,
					logs: [],
					startedAt: new Date().toISOString(),
					lastUpdatedAt: new Date().toISOString()
				}
			});

			const failedStage: ProgressStage = {
				id: 's1',
				name: 'Analyzing',
				status: 'failed',
				error: 'Something went wrong'
			};

			updateStage({
				ticketId: 'ticket-1',
				stage: failedStage
			});

			const store = getTicketProgress('ticket-1');
			const progress = get(store);

			expect(progress?.hasError).toBe(true);
		});
	});

	describe('addProgressLog', () => {
		it('should add log entry to progress', () => {
			initializeProgress({
				ticketId: 'ticket-1',
				projectId: 'project-1',
				progress: {
					stages: [],
					currentStage: '',
					percentComplete: 0,
					estimatedRemaining: null,
					logs: [],
					startedAt: new Date().toISOString(),
					lastUpdatedAt: new Date().toISOString()
				}
			});

			const log: ProgressLogEntry = {
				timestamp: new Date().toISOString(),
				level: 'info',
				message: 'Test log'
			};

			addProgressLog({
				ticketId: 'ticket-1',
				log
			});

			const store = getTicketProgress('ticket-1');
			const progress = get(store);

			expect(progress?.logs).toHaveLength(1);
			expect(progress?.logs[0].message).toBe('Test log');
		});

		it('should limit logs to 100 entries', () => {
			initializeProgress({
				ticketId: 'ticket-1',
				projectId: 'project-1',
				progress: {
					stages: [],
					currentStage: '',
					percentComplete: 0,
					estimatedRemaining: null,
					logs: [],
					startedAt: new Date().toISOString(),
					lastUpdatedAt: new Date().toISOString()
				}
			});

			// Add 110 logs
			for (let i = 0; i < 110; i++) {
				addProgressLog({
					ticketId: 'ticket-1',
					log: {
						timestamp: new Date().toISOString(),
						level: 'info',
						message: `Log ${i}`
					}
				});
			}

			const store = getTicketProgress('ticket-1');
			const progress = get(store);

			expect(progress?.logs).toHaveLength(100);
			expect(progress?.logs[0].message).toBe('Log 10');
			expect(progress?.logs[99].message).toBe('Log 109');
		});
	});

	describe('completeProgress', () => {
		it('should mark progress as completed', () => {
			initializeProgress({
				ticketId: 'ticket-1',
				projectId: 'project-1',
				progress: {
					stages: [],
					currentStage: '',
					percentComplete: 80,
					estimatedRemaining: 5,
					logs: [],
					startedAt: new Date().toISOString(),
					lastUpdatedAt: new Date().toISOString()
				}
			});

			completeProgress({
				ticketId: 'ticket-1',
				totalDuration: 30000
			});

			const store = getTicketProgress('ticket-1');
			const progress = get(store);

			expect(progress?.isActive).toBe(false);
			expect(progress?.percentComplete).toBe(100);
			expect(progress?.estimatedRemaining).toBe(0);
		});
	});

	describe('failProgress', () => {
		it('should mark progress as failed', () => {
			initializeProgress({
				ticketId: 'ticket-1',
				projectId: 'project-1',
				progress: {
					stages: [],
					currentStage: 'Executing',
					percentComplete: 50,
					estimatedRemaining: 10,
					logs: [],
					startedAt: new Date().toISOString(),
					lastUpdatedAt: new Date().toISOString()
				}
			});

			failProgress({
				ticketId: 'ticket-1',
				failedStage: 'Executing',
				error: 'Execution failed'
			});

			const store = getTicketProgress('ticket-1');
			const progress = get(store);

			expect(progress?.isActive).toBe(false);
			expect(progress?.hasError).toBe(true);
		});
	});

	describe('removeProgress', () => {
		it('should remove progress for a ticket', () => {
			initializeProgress({
				ticketId: 'ticket-1',
				projectId: 'project-1',
				progress: {
					stages: [],
					currentStage: '',
					percentComplete: 0,
					estimatedRemaining: null,
					logs: [],
					startedAt: new Date().toISOString(),
					lastUpdatedAt: new Date().toISOString()
				}
			});

			expect(hasActiveProgress('ticket-1')).toBe(true);

			removeProgress('ticket-1');

			expect(hasActiveProgress('ticket-1')).toBe(false);
		});
	});

	describe('hasActiveProgress', () => {
		it('should return true for active progress', () => {
			initializeProgress({
				ticketId: 'ticket-1',
				projectId: 'project-1',
				progress: {
					stages: [],
					currentStage: '',
					percentComplete: 0,
					estimatedRemaining: null,
					logs: [],
					startedAt: new Date().toISOString(),
					lastUpdatedAt: new Date().toISOString()
				}
			});

			expect(hasActiveProgress('ticket-1')).toBe(true);
		});

		it('should return false for completed progress', () => {
			initializeProgress({
				ticketId: 'ticket-1',
				projectId: 'project-1',
				progress: {
					stages: [],
					currentStage: '',
					percentComplete: 100,
					estimatedRemaining: 0,
					logs: [],
					startedAt: new Date().toISOString(),
					lastUpdatedAt: new Date().toISOString()
				}
			});

			completeProgress({ ticketId: 'ticket-1', totalDuration: 5000 });

			expect(hasActiveProgress('ticket-1')).toBe(false);
		});

		it('should return false for non-existent ticket', () => {
			expect(hasActiveProgress('unknown-ticket')).toBe(false);
		});
	});

	describe('setupProgressListeners', () => {
		it('should register event handlers', () => {
			const mockSocket = {
				on: vi.fn(),
				off: vi.fn()
			};

			const cleanup = setupProgressListeners(mockSocket);

			// Should have registered handlers for all progress events
			expect(mockSocket.on).toHaveBeenCalledTimes(7);
			expect(mockSocket.on).toHaveBeenCalledWith('progress:initialized', expect.any(Function));
			expect(mockSocket.on).toHaveBeenCalledWith('progress:stage-started', expect.any(Function));
			expect(mockSocket.on).toHaveBeenCalledWith('progress:stage-completed', expect.any(Function));
			expect(mockSocket.on).toHaveBeenCalledWith('progress:stage-failed', expect.any(Function));
			expect(mockSocket.on).toHaveBeenCalledWith('progress:log', expect.any(Function));
			expect(mockSocket.on).toHaveBeenCalledWith('progress:completed', expect.any(Function));
			expect(mockSocket.on).toHaveBeenCalledWith('progress:failed', expect.any(Function));

			// Cleanup should remove handlers
			cleanup();
			expect(mockSocket.off).toHaveBeenCalledTimes(7);
		});
	});

	describe('selectedProgressTicketId', () => {
		it('should track selected ticket for detailed view', () => {
			selectedProgressTicketId.set('ticket-1');
			expect(get(selectedProgressTicketId)).toBe('ticket-1');

			selectedProgressTicketId.set(null);
			expect(get(selectedProgressTicketId)).toBeNull();
		});
	});
});
