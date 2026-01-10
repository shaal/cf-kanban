/**
 * Event Publisher - Server-side event publishing for real-time updates
 *
 * TASK-035: Implement live ticket status updates
 *
 * Features:
 * - Redis pub/sub for event distribution
 * - Event types for ticket lifecycle (created, updated, deleted, moved)
 * - Project-scoped event channels
 * - Fallback to in-memory events when Redis unavailable
 */

import type { Ticket } from '$lib/types';

/** Event types for ticket changes */
export type TicketEventType = 'created' | 'updated' | 'deleted' | 'moved';

/** Base event interface */
export interface TicketEvent {
  type: TicketEventType;
  projectId: string;
  ticketId: string;
  timestamp: number;
}

/** Ticket created event */
export interface TicketCreatedEvent extends TicketEvent {
  type: 'created';
  ticket: Ticket;
}

/** Ticket updated event */
export interface TicketUpdatedEvent extends TicketEvent {
  type: 'updated';
  changes: Partial<Ticket>;
  previousValues?: Partial<Ticket>;
}

/** Ticket deleted event */
export interface TicketDeletedEvent extends TicketEvent {
  type: 'deleted';
}

/** Ticket moved event (status/position change) */
export interface TicketMovedEvent extends TicketEvent {
  type: 'moved';
  fromStatus: string;
  toStatus: string;
  newPosition: number;
  version: number;
}

/** Union type for all ticket events */
export type AnyTicketEvent =
  | TicketCreatedEvent
  | TicketUpdatedEvent
  | TicketDeletedEvent
  | TicketMovedEvent;

/** Event listeners for in-memory fallback */
type EventListener = (event: AnyTicketEvent) => void;
const eventListeners: Set<EventListener> = new Set();

/** Redis client placeholder - will be initialized when Redis is available */
let redisPublisher: unknown | null = null;
let redisEnabled = false;

/** Version counter for conflict resolution */
const versionCounters: Map<string, number> = new Map();

/**
 * Get the next version number for a ticket
 */
export function getNextVersion(ticketId: string): number {
  const current = versionCounters.get(ticketId) || 0;
  const next = current + 1;
  versionCounters.set(ticketId, next);
  return next;
}

/**
 * Initialize Redis publisher (optional)
 * Call this if Redis is available in the environment
 */
export async function initRedisPublisher(redisUrl?: string): Promise<boolean> {
  if (!redisUrl) {
    console.log('[Events] Redis URL not provided, using in-memory events');
    return false;
  }

  try {
    // Dynamic import to avoid bundling Redis if not used
    // This only runs at runtime on the server, not during static analysis
    const redis = await eval('import("redis")');
    const { createClient } = redis;
    redisPublisher = createClient({ url: redisUrl });
    await (redisPublisher as any).connect();
    redisEnabled = true;
    console.log('[Events] Redis publisher initialized');
    return true;
  } catch (error) {
    console.warn('[Events] Failed to initialize Redis, using in-memory events:', error);
    return false;
  }
}

/**
 * Publish an event to Redis or in-memory listeners
 */
async function publishEvent(event: AnyTicketEvent): Promise<void> {
  const channel = `project:${event.projectId}:tickets`;

  if (redisEnabled && redisPublisher) {
    try {
      await (redisPublisher as any).publish(channel, JSON.stringify(event));
    } catch (error) {
      console.error('[Events] Failed to publish to Redis:', error);
      // Fallback to in-memory
      notifyListeners(event);
    }
  } else {
    // In-memory fallback
    notifyListeners(event);
  }
}

/**
 * Notify in-memory listeners
 */
function notifyListeners(event: AnyTicketEvent): void {
  eventListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.error('[Events] Listener error:', error);
    }
  });
}

/**
 * Subscribe to events (in-memory only, for testing or single-instance setups)
 */
export function subscribeToEvents(listener: EventListener): () => void {
  eventListeners.add(listener);
  return () => eventListeners.delete(listener);
}

/**
 * Publish a ticket created event
 */
export async function publishTicketCreated(
  projectId: string,
  ticket: Ticket
): Promise<void> {
  const event: TicketCreatedEvent = {
    type: 'created',
    projectId,
    ticketId: ticket.id,
    timestamp: Date.now(),
    ticket
  };
  await publishEvent(event);
}

/**
 * Publish a ticket updated event
 */
export async function publishTicketUpdated(
  projectId: string,
  ticketId: string,
  changes: Partial<Ticket>,
  previousValues?: Partial<Ticket>
): Promise<void> {
  const event: TicketUpdatedEvent = {
    type: 'updated',
    projectId,
    ticketId,
    timestamp: Date.now(),
    changes,
    previousValues
  };
  await publishEvent(event);
}

/**
 * Publish a ticket deleted event
 */
export async function publishTicketDeleted(
  projectId: string,
  ticketId: string
): Promise<void> {
  const event: TicketDeletedEvent = {
    type: 'deleted',
    projectId,
    ticketId,
    timestamp: Date.now()
  };
  await publishEvent(event);
}

/**
 * Publish a ticket moved event (status/position change)
 */
export async function publishTicketMoved(
  projectId: string,
  ticketId: string,
  fromStatus: string,
  toStatus: string,
  newPosition: number
): Promise<void> {
  const version = getNextVersion(ticketId);

  const event: TicketMovedEvent = {
    type: 'moved',
    projectId,
    ticketId,
    timestamp: Date.now(),
    fromStatus,
    toStatus,
    newPosition,
    version
  };
  await publishEvent(event);
}

/**
 * Get Redis connection status
 */
export function isRedisConnected(): boolean {
  return redisEnabled;
}

/**
 * Close Redis connection (for cleanup)
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisPublisher) {
    try {
      await (redisPublisher as any).quit();
    } catch (error) {
      console.error('[Events] Error closing Redis connection:', error);
    }
    redisPublisher = null;
    redisEnabled = false;
  }
}
