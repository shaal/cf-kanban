/**
 * Unit tests for Progress Tracker
 *
 * TASK-059: Progress Tracking Service Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ProgressTracker, DEFAULT_STAGES, type TicketProgress } from '$lib/server/progress/tracker';

// Mock Redis pub/sub
vi.mock('$lib/server/redis/pubsub', () => ({
	publishEvent: vi.fn().mockResolvedValue(1),
	TICKET_EVENTS: 'kanban:tickets'
}));

describe('ProgressTracker', () => {
	let tracker: ProgressTracker;

	beforeEach(() => {
		tracker = new ProgressTracker();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('initialize', () => {
		it('should initialize progress with default stages', () => {
			const progress = tracker.initialize('ticket-1', 'project-1');

			expect(progress.ticketId).toBe('ticket-1');
			expect(progress.projectId).toBe('project-1');
			expect(progress.stages).toHaveLength(DEFAULT_STAGES.length);
			expect(progress.percentComplete).toBe(0);
			expect(progress.currentStage).toBe('Analyzing');
			expect(progress.isActive).toBeUndefined(); // Internal state doesn't include isActive
		});

		it('should initialize progress with custom stages', () => {
			const customStages = ['Step 1', 'Step 2', 'Step 3'];
			const progress = tracker.initialize('ticket-2', 'project-1', customStages);

			expect(progress.stages).toHaveLength(3);
			expect(progress.stages.map((s) => s.name)).toEqual(customStages);
		});

		it('should set all stages to pending status', () => {
			const progress = tracker.initialize('ticket-3', 'project-1');

			expect(progress.stages.every((s) => s.status === 'pending')).toBe(true);
		});
	});

	describe('startStage', () => {
		it('should start a stage and update current stage', async () => {
			tracker.initialize('ticket-1', 'project-1');

			await tracker.startStage('ticket-1', 'Analyzing');

			const progress = tracker.getProgress('ticket-1');
			expect(progress?.currentStage).toBe('Analyzing');

			const stage = progress?.stages.find((s) => s.name === 'Analyzing');
			expect(stage?.status).toBe('in-progress');
			expect(stage?.startedAt).toBeInstanceOf(Date);
		});

		it('should throw error if ticket not initialized', async () => {
			await expect(tracker.startStage('unknown-ticket', 'Analyzing')).rejects.toThrow(
				'No progress tracker for ticket unknown-ticket'
			);
		});

		it('should throw error if stage not found', async () => {
			tracker.initialize('ticket-1', 'project-1');

			await expect(tracker.startStage('ticket-1', 'Unknown Stage')).rejects.toThrow(
				'Stage "Unknown Stage" not found'
			);
		});
	});

	describe('completeStage', () => {
		it('should complete a stage and calculate duration', async () => {
			tracker.initialize('ticket-1', 'project-1');

			await tracker.startStage('ticket-1', 'Analyzing');

			// Simulate time passing
			await new Promise((resolve) => setTimeout(resolve, 10));

			await tracker.completeStage('ticket-1', 'Analyzing', 'Analysis complete');

			const progress = tracker.getProgress('ticket-1');
			const stage = progress?.stages.find((s) => s.name === 'Analyzing');

			expect(stage?.status).toBe('completed');
			expect(stage?.completedAt).toBeInstanceOf(Date);
			expect(stage?.output).toBe('Analysis complete');
			expect(stage?.duration).toBeGreaterThan(0);
		});

		it('should update percent complete after stage completion', async () => {
			tracker.initialize('ticket-1', 'project-1');

			await tracker.startStage('ticket-1', 'Analyzing');
			await tracker.completeStage('ticket-1', 'Analyzing');

			const progress = tracker.getProgress('ticket-1');
			expect(progress?.percentComplete).toBeGreaterThan(0);
		});
	});

	describe('failStage', () => {
		it('should mark a stage as failed with error message', async () => {
			tracker.initialize('ticket-1', 'project-1');

			await tracker.startStage('ticket-1', 'Analyzing');
			await tracker.failStage('ticket-1', 'Analyzing', 'Analysis failed');

			const progress = tracker.getProgress('ticket-1');
			const stage = progress?.stages.find((s) => s.name === 'Analyzing');

			expect(stage?.status).toBe('failed');
			expect(stage?.error).toBe('Analysis failed');
		});
	});

	describe('skipStage', () => {
		it('should mark a stage as skipped', async () => {
			tracker.initialize('ticket-1', 'project-1');

			await tracker.skipStage('ticket-1', 'Testing', 'No tests required');

			const progress = tracker.getProgress('ticket-1');
			const stage = progress?.stages.find((s) => s.name === 'Testing');

			expect(stage?.status).toBe('skipped');
			expect(stage?.output).toBe('No tests required');
		});
	});

	describe('addLog', () => {
		it('should add log entries to progress', async () => {
			tracker.initialize('ticket-1', 'project-1');

			await tracker.addLog('ticket-1', 'Starting analysis', 'info');
			await tracker.addLog('ticket-1', 'Found issue', 'warn', { issue: 'minor' });

			const progress = tracker.getProgress('ticket-1');
			expect(progress?.logs).toHaveLength(2);
			expect(progress?.logs[0].message).toBe('Starting analysis');
			expect(progress?.logs[0].level).toBe('info');
			expect(progress?.logs[1].level).toBe('warn');
			expect(progress?.logs[1].metadata).toEqual({ issue: 'minor' });
		});

		it('should limit logs to maxLogs', async () => {
			tracker.initialize('ticket-1', 'project-1');

			// Add more than 100 logs
			for (let i = 0; i < 110; i++) {
				await tracker.addLog('ticket-1', `Log ${i}`, 'info');
			}

			const progress = tracker.getProgress('ticket-1');
			expect(progress?.logs).toHaveLength(100);
			// Should keep the most recent logs
			expect(progress?.logs[0].message).toBe('Log 10');
			expect(progress?.logs[99].message).toBe('Log 109');
		});
	});

	describe('getProgress', () => {
		it('should return undefined for unknown ticket', () => {
			expect(tracker.getProgress('unknown')).toBeUndefined();
		});

		it('should return progress for initialized ticket', () => {
			tracker.initialize('ticket-1', 'project-1');
			const progress = tracker.getProgress('ticket-1');

			expect(progress).toBeDefined();
			expect(progress?.ticketId).toBe('ticket-1');
		});
	});

	describe('getSanitizedProgress', () => {
		it('should return JSON-serializable progress', () => {
			tracker.initialize('ticket-1', 'project-1');
			const sanitized = tracker.getSanitizedProgress('ticket-1');

			expect(sanitized).toBeDefined();
			expect(typeof sanitized?.startedAt).toBe('string');
			expect(typeof sanitized?.lastUpdatedAt).toBe('string');

			// Should be JSON serializable
			expect(() => JSON.stringify(sanitized)).not.toThrow();
		});
	});

	describe('cleanup', () => {
		it('should remove progress tracker for a ticket', () => {
			tracker.initialize('ticket-1', 'project-1');
			expect(tracker.getProgress('ticket-1')).toBeDefined();

			tracker.cleanup('ticket-1');
			expect(tracker.getProgress('ticket-1')).toBeUndefined();
		});
	});

	describe('getAllActive', () => {
		it('should return all active progress trackers', () => {
			tracker.initialize('ticket-1', 'project-1');
			tracker.initialize('ticket-2', 'project-1');
			tracker.initialize('ticket-3', 'project-2');

			const active = tracker.getAllActive();
			expect(active).toHaveLength(3);
		});
	});

	describe('percentage calculation', () => {
		it('should calculate weighted percentage correctly', async () => {
			tracker.initialize('ticket-1', 'project-1');

			// Complete first stage (Analyzing = 10% weight)
			await tracker.startStage('ticket-1', 'Analyzing');
			await tracker.completeStage('ticket-1', 'Analyzing');

			const progress1 = tracker.getProgress('ticket-1');
			expect(progress1?.percentComplete).toBe(10);

			// Complete second stage (Assigning Agents = 5% weight)
			await tracker.startStage('ticket-1', 'Assigning Agents');
			await tracker.completeStage('ticket-1', 'Assigning Agents');

			const progress2 = tracker.getProgress('ticket-1');
			expect(progress2?.percentComplete).toBe(15);
		});

		it('should give partial credit for in-progress stages', async () => {
			tracker.initialize('ticket-1', 'project-1');

			await tracker.startStage('ticket-1', 'Executing');

			const progress = tracker.getProgress('ticket-1');
			// Executing is 40% weight, half credit = 20%
			expect(progress?.percentComplete).toBe(20);
		});
	});

	describe('estimated remaining time', () => {
		it('should calculate estimated remaining time based on completed stages', async () => {
			tracker.initialize('ticket-1', 'project-1');

			// Complete first stage with simulated duration
			await tracker.startStage('ticket-1', 'Analyzing');
			await new Promise((resolve) => setTimeout(resolve, 50));
			await tracker.completeStage('ticket-1', 'Analyzing');

			const progress = tracker.getProgress('ticket-1');
			expect(progress?.estimatedRemaining).toBeDefined();
			expect(typeof progress?.estimatedRemaining).toBe('number');
		});

		it('should return null when no stages completed', () => {
			const progress = tracker.initialize('ticket-1', 'project-1');
			expect(progress.estimatedRemaining).toBeNull();
		});
	});
});
