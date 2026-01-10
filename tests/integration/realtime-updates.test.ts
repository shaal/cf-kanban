/**
 * TASK-039: Integration Tests for Real-Time Updates
 *
 * These tests verify the integration between WebSocket events and
 * the Svelte store system for real-time ticket updates.
 *
 * Test Coverage:
 * - Store synchronization with WebSocket events
 * - Optimistic updates and rollback
 * - Derived stores (ticketsByStatus)
 * - Remote update handling (create, update, delete)
 * - Error recovery
 *
 * Note: These tests use mock implementations. When the actual
 * stores and WebSocket integration is complete, tests may need
 * to be updated to use the real implementations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Ticket, TicketStatus } from '$lib/types';

/**
 * Mock Ticket Store
 *
 * This is a mock implementation of what the real store will look like.
 * It demonstrates the expected behavior for:
 * - Optimistic updates
 * - Rollback on failure
 * - Remote update synchronization
 * - Derived store computation
 */
class MockTicketStore {
	private tickets: Map<string, Ticket> = new Map();
	private pendingUpdates: Map<string, { original: Ticket; timeout: ReturnType<typeof setTimeout> }> =
		new Map();
	private subscribers: Set<(tickets: Ticket[]) => void> = new Set();
	private rollbackTimeout: number = 5000;

	/**
	 * Subscribe to store changes
	 */
	subscribe(callback: (tickets: Ticket[]) => void): () => void {
		this.subscribers.add(callback);
		callback(this.getAll());
		return () => this.subscribers.delete(callback);
	}

	/**
	 * Notify all subscribers
	 */
	private notify(): void {
		const tickets = this.getAll();
		this.subscribers.forEach((cb) => cb(tickets));
	}

	/**
	 * Get all tickets
	 */
	getAll(): Ticket[] {
		return Array.from(this.tickets.values());
	}

	/**
	 * Get a ticket by ID
	 */
	get(id: string): Ticket | undefined {
		return this.tickets.get(id);
	}

	/**
	 * Set tickets (for initialization)
	 */
	set(tickets: Ticket[]): void {
		this.tickets.clear();
		tickets.forEach((t) => this.tickets.set(t.id, t));
		this.notify();
	}

	/**
	 * Add a ticket
	 */
	add(ticket: Ticket): void {
		this.tickets.set(ticket.id, ticket);
		this.notify();
	}

	/**
	 * Apply optimistic update with automatic rollback
	 */
	optimisticUpdate(id: string, update: Partial<Ticket>): () => void {
		const original = this.tickets.get(id);
		if (!original) {
			throw new Error(`Ticket not found: ${id}`);
		}

		// Store original for rollback
		const timeout = setTimeout(() => {
			this.rollback(id);
		}, this.rollbackTimeout);

		this.pendingUpdates.set(id, { original: { ...original }, timeout });

		// Apply optimistic update
		this.tickets.set(id, { ...original, ...update });
		this.notify();

		// Return rollback function
		return () => this.rollback(id);
	}

	/**
	 * Confirm an optimistic update
	 */
	confirmUpdate(id: string, serverData?: Partial<Ticket>): void {
		const pending = this.pendingUpdates.get(id);
		if (pending) {
			clearTimeout(pending.timeout);
			this.pendingUpdates.delete(id);
		}

		// Apply any additional data from server
		if (serverData) {
			const current = this.tickets.get(id);
			if (current) {
				this.tickets.set(id, { ...current, ...serverData });
				this.notify();
			}
		}
	}

	/**
	 * Rollback an optimistic update
	 */
	rollback(id: string): void {
		const pending = this.pendingUpdates.get(id);
		if (pending) {
			clearTimeout(pending.timeout);
			this.tickets.set(id, pending.original);
			this.pendingUpdates.delete(id);
			this.notify();
		}
	}

	/**
	 * Handle remote ticket creation
	 */
	handleRemoteCreate(ticket: Ticket): void {
		if (!this.tickets.has(ticket.id)) {
			this.tickets.set(ticket.id, ticket);
			this.notify();
		}
	}

	/**
	 * Handle remote ticket update
	 */
	handleRemoteUpdate(ticket: Ticket): void {
		// Skip if we have a pending optimistic update
		if (this.pendingUpdates.has(ticket.id)) {
			return;
		}
		this.tickets.set(ticket.id, ticket);
		this.notify();
	}

