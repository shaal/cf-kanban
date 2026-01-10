import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create mock Redis instance
class MockRedis {
	private static instances: MockRedis[] = [];
	public onHandlers: Map<string, Function[]> = new Map();
	public status = 'ready';

	constructor() {
		MockRedis.instances.push(this);
	}

	on(event: string, handler: Function) {
		if (!this.onHandlers.has(event)) {
			this.onHandlers.set(event, []);
		}
		this.onHandlers.get(event)!.push(handler);
		return this;
	}

	async quit() {
		return 'OK';
	}

	duplicate() {
		return new MockRedis();
	}

	static getInstances() {
		return MockRedis.instances;
	}

	static clearInstances() {
		MockRedis.instances = [];
	}
}

vi.mock('ioredis', () => {
	return {
		default: MockRedis
	};
});

describe('Redis Singleton', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
		MockRedis.clearInstances();
		// Set env vars
		process.env.REDIS_URL = 'redis://localhost:6379';
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('getRedisClient', () => {
		it('should create a Redis client', async () => {
			const { getRedisClient } = await import('$lib/server/redis');
			const client = getRedisClient();

			expect(client).toBeDefined();
			expect(client).toBeInstanceOf(MockRedis);
		});

		it('should return the same instance on subsequent calls (singleton pattern)', async () => {
			const { getRedisClient } = await import('$lib/server/redis');
			const client1 = getRedisClient();
			const client2 = getRedisClient();

			expect(client1).toBe(client2);
		});

		it('should set up error handling on the client', async () => {
			const { getRedisClient } = await import('$lib/server/redis');
			const client = getRedisClient() as unknown as MockRedis;

			expect(client.onHandlers.has('error')).toBe(true);
		});

		it('should set up connect and ready handlers', async () => {
			const { getRedisClient } = await import('$lib/server/redis');
			const client = getRedisClient() as unknown as MockRedis;

			expect(client.onHandlers.has('connect')).toBe(true);
			expect(client.onHandlers.has('ready')).toBe(true);
		});
	});

	describe('getPubSubClient', () => {
		it('should create a separate pub/sub client using duplicate', async () => {
			const { getRedisClient, getPubSubClient } = await import('$lib/server/redis');

			const mainClient = getRedisClient();
			const pubSubClient = getPubSubClient();

			// Both should be MockRedis instances
			expect(mainClient).toBeInstanceOf(MockRedis);
			expect(pubSubClient).toBeInstanceOf(MockRedis);

			// They should be different instances (pub/sub is duplicated)
			expect(pubSubClient).not.toBe(mainClient);
		});

		it('should return the same pub/sub instance on subsequent calls', async () => {
			const { getPubSubClient } = await import('$lib/server/redis');
			const client1 = getPubSubClient();
			const client2 = getPubSubClient();

			expect(client1).toBe(client2);
		});

		it('should set up error handling on pub/sub client', async () => {
			const { getPubSubClient } = await import('$lib/server/redis');
			const client = getPubSubClient() as unknown as MockRedis;

			expect(client.onHandlers.has('error')).toBe(true);
		});
	});

	describe('closeRedisConnections', () => {
		it('should close all Redis connections', async () => {
			const { getRedisClient, getPubSubClient, closeRedisConnections } = await import(
				'$lib/server/redis'
			);

			const mainClient = getRedisClient() as unknown as MockRedis;
			const pubSubClient = getPubSubClient() as unknown as MockRedis;

			// Spy on quit methods
			const mainQuitSpy = vi.spyOn(mainClient, 'quit');
			const pubSubQuitSpy = vi.spyOn(pubSubClient, 'quit');

			await closeRedisConnections();

			expect(mainQuitSpy).toHaveBeenCalled();
			expect(pubSubQuitSpy).toHaveBeenCalled();
		});
	});
});
