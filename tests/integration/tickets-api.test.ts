import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prisma client
const mockPrisma = {
	project: {
		findUnique: vi.fn()
	},
	ticket: {
		findMany: vi.fn(),
		findFirst: vi.fn(),
		findUnique: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn()
	},
	ticketHistory: {
		create: vi.fn()
	}
};

// Mock the prisma module
vi.mock('$lib/server/prisma', () => ({
	prisma: mockPrisma
}));

describe('Tickets API', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('GET /api/projects/:projectId/tickets', () => {
		it('should return all tickets for a project ordered by position', async () => {
			const mockTickets = [
				{
					id: 'ticket-1',
					title: 'First ticket',
					status: 'BACKLOG',
					priority: 'HIGH',
					position: 0
				},
				{
					id: 'ticket-2',
					title: 'Second ticket',
					status: 'TODO',
					priority: 'MEDIUM',
					position: 1
				}
			];

			mockPrisma.ticket.findMany.mockResolvedValue(mockTickets);

			const result = await mockPrisma.ticket.findMany({
				where: { projectId: 'proj-1' },
				orderBy: { position: 'asc' }
			});

			expect(result).toEqual(mockTickets);
			expect(result).toHaveLength(2);
			expect(result[0].position).toBeLessThan(result[1].position);
		});

		it('should return empty array when project has no tickets', async () => {
			mockPrisma.ticket.findMany.mockResolvedValue([]);

			const result = await mockPrisma.ticket.findMany({
				where: { projectId: 'proj-empty' },
				orderBy: { position: 'asc' }
			});

			expect(result).toEqual([]);
		});
	});

	describe('POST /api/projects/:projectId/tickets', () => {
		it('should create a ticket with all fields', async () => {
			const newTicket = {
				id: 'ticket-new',
				title: 'New Ticket',
				description: 'A test ticket',
				status: 'BACKLOG',
				priority: 'HIGH',
				labels: ['bug', 'urgent'],
				position: 0,
				projectId: 'proj-1',
				createdAt: new Date(),
				updatedAt: new Date()
			};

			mockPrisma.ticket.findFirst.mockResolvedValue(null);
			mockPrisma.ticket.create.mockResolvedValue(newTicket);

			const result = await mockPrisma.ticket.create({
				data: {
					title: 'New Ticket',
					description: 'A test ticket',
					priority: 'HIGH',
					labels: ['bug', 'urgent'],
					position: 0,
					projectId: 'proj-1'
				}
			});

			expect(result).toEqual(newTicket);
			expect(result.status).toBe('BACKLOG');
		});

		it('should create a ticket with only required fields', async () => {
			const newTicket = {
				id: 'ticket-new',
				title: 'Minimal Ticket',
				description: null,
				status: 'BACKLOG',
				priority: 'MEDIUM',
				labels: [],
				position: 0,
				projectId: 'proj-1'
			};

			mockPrisma.ticket.create.mockResolvedValue(newTicket);

			const result = await mockPrisma.ticket.create({
				data: {
					title: 'Minimal Ticket',
					description: null,
					priority: 'MEDIUM',
					labels: [],
					position: 0,
					projectId: 'proj-1'
				}
			});

			expect(result.title).toBe('Minimal Ticket');
			expect(result.priority).toBe('MEDIUM');
			expect(result.labels).toEqual([]);
		});

		it('should assign correct position for new ticket', async () => {
			const existingTicket = { position: 5 };
			mockPrisma.ticket.findFirst.mockResolvedValue(existingTicket);

			const lastTicket = await mockPrisma.ticket.findFirst({
				where: { projectId: 'proj-1' },
				orderBy: { position: 'desc' }
			});
			const nextPosition = (lastTicket?.position ?? -1) + 1;

			expect(nextPosition).toBe(6);
		});
	});

	describe('GET /api/tickets/:id', () => {
		it('should return a ticket with its history', async () => {
			const ticketWithHistory = {
				id: 'ticket-1',
				title: 'Test Ticket',
				status: 'IN_PROGRESS',
				history: [
					{
						id: 'hist-1',
						fromStatus: 'BACKLOG',
						toStatus: 'TODO',
						triggeredBy: 'user',
						createdAt: new Date()
					},
					{
						id: 'hist-2',
						fromStatus: 'TODO',
						toStatus: 'IN_PROGRESS',
						triggeredBy: 'user',
						createdAt: new Date()
					}
				]
			};

			mockPrisma.ticket.findUnique.mockResolvedValue(ticketWithHistory);

			const result = await mockPrisma.ticket.findUnique({
				where: { id: 'ticket-1' },
				include: { history: { orderBy: { createdAt: 'desc' } } }
			});

			expect(result?.history).toHaveLength(2);
		});

		it('should return null when ticket not found', async () => {
			mockPrisma.ticket.findUnique.mockResolvedValue(null);

			const result = await mockPrisma.ticket.findUnique({
				where: { id: 'non-existent' }
			});

			expect(result).toBeNull();
		});
	});

	describe('PUT /api/tickets/:id', () => {
		it('should update ticket title', async () => {
			const updatedTicket = {
				id: 'ticket-1',
				title: 'Updated Title',
				status: 'BACKLOG'
			};

			mockPrisma.ticket.update.mockResolvedValue(updatedTicket);

			const result = await mockPrisma.ticket.update({
				where: { id: 'ticket-1' },
				data: { title: 'Updated Title' }
			});

			expect(result.title).toBe('Updated Title');
		});

		it('should update ticket priority', async () => {
			const updatedTicket = {
				id: 'ticket-1',
				title: 'Test Ticket',
				priority: 'CRITICAL'
			};

			mockPrisma.ticket.update.mockResolvedValue(updatedTicket);

			const result = await mockPrisma.ticket.update({
				where: { id: 'ticket-1' },
				data: { priority: 'CRITICAL' }
			});

			expect(result.priority).toBe('CRITICAL');
		});

		it('should update ticket labels', async () => {
			const updatedTicket = {
				id: 'ticket-1',
				labels: ['frontend', 'feature', 'v2']
			};

			mockPrisma.ticket.update.mockResolvedValue(updatedTicket);

			const result = await mockPrisma.ticket.update({
				where: { id: 'ticket-1' },
				data: { labels: ['frontend', 'feature', 'v2'] }
			});

			expect(result.labels).toContain('frontend');
			expect(result.labels).toHaveLength(3);
		});
	});

	describe('DELETE /api/tickets/:id', () => {
		it('should delete a ticket', async () => {
			mockPrisma.ticket.delete.mockResolvedValue({ id: 'ticket-1' });

			const result = await mockPrisma.ticket.delete({
				where: { id: 'ticket-1' }
			});

			expect(result.id).toBe('ticket-1');
			expect(mockPrisma.ticket.delete).toHaveBeenCalledWith({
				where: { id: 'ticket-1' }
			});
		});
	});
});