	/**
	 * Handle remote ticket deletion
	 */
	handleRemoteDelete(ticketId: string): void {
		// Cancel any pending updates
		const pending = this.pendingUpdates.get(ticketId);
		if (pending) {
			clearTimeout(pending.timeout);
			this.pendingUpdates.delete(ticketId);
		}
		this.tickets.delete(ticketId);
		this.notify();
	}

	/**
	 * Check if update is pending
	 */
	hasPendingUpdate(id: string): boolean {
		return this.pendingUpdates.has(id);
	}

	/**
	 * Clear all data
	 */
	reset(): void {
		this.pendingUpdates.forEach((pending) => clearTimeout(pending.timeout));
		this.pendingUpdates.clear();
		this.tickets.clear();
		this.notify();
	}
}

/**
 * Derived store that groups tickets by status
 */
function createDerivedTicketsByStatus(store: MockTicketStore): {
	subscribe: (callback: (grouped: Map<TicketStatus, Ticket[]>) => void) => () => void;
	get: () => Map<TicketStatus, Ticket[]>;
} {
	const subscribers = new Set<(grouped: Map<TicketStatus, Ticket[]>) => void>();

	const compute = (tickets: Ticket[]): Map<TicketStatus, Ticket[]> => {
		const grouped = new Map<TicketStatus, Ticket[]>();
		tickets.forEach((ticket) => {
			const existing = grouped.get(ticket.status) || [];
			existing.push(ticket);
			grouped.set(ticket.status, existing);
		});
		return grouped;
	};

	let currentValue: Map<TicketStatus, Ticket[]>;

	// Subscribe to source store
	store.subscribe((tickets) => {
		currentValue = compute(tickets);
		subscribers.forEach((cb) => cb(currentValue));
	});

	return {
		subscribe: (callback) => {
			subscribers.add(callback);
			callback(currentValue);
			return () => subscribers.delete(callback);
		},
		get: () => currentValue
	};
}

