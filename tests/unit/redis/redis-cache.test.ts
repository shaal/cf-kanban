import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock pipeline object
const mockPipeline = {
	set: vi.fn().mockReturnThis(),
	del: vi.fn().mockReturnThis(),
	get: vi.fn().mockReturnThis(),
	exec: vi.fn().mockResolvedValue([])
};

// Mock Redis client
const mockRedisClient = {
	get: vi.fn(),
	set: vi.fn().mockResolvedValue('OK'),
	del: vi.fn().mockResolvedValue(1),
	keys: vi.fn().mockResolvedValue([]),
	exists: vi.fn().mockResolvedValue(1),
	ttl: vi.fn().mockResolvedValue(300),
	pipeline: vi.fn(() => mockPipeline)
};

vi.mock('$lib/server/redis', () => ({
	getRedisClient: vi.fn(() => mockRedisClient)
}));

const DEFAULT_TTL = 300; // 5 minutes in seconds

describe('Redis Cache', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset pipeline mock
		mockPipeline.set.mockClear().mockReturnThis();
		mockPipeline.del.mockClear().mockReturnThis();
		mockPipeline.exec.mockClear().mockResolvedValue([]);
	});

	describe('Project Cache', () => {
		describe('cacheProject', () => {
			it('should cache a project with 5-minute TTL', async () => {
				const { cacheProject } = await import('$lib/server/redis/cache');

				const project = {
					id: 'proj-1',
					name: 'Test Project',
					description: 'A test project'
				};

				await cacheProject(project);

				expect(mockRedisClient.set).toHaveBeenCalledWith(
					'project:proj-1',
					JSON.stringify(project),
					'EX',
					DEFAULT_TTL
				);
			});

			it('should allow custom TTL', async () => {
				const { cacheProject } = await import('$lib/server/redis/cache');

				const project = { id: 'proj-2', name: 'Project' };
				await cacheProject(project, 600);

				expect(mockRedisClient.set).toHaveBeenCalledWith(
					'project:proj-2',
					JSON.stringify(project),
					'EX',
					600
				);
			});
		});

		describe('getProject', () => {
			it('should return cached project when found', async () => {
				const { getProject } = await import('$lib/server/redis/cache');

				const project = {
					id: 'proj-1',
					name: 'Test Project',
					description: 'A test project'
				};
				mockRedisClient.get.mockResolvedValue(JSON.stringify(project));

				const result = await getProject('proj-1');

				expect(mockRedisClient.get).toHaveBeenCalledWith('project:proj-1');
				expect(result).toEqual(project);
			});

			it('should return null when project not found in cache', async () => {
				const { getProject } = await import('$lib/server/redis/cache');

				mockRedisClient.get.mockResolvedValue(null);

				const result = await getProject('non-existent');

				expect(result).toBeNull();
			});

			it('should return null when cached data is invalid JSON', async () => {
				const { getProject } = await import('$lib/server/redis/cache');

				mockRedisClient.get.mockResolvedValue('invalid json');

				const result = await getProject('proj-1');

				expect(result).toBeNull();
			});
		});

		describe('invalidateProject', () => {
			it('should delete project from cache', async () => {
				const { invalidateProject } = await import('$lib/server/redis/cache');

				await invalidateProject('proj-1');

				expect(mockRedisClient.del).toHaveBeenCalledWith('project:proj-1');
			});
		});
	});

	describe('Ticket Cache', () => {
		describe('cacheTicket', () => {
			it('should cache a ticket with 5-minute TTL', async () => {
				const { cacheTicket } = await import('$lib/server/redis/cache');

				const ticket = {
					id: 'ticket-1',
					title: 'Test Ticket',
					status: 'BACKLOG',
					projectId: 'proj-1'
				};

				await cacheTicket(ticket);

				expect(mockRedisClient.set).toHaveBeenCalledWith(
					'ticket:ticket-1',
					JSON.stringify(ticket),
					'EX',
					DEFAULT_TTL
				);
			});
		});

		describe('getTicket', () => {
			it('should return cached ticket when found', async () => {
				const { getTicket } = await import('$lib/server/redis/cache');

				const ticket = {
					id: 'ticket-1',
					title: 'Test Ticket',
					status: 'BACKLOG'
				};
				mockRedisClient.get.mockResolvedValue(JSON.stringify(ticket));

				const result = await getTicket('ticket-1');

				expect(mockRedisClient.get).toHaveBeenCalledWith('ticket:ticket-1');
				expect(result).toEqual(ticket);
			});

			it('should return null when ticket not found in cache', async () => {
				const { getTicket } = await import('$lib/server/redis/cache');

				mockRedisClient.get.mockResolvedValue(null);

				const result = await getTicket('non-existent');

				expect(result).toBeNull();
			});
		});

		describe('invalidateTicket', () => {
			it('should delete ticket from cache', async () => {
				const { invalidateTicket } = await import('$lib/server/redis/cache');

				await invalidateTicket('ticket-1');

				expect(mockRedisClient.del).toHaveBeenCalledWith('ticket:ticket-1');
			});
		});
	});

	describe('Batch Operations', () => {
		describe('cacheProjectTickets', () => {
			it('should cache multiple tickets using pipeline', async () => {
				const { cacheProjectTickets } = await import('$lib/server/redis/cache');

				const tickets = [
					{ id: 'ticket-1', title: 'Ticket 1', projectId: 'proj-1' },
					{ id: 'ticket-2', title: 'Ticket 2', projectId: 'proj-1' },
					{ id: 'ticket-3', title: 'Ticket 3', projectId: 'proj-1' }
				];

				await cacheProjectTickets('proj-1', tickets);

				expect(mockRedisClient.pipeline).toHaveBeenCalled();
				// 3 tickets + 1 list key = 4 set calls
				expect(mockPipeline.set).toHaveBeenCalledTimes(4);
				expect(mockPipeline.exec).toHaveBeenCalled();
			});

			it('should use correct cache keys for each ticket', async () => {
				const { cacheProjectTickets } = await import('$lib/server/redis/cache');

				const tickets = [
					{ id: 'ticket-1', title: 'Ticket 1', projectId: 'proj-1' },
					{ id: 'ticket-2', title: 'Ticket 2', projectId: 'proj-1' }
				];

				await cacheProjectTickets('proj-1', tickets);

				expect(mockPipeline.set).toHaveBeenCalledWith(
					'ticket:ticket-1',
					JSON.stringify(tickets[0]),
					'EX',
					DEFAULT_TTL
				);
				expect(mockPipeline.set).toHaveBeenCalledWith(
					'ticket:ticket-2',
					JSON.stringify(tickets[1]),
					'EX',
					DEFAULT_TTL
				);
			});
		});

		describe('invalidateProjectTickets', () => {
			it('should delete all tickets for a project using pipeline', async () => {
				const { invalidateProjectTickets } = await import('$lib/server/redis/cache');

				// Mock that we have cached ticket IDs for the project
				mockRedisClient.get.mockResolvedValue(
					JSON.stringify(['ticket-1', 'ticket-2', 'ticket-3'])
				);

				await invalidateProjectTickets('proj-1');

				expect(mockRedisClient.pipeline).toHaveBeenCalled();
				// 3 tickets + 1 list key = 4 del calls
				expect(mockPipeline.del).toHaveBeenCalledTimes(4);
				expect(mockPipeline.exec).toHaveBeenCalled();
			});

			it('should handle no cached tickets gracefully', async () => {
				const { invalidateProjectTickets } = await import('$lib/server/redis/cache');

				mockRedisClient.get.mockResolvedValue(null);

				await invalidateProjectTickets('proj-1');

				// Should just delete the list key directly
				expect(mockRedisClient.del).toHaveBeenCalledWith('project-tickets:proj-1');
			});
		});

		describe('getTickets', () => {
			it('should return empty array for empty input', async () => {
				const { getTickets } = await import('$lib/server/redis/cache');

				const result = await getTickets([]);

				expect(result).toEqual([]);
				expect(mockRedisClient.pipeline).not.toHaveBeenCalled();
			});

			it('should use pipeline for multiple tickets', async () => {
				const { getTickets } = await import('$lib/server/redis/cache');

				const tickets = [
					{ id: 't1', title: 'Ticket 1' },
					{ id: 't2', title: 'Ticket 2' }
				];

				mockPipeline.exec.mockResolvedValue([
					[null, JSON.stringify(tickets[0])],
					[null, JSON.stringify(tickets[1])]
				]);

				const result = await getTickets(['t1', 't2']);

				expect(mockRedisClient.pipeline).toHaveBeenCalled();
				expect(result).toEqual(tickets);
			});
		});
	});

	describe('Cache Key Patterns', () => {
		it('should use project: prefix for project keys', async () => {
			const { cacheProject, getProject, invalidateProject } = await import(
				'$lib/server/redis/cache'
			);

			await cacheProject({ id: 'test', name: 'Test' });
			await getProject('test');
			await invalidateProject('test');

			expect(mockRedisClient.set).toHaveBeenCalledWith(
				'project:test',
				expect.any(String),
				'EX',
				expect.any(Number)
			);
			expect(mockRedisClient.get).toHaveBeenCalledWith('project:test');
			expect(mockRedisClient.del).toHaveBeenCalledWith('project:test');
		});

		it('should use ticket: prefix for ticket keys', async () => {
			const { cacheTicket, getTicket, invalidateTicket } = await import(
				'$lib/server/redis/cache'
			);

			await cacheTicket({ id: 'test', title: 'Test' });
			await getTicket('test');
			await invalidateTicket('test');

			expect(mockRedisClient.set).toHaveBeenCalledWith(
				'ticket:test',
				expect.any(String),
				'EX',
				expect.any(Number)
			);
			expect(mockRedisClient.get).toHaveBeenCalledWith('ticket:test');
			expect(mockRedisClient.del).toHaveBeenCalledWith('ticket:test');
		});
	});

	describe('Utility Functions', () => {
		describe('isProjectCached', () => {
			it('should return true when project exists in cache', async () => {
				const { isProjectCached } = await import('$lib/server/redis/cache');

				mockRedisClient.exists.mockResolvedValue(1);

				const result = await isProjectCached('proj-1');

				expect(result).toBe(true);
				expect(mockRedisClient.exists).toHaveBeenCalledWith('project:proj-1');
			});

			it('should return false when project does not exist', async () => {
				const { isProjectCached } = await import('$lib/server/redis/cache');

				mockRedisClient.exists.mockResolvedValue(0);

				const result = await isProjectCached('proj-1');

				expect(result).toBe(false);
			});
		});

		describe('getProjectTTL', () => {
			it('should return TTL for cached project', async () => {
				const { getProjectTTL } = await import('$lib/server/redis/cache');

				mockRedisClient.ttl.mockResolvedValue(250);

				const result = await getProjectTTL('proj-1');

				expect(result).toBe(250);
				expect(mockRedisClient.ttl).toHaveBeenCalledWith('project:proj-1');
			});
		});
	});
});
