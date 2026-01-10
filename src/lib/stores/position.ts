/**
 * Position Store - Real-time ticket position synchronization
 *
 * TASK-036: Add real-time ticket position sync
 *
 * Features:
 * - Track position versions per ticket for conflict resolution
 * - Version-based conflict resolution (higher version wins)
 * - Bulk position updates for columns
 * - Position reordering utilities
 */

import { writable, get } from 'svelte/store';

/** Position version tracking: ticketId -> version number */
export const positionVersions = writable<Record<string, number>>({});

/**
 * Get the current position version for a ticket
 * @param ticketId - Ticket ID to check
 * @returns Current version number (0 if not tracked)
 */
export function getPositionVersion(ticketId: string): number {
  const versions = get(positionVersions);
  return versions[ticketId] ?? 0;
}

/**
 * Set the position version for a ticket
 * @param ticketId - Ticket ID to update
 * @param version - New version number
 */
export function setPositionVersion(ticketId: string, version: number): void {
  positionVersions.update((current) => ({
    ...current,
    [ticketId]: version
  }));
}

/** Result of position conflict resolution */
export interface ConflictResolutionResult {
  /** Whether the update was accepted */
  accepted: boolean;
  /** The final position to use (if accepted) */
  finalPosition?: number;
  /** The winning version number */
  winningVersion?: number;
}

/**
 * Resolve a position conflict using version-based resolution
 * Higher version wins. If versions are equal or local is higher, reject.
 *
 * @param ticketId - Ticket ID being updated
 * @param serverVersion - Version from the server update
 * @param serverPosition - Position from the server update
 * @returns Resolution result
 */
export function resolvePositionConflict(
  ticketId: string,
  serverVersion: number,
  serverPosition: number
): ConflictResolutionResult {
  const localVersion = getPositionVersion(ticketId);

  // Server version is higher - accept the update
  if (serverVersion > localVersion) {
    setPositionVersion(ticketId, serverVersion);
    return {
      accepted: true,
      finalPosition: serverPosition,
      winningVersion: serverVersion
    };
  }

  // Local version is higher or equal - reject the update
  return {
    accepted: false,
    winningVersion: localVersion
  };
}

/** Position update for a single ticket */
export interface PositionUpdate {
  ticketId: string;
  position: number;
  version: number;
}

/**
 * Update positions for all tickets in a column
 * @param positions - Array of position updates
 */
export function updatePositionsForColumn(positions: PositionUpdate[]): void {
  positionVersions.update((current) => {
    const updated = { ...current };
    for (const { ticketId, version } of positions) {
      // Only update if server version is higher
      if (!updated[ticketId] || version > updated[ticketId]) {
        updated[ticketId] = version;
      }
    }
    return updated;
  });
}

/**
 * Clear all position versions (e.g., when leaving a project)
 */
export function clearPositions(): void {
  positionVersions.set({});
}

/**
 * Get the next available position in a column
 * @param ticketsInColumn - Array of tickets with position property
 * @returns Next position number
 */
export function getNextPosition(ticketsInColumn: { position: number }[]): number {
  if (ticketsInColumn.length === 0) {
    return 0;
  }
  return Math.max(...ticketsInColumn.map((t) => t.position)) + 1;
}

/** Reordered position result */
export interface ReorderedPosition {
  ticketId: string;
  position: number;
}

/**
 * Reorder positions for a list of ticket IDs
 * @param ticketIds - Ordered array of ticket IDs
 * @param version - Version number to set for all positions
 * @returns Array of reordered positions
 */
export function reorderPositions(ticketIds: string[], version: number): ReorderedPosition[] {
  const result: ReorderedPosition[] = [];

  positionVersions.update((current) => {
    const updated = { ...current };
    ticketIds.forEach((ticketId, index) => {
      result.push({ ticketId, position: index });
      updated[ticketId] = version;
    });
    return updated;
  });

  return result;
}

/**
 * Calculate new positions when inserting a ticket at a specific index
 * @param ticketIds - Current ordered ticket IDs in the column
 * @param insertId - Ticket ID to insert
 * @param insertIndex - Index to insert at
 * @param version - Version number for the update
 * @returns Array of all affected position updates
 */
export function calculateInsertPositions(
  ticketIds: string[],
  insertId: string,
  insertIndex: number,
  version: number
): ReorderedPosition[] {
  // Remove the ticket if it already exists in the list
  const filteredIds = ticketIds.filter((id) => id !== insertId);

  // Insert at the new position
  filteredIds.splice(insertIndex, 0, insertId);

  return reorderPositions(filteredIds, version);
}