// Test fixtures
function createTestTicket(overrides: Partial<Ticket> = {}): Ticket {
	return {
		id: `ticket-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		title: 'Test Ticket',
		description: 'Test description',
		status: 'BACKLOG',
		priority: 'MEDIUM',
		labels: [],
		position: 0,
		projectId: 'project-1',
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides
	};
}

describe('Store Synchronization', () => {
	let store: MockTicketStore;

	beforeEach(() => {
		store = new MockTicketStore();
	});

	it('should initialize with empty tickets', () => {
		expect(store.getAll()).toHaveLength(0);
	});

	it('should notify subscribers on ticket addition', () => {
		const callback = vi.fn();
		store.subscribe(callback);

		// Initial call with empty array
		expect(callback).toHaveBeenCalledWith([]);

		const ticket = createTestTicket();
		store.add(ticket);

		expect(callback).toHaveBeenCalledTimes(2);
		expect(callback).toHaveBeenLastCalledWith([ticket]);
	});

	it('should notify subscribers on set', () => {
		const callback = vi.fn();
		const tickets = [createTestTicket({ id: '1' }), createTestTicket({ id: '2' })];

		store.subscribe(callback);
		store.set(tickets);

		expect(callback).toHaveBeenCalledWith(tickets);
	});

	it('should allow unsubscribe', () => {
		const callback = vi.fn();
		const unsubscribe = store.subscribe(callback);

		store.add(createTestTicket());
		expect(callback).toHaveBeenCalledTimes(2);

		unsubscribe();

		store.add(createTestTicket());
		expect(callback).toHaveBeenCalledTimes(2); // No additional calls
	});

	it('should get ticket by id', () => {
		const ticket = createTestTicket({ id: 'ticket-123' });
		store.add(ticket);

		expect(store.get('ticket-123')).toEqual(ticket);
		expect(store.get('nonexistent')).toBeUndefined();
	});
});

describe('Optimistic Updates', () => {
	let store: MockTicketStore;

	beforeEach(() => {
		store = new MockTicketStore();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should apply optimistic update immediately', () => {
		const ticket = createTestTicket({ id: '1', status: 'BACKLOG' });
		store.add(ticket);

		store.optimisticUpdate('1', { status: 'TODO' });

		expect(store.get('1')?.status).toBe('TODO');
	});

	it('should track pending updates', () => {
		const ticket = createTestTicket({ id: '1' });
		store.add(ticket);

		expect(store.hasPendingUpdate('1')).toBe(false);

		store.optimisticUpdate('1', { status: 'TODO' });

		expect(store.hasPendingUpdate('1')).toBe(true);
	});

	it('should confirm update and clear pending state', () => {
		const ticket = createTestTicket({ id: '1', status: 'BACKLOG' });
		store.add(ticket);

		store.optimisticUpdate('1', { status: 'TODO' });
		expect(store.hasPendingUpdate('1')).toBe(true);

		store.confirmUpdate('1');

		expect(store.hasPendingUpdate('1')).toBe(false);
		expect(store.get('1')?.status).toBe('TODO');
	});

	it('should apply server data on confirm', () => {
		const ticket = createTestTicket({ id: '1', status: 'BACKLOG' });
		store.add(ticket);

		store.optimisticUpdate('1', { status: 'TODO' });
		store.confirmUpdate('1', { updatedAt: new Date('2024-01-01') });

		const updated = store.get('1');
		expect(updated?.status).toBe('TODO');
		expect(updated?.updatedAt).toEqual(new Date('2024-01-01'));
	});

	it('should throw error for optimistic update on nonexistent ticket', () => {
		expect(() => {
			store.optimisticUpdate('nonexistent', { status: 'TODO' });
		}).toThrow('Ticket not found: nonexistent');
	});
});

describe('Rollback Flow', () => {
	let store: MockTicketStore;

	beforeEach(() => {
		store = new MockTicketStore();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should rollback to original state', () => {
		const ticket = createTestTicket({ id: '1', status: 'BACKLOG', title: 'Original' });
		store.add(ticket);

		store.optimisticUpdate('1', { status: 'TODO', title: 'Updated' });
		expect(store.get('1')?.status).toBe('TODO');
		expect(store.get('1')?.title).toBe('Updated');

		store.rollback('1');

		expect(store.get('1')?.status).toBe('BACKLOG');
		expect(store.get('1')?.title).toBe('Original');
	});

	it('should clear pending state on rollback', () => {
		const ticket = createTestTicket({ id: '1' });
		store.add(ticket);

		store.optimisticUpdate('1', { status: 'TODO' });
		expect(store.hasPendingUpdate('1')).toBe(true);

		store.rollback('1');

		expect(store.hasPendingUpdate('1')).toBe(false);
	});

	it('should auto-rollback after timeout', () => {
		const ticket = createTestTicket({ id: '1', status: 'BACKLOG' });
		store.add(ticket);

		store.optimisticUpdate('1', { status: 'TODO' });
		expect(store.get('1')?.status).toBe('TODO');

		// Fast-forward past rollback timeout (default 5000ms)
		vi.advanceTimersByTime(5001);

		expect(store.get('1')?.status).toBe('BACKLOG');
		expect(store.hasPendingUpdate('1')).toBe(false);
	});

	it('should return rollback function from optimisticUpdate', () => {
		const ticket = createTestTicket({ id: '1', status: 'BACKLOG' });
		store.add(ticket);

		const rollback = store.optimisticUpdate('1', { status: 'TODO' });
		expect(store.get('1')?.status).toBe('TODO');

		rollback();

		expect(store.get('1')?.status).toBe('BACKLOG');
	});

	it('should notify subscribers on rollback', () => {
		const ticket = createTestTicket({ id: '1', status: 'BACKLOG' });
		store.add(ticket);

		const callback = vi.fn();
		store.subscribe(callback);

		store.optimisticUpdate('1', { status: 'TODO' });
		store.rollback('1');

		// Initial, after add (via set), after update, after rollback
		const lastCall = callback.mock.calls[callback.mock.calls.length - 1][0];
		expect(lastCall[0].status).toBe('BACKLOG');
	});
});

describe('Derived Stores - ticketsByStatus', () => {
	let store: MockTicketStore;
	let ticketsByStatus: ReturnType<typeof createDerivedTicketsByStatus>;

	beforeEach(() => {
		store = new MockTicketStore();
		ticketsByStatus = createDerivedTicketsByStatus(store);
	});

	it('should group tickets by status', () => {
		const tickets = [
			createTestTicket({ id: '1', status: 'BACKLOG' }),
			createTestTicket({ id: '2', status: 'BACKLOG' }),
			createTestTicket({ id: '3', status: 'TODO' }),
			createTestTicket({ id: '4', status: 'IN_PROGRESS' })
		];
		store.set(tickets);

		const grouped = ticketsByStatus.get();

		expect(grouped.get('BACKLOG')).toHaveLength(2);
		expect(grouped.get('TODO')).toHaveLength(1);
		expect(grouped.get('IN_PROGRESS')).toHaveLength(1);
	});

	it('should update when tickets change status', () => {
		const ticket = createTestTicket({ id: '1', status: 'BACKLOG' });
		store.add(ticket);

		expect(ticketsByStatus.get().get('BACKLOG')).toHaveLength(1);
		expect(ticketsByStatus.get().get('TODO')).toBeUndefined();

		store.optimisticUpdate('1', { status: 'TODO' });

		expect(ticketsByStatus.get().get('BACKLOG')).toBeUndefined();
		expect(ticketsByStatus.get().get('TODO')).toHaveLength(1);
	});

	it('should update when tickets are added', () => {
		const ticket1 = createTestTicket({ id: '1', status: 'REVIEW' });
		const ticket2 = createTestTicket({ id: '2', status: 'REVIEW' });

		store.add(ticket1);
		expect(ticketsByStatus.get().get('REVIEW')).toHaveLength(1);

		store.add(ticket2);
		expect(ticketsByStatus.get().get('REVIEW')).toHaveLength(2);
	});

	it('should update when tickets are removed', () => {
		const ticket = createTestTicket({ id: '1', status: 'DONE' });
		store.add(ticket);

		expect(ticketsByStatus.get().get('DONE')).toHaveLength(1);

		store.handleRemoteDelete('1');

		expect(ticketsByStatus.get().get('DONE')).toBeUndefined();
	});

	it('should allow subscribing to derived store', () => {
		const callback = vi.fn();
		ticketsByStatus.subscribe(callback);

		expect(callback).toHaveBeenCalled();

		store.add(createTestTicket({ status: 'CANCELLED' }));

		expect(callback).toHaveBeenCalledTimes(2);
		const lastGrouped = callback.mock.calls[1][0];
		expect(lastGrouped.get('CANCELLED')).toHaveLength(1);
	});
});

describe('Remote Updates', () => {
	let store: MockTicketStore;

	beforeEach(() => {
		store = new MockTicketStore();
	});

	describe('Remote Create', () => {
		it('should add new ticket from remote create', () => {
			const ticket = createTestTicket({ id: 'remote-1' });

			store.handleRemoteCreate(ticket);

			expect(store.get('remote-1')).toEqual(ticket);
		});

		it('should not duplicate existing ticket on remote create', () => {
			const ticket = createTestTicket({ id: 'existing-1', title: 'Original' });
			store.add(ticket);

			const duplicate = createTestTicket({ id: 'existing-1', title: 'Duplicate' });
			store.handleRemoteCreate(duplicate);

			expect(store.get('existing-1')?.title).toBe('Original');
			expect(store.getAll()).toHaveLength(1);
		});

		it('should notify subscribers on remote create', () => {
			const callback = vi.fn();
			store.subscribe(callback);

			store.handleRemoteCreate(createTestTicket());

			expect(callback).toHaveBeenCalledTimes(2);
		});
	});

	describe('Remote Update', () => {
		it('should update ticket from remote update', () => {
			const ticket = createTestTicket({ id: '1', title: 'Old Title' });
			store.add(ticket);

			const updated = { ...ticket, title: 'New Title' };
			store.handleRemoteUpdate(updated);

			expect(store.get('1')?.title).toBe('New Title');
		});

		it('should skip remote update during pending optimistic update', () => {
			vi.useFakeTimers();
			const ticket = createTestTicket({ id: '1', title: 'Original' });
			store.add(ticket);

			// Start optimistic update
			store.optimisticUpdate('1', { title: 'Optimistic' });

			// Remote update comes in
			const remoteUpdate = { ...ticket, title: 'Remote' };
			store.handleRemoteUpdate(remoteUpdate);

			// Should keep optimistic value
			expect(store.get('1')?.title).toBe('Optimistic');

			vi.useRealTimers();
		});

		it('should apply remote update after optimistic update is confirmed', () => {
			const ticket = createTestTicket({ id: '1', title: 'Original' });
			store.add(ticket);

			store.optimisticUpdate('1', { title: 'Optimistic' });
			store.confirmUpdate('1');

			const remoteUpdate = { ...ticket, title: 'Remote' };
			store.handleRemoteUpdate(remoteUpdate);

			expect(store.get('1')?.title).toBe('Remote');
		});
	});

	describe('Remote Delete', () => {
		it('should remove ticket on remote delete', () => {
			const ticket = createTestTicket({ id: '1' });
			store.add(ticket);

			expect(store.getAll()).toHaveLength(1);

			store.handleRemoteDelete('1');

			expect(store.getAll()).toHaveLength(0);
			expect(store.get('1')).toBeUndefined();
		});

		it('should cancel pending optimistic update on remote delete', () => {
			vi.useFakeTimers();
			const ticket = createTestTicket({ id: '1' });
			store.add(ticket);

			store.optimisticUpdate('1', { status: 'TODO' });
			expect(store.hasPendingUpdate('1')).toBe(true);

			store.handleRemoteDelete('1');

			expect(store.hasPendingUpdate('1')).toBe(false);
			expect(store.get('1')).toBeUndefined();

			vi.useRealTimers();
		});

		it('should notify subscribers on remote delete', () => {
			const ticket = createTestTicket({ id: '1' });
			store.add(ticket);

			const callback = vi.fn();
			store.subscribe(callback);

			store.handleRemoteDelete('1');

			const lastCall = callback.mock.calls[callback.mock.calls.length - 1][0];
			expect(lastCall).toHaveLength(0);
		});
	});
});

describe('Store Reset', () => {
	let store: MockTicketStore;

	beforeEach(() => {
		store = new MockTicketStore();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should clear all tickets on reset', () => {
		store.add(createTestTicket({ id: '1' }));
		store.add(createTestTicket({ id: '2' }));

		store.reset();

		expect(store.getAll()).toHaveLength(0);
	});

	it('should clear pending updates on reset', () => {
		const ticket = createTestTicket({ id: '1' });
		store.add(ticket);
		store.optimisticUpdate('1', { status: 'TODO' });

		store.reset();

		expect(store.hasPendingUpdate('1')).toBe(false);
	});

	it('should notify subscribers on reset', () => {
		store.add(createTestTicket());

		const callback = vi.fn();
		store.subscribe(callback);

		store.reset();

		const lastCall = callback.mock.calls[callback.mock.calls.length - 1][0];
		expect(lastCall).toHaveLength(0);
	});
});

describe('Concurrent Operations', () => {
	let store: MockTicketStore;

	beforeEach(() => {
		store = new MockTicketStore();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should handle multiple optimistic updates on different tickets', () => {
		store.add(createTestTicket({ id: '1', status: 'BACKLOG' }));
		store.add(createTestTicket({ id: '2', status: 'BACKLOG' }));

		store.optimisticUpdate('1', { status: 'TODO' });
		store.optimisticUpdate('2', { status: 'IN_PROGRESS' });

		expect(store.get('1')?.status).toBe('TODO');
		expect(store.get('2')?.status).toBe('IN_PROGRESS');
		expect(store.hasPendingUpdate('1')).toBe(true);
		expect(store.hasPendingUpdate('2')).toBe(true);
	});

	it('should handle sequential optimistic updates on same ticket', () => {
		const ticket = createTestTicket({ id: '1', status: 'BACKLOG' });
		store.add(ticket);

		store.optimisticUpdate('1', { status: 'TODO' });
		store.confirmUpdate('1');
		store.optimisticUpdate('1', { status: 'IN_PROGRESS' });

		expect(store.get('1')?.status).toBe('IN_PROGRESS');
		expect(store.hasPendingUpdate('1')).toBe(true);
	});

	it('should handle interleaved remote updates and local updates', () => {
		const ticket = createTestTicket({ id: '1', status: 'BACKLOG', title: 'Original' });
		store.add(ticket);

		// Remote creates ticket 2
		store.handleRemoteCreate(createTestTicket({ id: '2', status: 'TODO' }));

		// Local optimistic update on ticket 1
		store.optimisticUpdate('1', { status: 'TODO' });

		// Remote updates ticket 2
		store.handleRemoteUpdate(createTestTicket({ id: '2', status: 'IN_PROGRESS' }));

		// Confirm local update
		store.confirmUpdate('1');

		expect(store.get('1')?.status).toBe('TODO');
		expect(store.get('2')?.status).toBe('IN_PROGRESS');
	});
});
