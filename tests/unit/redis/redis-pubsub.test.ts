import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Redis clients
const mockPublishClient = {
	publish: vi.fn().mockResolvedValue(1)
};

const mockSubscribeClient = {
	subscribe: vi.fn().mockResolvedValue(1),
	on: vi.fn()
};

vi.mock('$lib/server/redis', () => ({
	getRedisClient: vi.fn(() => mockPublishClient),
	getPubSubClient: vi.fn(() => mockSubscribeClient)
}));

describe('Redis Pub/Sub', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Channel Constants', () => {
		it('should export TICKET_EVENTS channel', async () => {
			const { TICKET_EVENTS } = await import('$lib/server/redis/pubsub');
			expect(TICKET_EVENTS).toBe('kanban:tickets');
		});

		it('should export PROJECT_EVENTS channel', async () => {
			const { PROJECT_EVENTS } = await import('$lib/server/redis/pubsub');
			expect(PROJECT_EVENTS).toBe('kanban:projects');
		});

		it('should export SYSTEM_EVENTS channel', async () => {
			const { SYSTEM_EVENTS } = await import('$lib/server/redis/pubsub');
			expect(SYSTEM_EVENTS).toBe('kanban:system');
		});
	});

	describe('publishEvent', () => {
		it('should publish event to the specified channel', async () => {
			const { publishEvent, TICKET_EVENTS } = await import('$lib/server/redis/pubsub');

			const event = { type: 'test', data: { id: '123' } };
			await publishEvent(TICKET_EVENTS, event);

			expect(mockPublishClient.publish).toHaveBeenCalledWith(
				TICKET_EVENTS,
				expect.stringContaining('"type":"test"')
			);
		});

		it('should add timestamp to the event', async () => {
			const { publishEvent, TICKET_EVENTS } = await import('$lib/server/redis/pubsub');

			const event = { type: 'test' };
			await publishEvent(TICKET_EVENTS, event);

			// Verify the published message contains a timestamp
			const [, message] = mockPublishClient.publish.mock.calls[0];
			const parsed = JSON.parse(message);
			expect(parsed.timestamp).toBeDefined();
			expect(typeof parsed.timestamp).toBe('number');
		});

		it('should return the number of subscribers that received the message', async () => {
			const { publishEvent, TICKET_EVENTS } = await import('$lib/server/redis/pubsub');

			mockPublishClient.publish.mockResolvedValue(3);
			const result = await publishEvent(TICKET_EVENTS, { type: 'test' });

			expect(result).toBe(3);
		});
	});

	describe('publishTicketEvent', () => {
		it('should publish ticket events to TICKET_EVENTS channel', async () => {
			const { publishTicketEvent, TICKET_EVENTS } = await import('$lib/server/redis/pubsub');

			const ticketEvent = {
				type: 'ticket:created' as const,
				ticketId: 'ticket-123',
				projectId: 'proj-1',
				data: { title: 'New ticket' }
			};

			await publishTicketEvent(ticketEvent);

			expect(mockPublishClient.publish).toHaveBeenCalledWith(
				TICKET_EVENTS,
				expect.stringContaining('"type":"ticket:created"')
			);
		});
	});

	describe('publishProjectEvent', () => {
		it('should publish project events to PROJECT_EVENTS channel', async () => {
			const { publishProjectEvent, PROJECT_EVENTS } = await import('$lib/server/redis/pubsub');

			const projectEvent = {
				type: 'project:updated' as const,
				projectId: 'proj-1',
				data: { name: 'Updated Project' }
			};

			await publishProjectEvent(projectEvent);

			expect(mockPublishClient.publish).toHaveBeenCalledWith(
				PROJECT_EVENTS,
				expect.stringContaining('"type":"project:updated"')
			);
		});
	});

	describe('bridgeRedisToSocketIO', () => {
		it('should subscribe to all kanban channels', async () => {
			const { bridgeRedisToSocketIO, TICKET_EVENTS, PROJECT_EVENTS, SYSTEM_EVENTS } = await import(
				'$lib/server/redis/pubsub'
			);

			const mockSocketIO = {
				emit: vi.fn()
			};

			await bridgeRedisToSocketIO(mockSocketIO as any);

			expect(mockSubscribeClient.subscribe).toHaveBeenCalledWith(TICKET_EVENTS);
			expect(mockSubscribeClient.subscribe).toHaveBeenCalledWith(PROJECT_EVENTS);
			expect(mockSubscribeClient.subscribe).toHaveBeenCalledWith(SYSTEM_EVENTS);
		});

		it('should set up message handler for incoming events', async () => {
			const { bridgeRedisToSocketIO } = await import('$lib/server/redis/pubsub');

			const mockSocketIO = {
				emit: vi.fn()
			};

			await bridgeRedisToSocketIO(mockSocketIO as any);

			expect(mockSubscribeClient.on).toHaveBeenCalledWith('message', expect.any(Function));
		});

		it('should forward received messages to Socket.IO', async () => {
			const { bridgeRedisToSocketIO, TICKET_EVENTS } = await import('$lib/server/redis/pubsub');

			const mockSocketIO = {
				emit: vi.fn()
			};

			await bridgeRedisToSocketIO(mockSocketIO as any);

			// Get the message handler that was registered
			const messageHandler = mockSubscribeClient.on.mock.calls.find(
				(call) => call[0] === 'message'
			)?.[1];

			expect(messageHandler).toBeDefined();

			// Simulate receiving a message
			const testEvent = { type: 'ticket:created', data: {} };
			messageHandler(TICKET_EVENTS, JSON.stringify(testEvent));

			expect(mockSocketIO.emit).toHaveBeenCalledWith(TICKET_EVENTS, testEvent);
		});
	});

	describe('channels export', () => {
		it('should export channels object with all channel names', async () => {
			const { channels, TICKET_EVENTS, PROJECT_EVENTS, SYSTEM_EVENTS } = await import(
				'$lib/server/redis/pubsub'
			);

			expect(channels.tickets).toBe(TICKET_EVENTS);
			expect(channels.projects).toBe(PROJECT_EVENTS);
			expect(channels.system).toBe(SYSTEM_EVENTS);
		});
	});
});
