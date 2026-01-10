/**
 * TASK-053: Unit Tests for Ticket Workflow
 *
 * Tests for ticket transition handling and swarm initialization
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock Prisma
const mockPrismaTicket = {
	findUnique: vi.fn(),
	update: vi.fn()
};
const mockPrismaHistory = {
	findMany: vi.fn(),
	create: vi.fn()
};
const mockPrismaQuestion = {
	findMany: vi.fn()
};

vi.mock('$lib/server/prisma', () => ({
	prisma: {
		ticket: mockPrismaTicket,
		ticketHistory: mockPrismaHistory,
		ticketQuestion: mockPrismaQuestion
	}
}));

// Mock Claude Flow services
const mockSwarmInit = vi.fn();
const mockSwarmTerminate = vi.fn();
const mockSwarmResume = vi.fn();
const mockSwarmAddAgent = vi.fn();
const mockSwarmIsActive = vi.fn();

vi.mock('$lib/server/claude-flow/swarm', () => ({
	swarmService: {
		init: mockSwarmInit,
		terminate: mockSwarmTerminate,
		resume: mockSwarmResume,
		addAgent: mockSwarmAddAgent,
		isActive: mockSwarmIsActive
	}
}));

const mockAgentSpawn = vi.fn();

vi.mock('$lib/server/claude-flow/agents', () => ({
	agentService: {
		spawn: mockAgentSpawn
	}
}));

// Mock Redis pubsub
const mockPublishTicketEvent = vi.fn();

vi.mock('$lib/server/redis/pubsub', () => ({
	publishTicketEvent: mockPublishTicketEvent
}));

// Import after mocks
import {
	handleTicketTransition,
	buildTicketContext,
	canStartTicket,
	type WorkflowResult
} from '$lib/server/workflow/ticket-workflow';
import type { TicketStatus } from '@prisma/client';

describe('Ticket Workflow', () => {
	const mockProject = {
		id: 'project-1',
		name: 'Test Project',
		description: 'A test project'
	};

	const mockTicket = {
		id: 'ticket-1',
		title: 'Add user authentication',
		description: 'Implement JWT-based authentication',
		status: 'TODO' as TicketStatus,
		priority: 'HIGH' as const,
		labels: ['feature', 'security'],
		complexity: null,
		position: 0,
		projectId: 'project-1',
		project: mockProject,
		createdAt: new Date(),
		updatedAt: new Date()
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// Default mock returns
		mockPrismaTicket.findUnique.mockResolvedValue(mockTicket);
		mockPrismaTicket.update.mockResolvedValue(mockTicket);
		mockPrismaHistory.create.mockResolvedValue({});
		mockPrismaHistory.findMany.mockResolvedValue([]);
		mockPrismaQuestion.findMany.mockResolvedValue([]);

		mockSwarmInit.mockResolvedValue({
			id: 'swarm-1',
			topology: 'hierarchical',
			agents: [],
			createdAt: new Date().toISOString(),
			status: 'active'
		});
		mockSwarmTerminate.mockResolvedValue(undefined);
		mockSwarmResume.mockResolvedValue(undefined);
		mockSwarmAddAgent.mockResolvedValue(undefined);
		mockSwarmIsActive.mockResolvedValue(false);

		mockAgentSpawn.mockImplementation((config) =>
			Promise.resolve({
				id: `agent-${config.type}-${Date.now()}`,
				type: config.type,
				name: config.name,
				status: 'idle',
				createdAt: new Date().toISOString()
			})
		);

		mockPublishTicketEvent.mockResolvedValue(1);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('handleTicketTransition', () => {
		describe('TODO -> IN_PROGRESS', () => {
			it('should start ticket execution', async () => {
				const result = await handleTicketTransition('ticket-1', 'TODO', 'IN_PROGRESS', 'user');

				expect(result.success).toBe(true);
				expect(result.swarmId).toBeDefined();
				expect(result.agents).toBeDefined();
				expect(result.agents!.length).toBeGreaterThan(0);
			});

			it('should initialize swarm with correct topology', async () => {
				await handleTicketTransition('ticket-1', 'TODO', 'IN_PROGRESS', 'user');

				expect(mockSwarmInit).toHaveBeenCalledWith(
					expect.objectContaining({
						topology: expect.any(String),
						maxAgents: expect.any(Number)
					})
				);
			});

			it('should spawn agents based on analysis', async () => {
				await handleTicketTransition('ticket-1', 'TODO', 'IN_PROGRESS', 'user');

				expect(mockAgentSpawn).toHaveBeenCalled();
				const spawnCalls = mockAgentSpawn.mock.calls;
				expect(spawnCalls.length).toBeGreaterThan(0);

				// Each spawn call should have type, name, and prompt
				for (const call of spawnCalls) {
					expect(call[0]).toHaveProperty('type');
					expect(call[0]).toHaveProperty('name');
					expect(call[0]).toHaveProperty('prompt');
				}
			});

			it('should add agents to swarm', async () => {
				await handleTicketTransition('ticket-1', 'TODO', 'IN_PROGRESS', 'user');

				expect(mockSwarmAddAgent).toHaveBeenCalled();
			});

			it('should update ticket complexity', async () => {
				await handleTicketTransition('ticket-1', 'TODO', 'IN_PROGRESS', 'user');

				expect(mockPrismaTicket.update).toHaveBeenCalledWith(
					expect.objectContaining({
						where: { id: 'ticket-1' },
						data: expect.objectContaining({
							complexity: expect.any(Number)
						})
					})
				);
			});

			it('should record history', async () => {
				await handleTicketTransition('ticket-1', 'TODO', 'IN_PROGRESS', 'user');

				expect(mockPrismaHistory.create).toHaveBeenCalledWith(
					expect.objectContaining({
						data: expect.objectContaining({
							ticketId: 'ticket-1',
							fromStatus: 'TODO',
							toStatus: 'IN_PROGRESS'
						})
					})
				);
			});

			it('should publish transition event', async () => {
				await handleTicketTransition('ticket-1', 'TODO', 'IN_PROGRESS', 'user');

				expect(mockPublishTicketEvent).toHaveBeenCalledWith(
					expect.objectContaining({
						type: 'ticket:transitioned',
						ticketId: 'ticket-1'
					})
				);
			});

			it('should rollback on swarm init failure', async () => {
				mockSwarmInit.mockRejectedValue(new Error('Swarm init failed'));

				const result = await handleTicketTransition('ticket-1', 'TODO', 'IN_PROGRESS', 'user');

				expect(result.success).toBe(false);
				expect(result.error).toContain('Swarm init failed');

				// Should have updated ticket back to TODO
				expect(mockPrismaTicket.update).toHaveBeenCalledWith(
					expect.objectContaining({
						data: { status: 'TODO' }
					})
				);
			});
		});

		describe('NEEDS_FEEDBACK -> READY_TO_RESUME', () => {
			beforeEach(() => {
				mockPrismaTicket.findUnique.mockResolvedValue({
					...mockTicket,
					status: 'NEEDS_FEEDBACK'
				});
				mockPrismaQuestion.findMany.mockResolvedValue([
					{
						id: 'q1',
						ticketId: 'ticket-1',
						question: 'What framework?',
						answer: 'React',
						answered: true,
						agentId: 'agent-1'
					}
				]);
			});

			it('should resume ticket execution', async () => {
				const result = await handleTicketTransition(
					'ticket-1',
					'NEEDS_FEEDBACK',
					'READY_TO_RESUME',
					'user'
				);

				expect(result.success).toBe(true);
			});

			it('should include answered questions in event', async () => {
				await handleTicketTransition('ticket-1', 'NEEDS_FEEDBACK', 'READY_TO_RESUME', 'user');

				expect(mockPublishTicketEvent).toHaveBeenCalledWith(
					expect.objectContaining({
						type: 'ticket:transitioned',
						data: expect.objectContaining({
							action: 'resume',
							answers: expect.arrayContaining([
								expect.objectContaining({
									question: 'What framework?',
									answer: 'React'
								})
							])
						})
					})
				);
			});

			it('should record history with answer count', async () => {
				await handleTicketTransition('ticket-1', 'NEEDS_FEEDBACK', 'READY_TO_RESUME', 'user');

				expect(mockPrismaHistory.create).toHaveBeenCalledWith(
					expect.objectContaining({
						data: expect.objectContaining({
							reason: expect.stringContaining('1 answer')
						})
					})
				);
			});
		});

		describe('READY_TO_RESUME -> IN_PROGRESS', () => {
			beforeEach(() => {
				mockPrismaTicket.findUnique.mockResolvedValue({
					...mockTicket,
					status: 'READY_TO_RESUME'
				});
			});

			it('should continue ticket execution', async () => {
				const result = await handleTicketTransition(
					'ticket-1',
					'READY_TO_RESUME',
					'IN_PROGRESS',
					'system'
				);

				expect(result.success).toBe(true);
			});

			it('should resume swarm', async () => {
				await handleTicketTransition('ticket-1', 'READY_TO_RESUME', 'IN_PROGRESS', 'system');

				expect(mockSwarmResume).toHaveBeenCalled();
			});
		});

		describe('* -> DONE', () => {
			beforeEach(() => {
				mockPrismaTicket.findUnique.mockResolvedValue({
					...mockTicket,
					status: 'IN_PROGRESS'
				});
				mockPrismaHistory.findMany.mockResolvedValue([
					{
						id: 'h1',
						toStatus: 'IN_PROGRESS',
						createdAt: new Date(Date.now() - 3600000)
					}
				]);
			});

			it('should complete ticket execution', async () => {
				const result = await handleTicketTransition('ticket-1', 'IN_PROGRESS', 'DONE', 'user');

				expect(result.success).toBe(true);
			});

			it('should terminate swarm', async () => {
				await handleTicketTransition('ticket-1', 'IN_PROGRESS', 'DONE', 'user');

				expect(mockSwarmTerminate).toHaveBeenCalled();
			});

			it('should calculate duration', async () => {
				const result = await handleTicketTransition('ticket-1', 'IN_PROGRESS', 'DONE', 'user');

				expect(result.details).toHaveProperty('duration');
				expect(typeof result.details!.duration).toBe('number');
			});
		});

		describe('* -> CANCELLED', () => {
			beforeEach(() => {
				mockPrismaTicket.findUnique.mockResolvedValue({
					...mockTicket,
					status: 'IN_PROGRESS'
				});
			});

			it('should cancel ticket execution', async () => {
				const result = await handleTicketTransition(
					'ticket-1',
					'IN_PROGRESS',
					'CANCELLED',
					'user'
				);

				expect(result.success).toBe(true);
			});

			it('should terminate swarm immediately', async () => {
				await handleTicketTransition('ticket-1', 'IN_PROGRESS', 'CANCELLED', 'user');

				expect(mockSwarmTerminate).toHaveBeenCalledWith(undefined, false);
			});

			it('should publish cancellation event', async () => {
				await handleTicketTransition('ticket-1', 'IN_PROGRESS', 'CANCELLED', 'user');

				expect(mockPublishTicketEvent).toHaveBeenCalledWith(
					expect.objectContaining({
						data: expect.objectContaining({
							action: 'cancelled'
						})
					})
				);
			});
		});

		describe('other transitions', () => {
			it('should return success for non-workflow transitions', async () => {
				const result = await handleTicketTransition('ticket-1', 'BACKLOG', 'TODO', 'user');

				expect(result.success).toBe(true);
				expect(result.swarmId).toBeUndefined();
			});
		});

		describe('error handling', () => {
			it('should return error when ticket not found', async () => {
				mockPrismaTicket.findUnique.mockResolvedValue(null);

				const result = await handleTicketTransition(
					'nonexistent',
					'TODO',
					'IN_PROGRESS',
					'user'
				);

				expect(result.success).toBe(false);
				expect(result.error).toContain('Ticket not found');
			});
		});
	});

	describe('buildTicketContext', () => {
		it('should build context from ticket', () => {
			const context = buildTicketContext(mockTicket as any);

			expect(context).toEqual({
				ticketId: 'ticket-1',
				projectId: 'project-1',
				title: 'Add user authentication',
				description: 'Implement JWT-based authentication',
				priority: 'HIGH',
				labels: ['feature', 'security'],
				complexity: null,
				projectName: 'Test Project'
			});
		});
	});

	describe('canStartTicket', () => {
		it('should return true when ticket can be started', async () => {
			mockPrismaTicket.findUnique.mockResolvedValue({
				...mockTicket,
				status: 'TODO'
			});
			mockSwarmIsActive.mockResolvedValue(false);

			const result = await canStartTicket('ticket-1');

			expect(result.canStart).toBe(true);
		});

		it('should return false when ticket not found', async () => {
			mockPrismaTicket.findUnique.mockResolvedValue(null);

			const result = await canStartTicket('nonexistent');

			expect(result.canStart).toBe(false);
			expect(result.reason).toContain('not found');
		});

		it('should return false when ticket not in TODO status', async () => {
			mockPrismaTicket.findUnique.mockResolvedValue({
				...mockTicket,
				status: 'IN_PROGRESS'
			});

			const result = await canStartTicket('ticket-1');

			expect(result.canStart).toBe(false);
			expect(result.reason).toContain('TODO');
		});

		it('should return false when another swarm is active', async () => {
			mockPrismaTicket.findUnique.mockResolvedValue({
				...mockTicket,
				status: 'TODO'
			});
			mockSwarmIsActive.mockResolvedValue(true);

			const result = await canStartTicket('ticket-1');

			expect(result.canStart).toBe(false);
			expect(result.reason).toContain('swarm is already active');
		});
	});
});
