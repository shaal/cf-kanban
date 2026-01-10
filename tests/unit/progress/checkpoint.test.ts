/**
 * Unit tests for Checkpoint Manager
 *
 * TASK-062: Checkpoint and Restore System Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { TicketProgress, ProgressStage } from '$lib/server/progress/tracker';

// Mock Prisma client - must use factory function that returns the mock
vi.mock('$lib/server/prisma', () => {
	return {
		prisma: {
			executionCheckpoint: {
				create: vi.fn(),
				findFirst: vi.fn(),
				findUnique: vi.fn(),
				findMany: vi.fn(),
				delete: vi.fn(),
				deleteMany: vi.fn()
			}
		}
	};
});

// Import after mocking
import { CheckpointManager, type CheckpointData, type Checkpoint } from '$lib/server/progress/checkpoint';
import { prisma } from '$lib/server/prisma';

// Type assertion for mocked functions
const mockPrisma = prisma as {
	executionCheckpoint: {
		create: ReturnType<typeof vi.fn>;
		findFirst: ReturnType<typeof vi.fn>;
		findUnique: ReturnType<typeof vi.fn>;
		findMany: ReturnType<typeof vi.fn>;
		delete: ReturnType<typeof vi.fn>;
		deleteMany: ReturnType<typeof vi.fn>;
	};
};

describe('CheckpointManager', () => {
	let manager: CheckpointManager;
	let mockProgress: TicketProgress;

	beforeEach(() => {
		manager = new CheckpointManager({
			autoCheckpointInterval: 1000,
			maxCheckpointsPerTicket: 5,
			retentionPeriod: 86400000 // 1 day
		});

		// Reset mocks
		vi.clearAllMocks();

		// Create mock progress
		const now = new Date();
		mockProgress = {
			ticketId: 'ticket-1',
			projectId: 'project-1',
			stages: [
				{
					id: 'stage-1',
					name: 'Analyzing',
					status: 'completed',
					startedAt: new Date(now.getTime() - 10000),
					completedAt: new Date(now.getTime() - 5000),
					duration: 5000
				},
				{
					id: 'stage-2',
					name: 'Executing',
					status: 'in-progress',
					startedAt: new Date(now.getTime() - 5000)
				},
				{
					id: 'stage-3',
					name: 'Testing',
					status: 'pending'
				}
			],
			currentStage: 'Executing',
			percentComplete: 30,
			estimatedRemaining: 5,
			logs: [
				{
					timestamp: new Date(),
					level: 'info',
					message: 'Analysis complete',
					stage: 'Analyzing'
				}
			],
			startedAt: new Date(now.getTime() - 10000),
			lastUpdatedAt: now
		};
	});

	afterEach(() => {
		manager.cleanup();
		vi.restoreAllMocks();
	});

	describe('createCheckpoint', () => {
		it('should create a checkpoint with correct data', async () => {
			const mockCheckpoint = {
				id: 'checkpoint-1',
				ticketId: 'ticket-1',
				type: 'auto',
				version: 1,
				data: {},
				createdAt: new Date()
			};

			mockPrisma.executionCheckpoint.create.mockResolvedValue(mockCheckpoint);
			mockPrisma.executionCheckpoint.findMany.mockResolvedValue([]);

			const checkpoint = await manager.createCheckpoint(mockProgress, 'auto');

			expect(checkpoint.ticketId).toBe('ticket-1');
			expect(checkpoint.type).toBe('auto');
			expect(checkpoint.version).toBe(1);
			expect(mockPrisma.executionCheckpoint.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					ticketId: 'ticket-1',
					type: 'auto',
					version: 1,
					data: expect.any(Object)
				})
			});
		});

		it('should include context in checkpoint data', async () => {
			const mockCheckpoint = {
				id: 'checkpoint-1',
				ticketId: 'ticket-1',
				type: 'stage',
				version: 1,
				data: {},
				createdAt: new Date()
			};

			mockPrisma.executionCheckpoint.create.mockResolvedValue(mockCheckpoint);
			mockPrisma.executionCheckpoint.findMany.mockResolvedValue([]);

			const context = { completedStage: 'Analyzing' };
			await manager.createCheckpoint(mockProgress, 'stage', context);

			expect(mockPrisma.executionCheckpoint.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					data: expect.objectContaining({
						context
					})
				})
			});
		});

		it('should increment version for each checkpoint', async () => {
			mockPrisma.executionCheckpoint.create.mockImplementation(async ({ data }) => ({
				id: `checkpoint-${data.version}`,
				...data,
				createdAt: new Date()
			}));
			mockPrisma.executionCheckpoint.findMany.mockResolvedValue([]);

			const checkpoint1 = await manager.createCheckpoint(mockProgress, 'auto');
			const checkpoint2 = await manager.createCheckpoint(mockProgress, 'auto');
			const checkpoint3 = await manager.createCheckpoint(mockProgress, 'auto');

			expect(checkpoint1.version).toBe(1);
			expect(checkpoint2.version).toBe(2);
			expect(checkpoint3.version).toBe(3);
		});
	});

	describe('getLatestCheckpoint', () => {
		it('should return the latest checkpoint for a ticket', async () => {
			const mockCheckpoint = {
				id: 'checkpoint-2',
				ticketId: 'ticket-1',
				type: 'auto',
				version: 2,
				data: {
					ticketId: 'ticket-1',
					projectId: 'project-1',
					stages: [],
					currentStage: 'Executing',
					percentComplete: 50,
					logs: [],
					startedAt: new Date().toISOString(),
					context: {}
				},
				createdAt: new Date()
			};

			mockPrisma.executionCheckpoint.findFirst.mockResolvedValue(mockCheckpoint);

			const checkpoint = await manager.getLatestCheckpoint('ticket-1');

			expect(checkpoint).toBeDefined();
			expect(checkpoint?.id).toBe('checkpoint-2');
			expect(checkpoint?.version).toBe(2);
			expect(mockPrisma.executionCheckpoint.findFirst).toHaveBeenCalledWith({
				where: { ticketId: 'ticket-1' },
				orderBy: { createdAt: 'desc' }
			});
		});

		it('should return null if no checkpoint exists', async () => {
			mockPrisma.executionCheckpoint.findFirst.mockResolvedValue(null);

			const checkpoint = await manager.getLatestCheckpoint('unknown-ticket');

			expect(checkpoint).toBeNull();
		});
	});

	describe('getCheckpoint', () => {
		it('should return a specific checkpoint by ID', async () => {
			const mockCheckpoint = {
				id: 'checkpoint-1',
				ticketId: 'ticket-1',
				type: 'manual',
				version: 1,
				data: {
					ticketId: 'ticket-1',
					projectId: 'project-1',
					stages: [],
					currentStage: 'Testing',
					percentComplete: 75,
					logs: [],
					startedAt: new Date().toISOString(),
					context: {}
				},
				createdAt: new Date()
			};

			mockPrisma.executionCheckpoint.findUnique.mockResolvedValue(mockCheckpoint);

			const checkpoint = await manager.getCheckpoint('checkpoint-1');

			expect(checkpoint).toBeDefined();
			expect(checkpoint?.id).toBe('checkpoint-1');
			expect(checkpoint?.type).toBe('manual');
		});

		it('should return null if checkpoint not found', async () => {
			mockPrisma.executionCheckpoint.findUnique.mockResolvedValue(null);

			const checkpoint = await manager.getCheckpoint('unknown-checkpoint');

			expect(checkpoint).toBeNull();
		});
	});

	describe('listCheckpoints', () => {
		it('should return all checkpoints for a ticket', async () => {
			const mockCheckpoints = [
				{
					id: 'checkpoint-2',
					ticketId: 'ticket-1',
					type: 'auto',
					version: 2,
					data: { ticketId: 'ticket-1', projectId: 'project-1', stages: [], currentStage: '', percentComplete: 0, logs: [], startedAt: '', context: {} },
					createdAt: new Date()
				},
				{
					id: 'checkpoint-1',
					ticketId: 'ticket-1',
					type: 'auto',
					version: 1,
					data: { ticketId: 'ticket-1', projectId: 'project-1', stages: [], currentStage: '', percentComplete: 0, logs: [], startedAt: '', context: {} },
					createdAt: new Date(Date.now() - 10000)
				}
			];

			mockPrisma.executionCheckpoint.findMany.mockResolvedValue(mockCheckpoints);

			const checkpoints = await manager.listCheckpoints('ticket-1');

			expect(checkpoints).toHaveLength(2);
			expect(checkpoints[0].version).toBe(2);
			expect(checkpoints[1].version).toBe(1);
		});
	});

	describe('restoreFromCheckpoint', () => {
		it('should restore progress from checkpoint data', async () => {
			const checkpointData: CheckpointData = {
				ticketId: 'ticket-1',
				projectId: 'project-1',
				stages: [
					{
						id: 'stage-1',
						name: 'Analyzing',
						status: 'completed',
						startedAt: new Date().toISOString() as unknown as Date,
						completedAt: new Date().toISOString() as unknown as Date,
						duration: 5000
					},
					{
						id: 'stage-2',
						name: 'Executing',
						status: 'in-progress',
						startedAt: new Date().toISOString() as unknown as Date
					}
				],
				currentStage: 'Executing',
				percentComplete: 40,
				logs: [
					{
						timestamp: new Date().toISOString(),
						level: 'info',
						message: 'Progress restored'
					}
				],
				startedAt: new Date().toISOString(),
				context: { restored: true }
			};

			const checkpoint: Checkpoint = {
				id: 'checkpoint-1',
				ticketId: 'ticket-1',
				data: checkpointData,
				createdAt: new Date(),
				type: 'auto',
				version: 1
			};

			const restored = await manager.restoreFromCheckpoint(checkpoint);

			expect(restored.ticketId).toBe('ticket-1');
			expect(restored.projectId).toBe('project-1');
			expect(restored.currentStage).toBe('Executing');
			expect(restored.percentComplete).toBe(40);
			expect(restored.stages).toHaveLength(2);
			expect(restored.logs).toHaveLength(1);
			expect(restored.estimatedRemaining).toBeNull(); // Will be recalculated
		});
	});

	describe('deleteCheckpoint', () => {
		it('should delete a specific checkpoint', async () => {
			mockPrisma.executionCheckpoint.delete.mockResolvedValue({});

			await manager.deleteCheckpoint('checkpoint-1');

			expect(mockPrisma.executionCheckpoint.delete).toHaveBeenCalledWith({
				where: { id: 'checkpoint-1' }
			});
		});
	});

	describe('deleteAllCheckpoints', () => {
		it('should delete all checkpoints for a ticket', async () => {
			mockPrisma.executionCheckpoint.deleteMany.mockResolvedValue({ count: 5 });

			await manager.deleteAllCheckpoints('ticket-1');

			expect(mockPrisma.executionCheckpoint.deleteMany).toHaveBeenCalledWith({
				where: { ticketId: 'ticket-1' }
			});
		});
	});

	describe('auto checkpoint', () => {
		it('should start and stop auto checkpoint timer', () => {
			const getProgress = vi.fn().mockReturnValue(mockProgress);

			manager.startAutoCheckpoint('ticket-1', getProgress);

			// Timer should be set
			expect(getProgress).not.toHaveBeenCalled(); // Not called immediately

			manager.stopAutoCheckpoint('ticket-1');

			// Should not throw
		});
	});

	describe('checkpointOnStageComplete', () => {
		it('should create checkpoint with stage info in context', async () => {
			const mockCheckpoint = {
				id: 'checkpoint-1',
				ticketId: 'ticket-1',
				type: 'stage',
				version: 1,
				data: {},
				createdAt: new Date()
			};

			mockPrisma.executionCheckpoint.create.mockResolvedValue(mockCheckpoint);
			mockPrisma.executionCheckpoint.findMany.mockResolvedValue([]);

			const checkpoint = await manager.checkpointOnStageComplete(mockProgress, 'Analyzing');

			expect(checkpoint.type).toBe('stage');
			expect(mockPrisma.executionCheckpoint.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					type: 'stage',
					data: expect.objectContaining({
						context: { completedStage: 'Analyzing' }
					})
				})
			});
		});
	});

	describe('cleanup', () => {
		it('should stop all auto checkpoint timers', () => {
			const getProgress = vi.fn().mockReturnValue(mockProgress);

			manager.startAutoCheckpoint('ticket-1', getProgress);
			manager.startAutoCheckpoint('ticket-2', getProgress);

			manager.cleanup();

			// Should not throw and timers should be cleared
		});
	});
});
