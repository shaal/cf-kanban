/**
 * Optimistic Updates Store - Track pending operations with rollback support
 *
 * TASK-037: Implement optimistic UI updates
 *
 * Features:
 * - Track pending operations with unique IDs
 * - Store previous state for rollback capability
 * - Support create, update, delete, move operation types
 * - Query pending operations by ticket ID
 */

import { writable, derived, get } from 'svelte/store';

/** Types of operations that can be tracked */
export type OperationType = 'create' | 'update' | 'delete' | 'move';

/** A pending operation with its state for rollback */
export interface PendingOperation {
  /** Unique operation ID */
  id: string;
  /** Type of operation */
  type: OperationType;
  /** Affected ticket ID */
  ticketId: string;
  /** State before the operation (null for create) */
  previousState: Record<string, unknown> | null;
  /** State after the operation (null for delete) */
  newState: Record<string, unknown> | null;
  /** Timestamp when operation was initiated */
  timestamp: number;
}

/** Input for adding a new pending operation */
export interface AddOperationInput {
  type: OperationType;
  ticketId: string;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
}

/** Result of a rollback operation */
export interface RollbackResult {
  ticketId: string;
  state: Record<string, unknown> | null;
}

/** Store for pending operations */
export const pendingOperations = writable<PendingOperation[]>([]);

/** Counter for generating unique operation IDs */
let operationCounter = 0;

/**
 * Generate a unique operation ID
 */
function generateOperationId(): string {
  operationCounter += 1;
  return `op-${Date.now()}-${operationCounter}`;
}

/**
 * Add a new pending operation
 * @param input - Operation details
 * @returns Generated operation ID
 */
export function addPendingOperation(input: AddOperationInput): string {
  const id = generateOperationId();
  const operation: PendingOperation = {
    id,
    type: input.type,
    ticketId: input.ticketId,
    previousState: input.previousState,
    newState: input.newState,
    timestamp: Date.now()
  };

  pendingOperations.update((current) => [...current, operation]);

  return id;
}

/**
 * Remove a pending operation by ID
 * @param operationId - ID of operation to remove
 */
export function removePendingOperation(operationId: string): void {
  pendingOperations.update((current) =>
    current.filter((op) => op.id !== operationId)
  );
}

/**
 * Rollback an operation and return the previous state
 * @param operationId - ID of operation to rollback
 * @returns Rollback result with previous state, or null if not found
 */
export function rollbackOperation(operationId: string): RollbackResult | null {
  const operations = get(pendingOperations);
  const operation = operations.find((op) => op.id === operationId);

  if (!operation) {
    return null;
  }

  // Remove the operation
  removePendingOperation(operationId);

  return {
    ticketId: operation.ticketId,
    state: operation.previousState
  };
}

/**
 * Derived store: whether there are any pending operations
 */
export const hasPending = derived(
  pendingOperations,
  ($operations) => $operations.length > 0
);

/**
 * Get all pending operations for a specific ticket
 * @param ticketId - Ticket ID to filter by
 * @returns Array of pending operations for that ticket
 */
export function getPendingForTicket(ticketId: string): PendingOperation[] {
  return get(pendingOperations).filter((op) => op.ticketId === ticketId);
}

/**
 * Clear all pending operations
 */
export function clearPendingOperations(): void {
  pendingOperations.set([]);
}

/**
 * Get operation by ID
 * @param operationId - Operation ID to find
 * @returns Operation or undefined
 */
export function getOperation(operationId: string): PendingOperation | undefined {
  return get(pendingOperations).find((op) => op.id === operationId);
}

/**
 * Mark an operation as confirmed (server acknowledged)
 * This removes it from pending without triggering rollback
 * @param operationId - ID of operation to confirm
 */
export function confirmOperation(operationId: string): void {
  removePendingOperation(operationId);
}

/**
 * Get the most recent operation for a ticket
 * @param ticketId - Ticket ID to check
 * @returns Most recent operation or undefined
 */
export function getLatestOperationForTicket(ticketId: string): PendingOperation | undefined {
  const ticketOps = getPendingForTicket(ticketId);
  if (ticketOps.length === 0) return undefined;
  return ticketOps.reduce((latest, op) =>
    op.timestamp > latest.timestamp ? op : latest
  );
}
