/**
 * TASK-035: Event Publisher Tests
 *
 * Tests for the server-side event publishing system.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Event Publisher', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('getNextVersion', () => {
    it('should return 1 for first version', async () => {
      const { getNextVersion } = await import('$lib/server/events');
      const version = getNextVersion('new-ticket-id');
      expect(version).toBe(1);
    });

    it('should increment version for same ticket', async () => {
      const { getNextVersion } = await import('$lib/server/events');

      const v1 = getNextVersion('ticket-1');
      const v2 = getNextVersion('ticket-1');
      const v3 = getNextVersion('ticket-1');

      expect(v1).toBe(1);
      expect(v2).toBe(2);
      expect(v3).toBe(3);
    });

    it('should track versions independently per ticket', async () => {
      const { getNextVersion } = await import('$lib/server/events');

      getNextVersion('ticket-a');
      getNextVersion('ticket-a');

      const versionB = getNextVersion('ticket-b');

      expect(versionB).toBe(1);
    });
  });

  describe('subscribeToEvents (in-memory)', () => {
    it('should receive events when subscribed', async () => {
      const { subscribeToEvents, publishTicketCreated } = await import('$lib/server/events');
      const receivedEvents: unknown[] = [];

      subscribeToEvents((event) => {
        receivedEvents.push(event);
      });

      const mockTicket = {
        id: 'ticket-1',
        title: 'Test Ticket',
        status: 'BACKLOG' as const,
        priority: 'MEDIUM' as const,
        labels: [],
        position: 0,
        projectId: 'project-1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await publishTicketCreated('project-1', mockTicket);

      expect(receivedEvents).toHaveLength(1);
      expect((receivedEvents[0] as any).type).toBe('created');
      expect((receivedEvents[0] as any).ticket.id).toBe('ticket-1');
    });

    it('should stop receiving events after unsubscribe', async () => {
      const { subscribeToEvents, publishTicketDeleted } = await import('$lib/server/events');
      const receivedEvents: unknown[] = [];

      const unsubscribe = subscribeToEvents((event) => {
        receivedEvents.push(event);
      });

      await publishTicketDeleted('project-1', 'ticket-1');
      expect(receivedEvents).toHaveLength(1);

      unsubscribe();
      await publishTicketDeleted('project-1', 'ticket-2');
      expect(receivedEvents).toHaveLength(1); // Still 1, not 2
    });
  });

  describe('publishTicketCreated', () => {
    it('should publish created event with correct structure', async () => {
      const { subscribeToEvents, publishTicketCreated } = await import('$lib/server/events');
      let receivedEvent: any = null;

      subscribeToEvents((event) => {
        receivedEvent = event;
      });

      const mockTicket = {
        id: 'ticket-1',
        title: 'New Feature',
        status: 'BACKLOG' as const,
        priority: 'HIGH' as const,
        labels: ['feature'],
        position: 5,
        projectId: 'project-1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await publishTicketCreated('project-1', mockTicket);

      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent.type).toBe('created');
      expect(receivedEvent.projectId).toBe('project-1');
      expect(receivedEvent.ticketId).toBe('ticket-1');
      expect(receivedEvent.ticket).toEqual(mockTicket);
      expect(typeof receivedEvent.timestamp).toBe('number');
    });
  });

  describe('publishTicketUpdated', () => {
    it('should publish updated event with changes and previous values', async () => {
      const { subscribeToEvents, publishTicketUpdated } = await import('$lib/server/events');
      let receivedEvent: any = null;

      subscribeToEvents((event) => {
        receivedEvent = event;
      });

      await publishTicketUpdated(
        'project-1',
        'ticket-1',
        { title: 'New Title', priority: 'HIGH' },
        { title: 'Old Title', priority: 'MEDIUM' }
      );

      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent.type).toBe('updated');
      expect(receivedEvent.projectId).toBe('project-1');
      expect(receivedEvent.ticketId).toBe('ticket-1');
      expect(receivedEvent.changes).toEqual({ title: 'New Title', priority: 'HIGH' });
      expect(receivedEvent.previousValues).toEqual({ title: 'Old Title', priority: 'MEDIUM' });
    });
  });

  describe('publishTicketDeleted', () => {
    it('should publish deleted event with correct structure', async () => {
      const { subscribeToEvents, publishTicketDeleted } = await import('$lib/server/events');
      let receivedEvent: any = null;

      subscribeToEvents((event) => {
        receivedEvent = event;
      });

      await publishTicketDeleted('project-1', 'ticket-to-delete');

      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent.type).toBe('deleted');
      expect(receivedEvent.projectId).toBe('project-1');
      expect(receivedEvent.ticketId).toBe('ticket-to-delete');
    });
  });

  describe('publishTicketMoved', () => {
    it('should publish moved event with version', async () => {
      const { subscribeToEvents, publishTicketMoved } = await import('$lib/server/events');
      let receivedEvent: any = null;

      subscribeToEvents((event) => {
        receivedEvent = event;
      });

      await publishTicketMoved(
        'project-1',
        'ticket-1',
        'BACKLOG',
        'TODO',
        3
      );

      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent.type).toBe('moved');
      expect(receivedEvent.projectId).toBe('project-1');
      expect(receivedEvent.ticketId).toBe('ticket-1');
      expect(receivedEvent.fromStatus).toBe('BACKLOG');
      expect(receivedEvent.toStatus).toBe('TODO');
      expect(receivedEvent.newPosition).toBe(3);
      expect(receivedEvent.version).toBeGreaterThan(0);
    });

    it('should increment version for each move', async () => {
      const { subscribeToEvents, publishTicketMoved } = await import('$lib/server/events');
      const versions: number[] = [];

      subscribeToEvents((event) => {
        if (event.type === 'moved') {
          versions.push((event as any).version);
        }
      });

      await publishTicketMoved('p1', 't1', 'BACKLOG', 'TODO', 0);
      await publishTicketMoved('p1', 't1', 'TODO', 'IN_PROGRESS', 0);
      await publishTicketMoved('p1', 't1', 'IN_PROGRESS', 'REVIEW', 0);

      expect(versions[1]).toBeGreaterThan(versions[0]);
      expect(versions[2]).toBeGreaterThan(versions[1]);
    });
  });

  describe('isRedisConnected', () => {
    it('should return false when Redis is not initialized', async () => {
      const { isRedisConnected } = await import('$lib/server/events');
      expect(isRedisConnected()).toBe(false);
    });
  });
});
