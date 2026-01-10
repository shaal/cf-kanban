/**
 * GAP-3.2.3: Time Estimates Store
 *
 * Client-side store for managing time estimates for tickets.
 * Caches estimates to avoid repeated API calls and provides
 * reactive updates for UI components.
 */

import { writable, derived, get } from 'svelte/store';

/**
 * Time estimate data structure matching server response
 */
export interface TimeEstimate {
  /** Estimated hours to complete */
  hours: number;
  /** Confidence in the estimate (0-1) */
  confidence: number;
  /** Min/max range for estimate */
  range: { min: number; max: number };
  /** Basis for the estimate */
  basedOn: 'complexity' | 'historical' | 'hybrid';
  /** Formatted display string */
  formatted: string;
  /** Formatted range string */
  formattedRange: string;
  /** Timestamp when estimate was fetched */
  fetchedAt: number;
}

/**
 * Cache entry with loading state
 */
interface EstimateEntry {
  estimate: TimeEstimate | null;
  loading: boolean;
  error: string | null;
}

/** Store for all ticket time estimates */
const estimatesStore = writable<Record<string, EstimateEntry>>({});

/** Cache duration in milliseconds (5 minutes) */
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * Fetch time estimate for a ticket from API
 */
async function fetchEstimate(ticketId: string): Promise<TimeEstimate> {
  const response = await fetch(`/api/tickets/${ticketId}/time-estimate`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch estimate' }));
    throw new Error(error.error || 'Failed to fetch time estimate');
  }

  return response.json();
}

/**
 * Get or fetch time estimate for a ticket
 *
 * @param ticketId - Ticket ID to get estimate for
 * @param forceRefresh - Force refresh even if cached
 * @returns Promise resolving to time estimate
 */
export async function getTimeEstimate(
  ticketId: string,
  forceRefresh = false
): Promise<TimeEstimate | null> {
  const current = get(estimatesStore)[ticketId];

  // Return cached if valid and not forcing refresh
  if (
    !forceRefresh &&
    current?.estimate &&
    Date.now() - current.estimate.fetchedAt < CACHE_DURATION
  ) {
    return current.estimate;
  }

  // Set loading state
  estimatesStore.update(store => ({
    ...store,
    [ticketId]: { ...store[ticketId], loading: true, error: null }
  }));

  try {
    const estimate = await fetchEstimate(ticketId);
    const enrichedEstimate: TimeEstimate = {
      ...estimate,
      fetchedAt: Date.now()
    };

    estimatesStore.update(store => ({
      ...store,
      [ticketId]: { estimate: enrichedEstimate, loading: false, error: null }
    }));

    return enrichedEstimate;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    estimatesStore.update(store => ({
      ...store,
      [ticketId]: { ...store[ticketId], loading: false, error: errorMessage }
    }));

    return null;
  }
}

/**
 * Get a derived store for a specific ticket's time estimate
 *
 * @param ticketId - Ticket ID to watch
 * @returns Derived store with estimate data
 */
export function getTicketTimeEstimate(ticketId: string) {
  return derived(estimatesStore, $store => {
    const entry = $store[ticketId];
    return {
      estimate: entry?.estimate || null,
      loading: entry?.loading || false,
      error: entry?.error || null
    };
  });
}

/**
 * Prefetch estimates for multiple tickets
 *
 * @param ticketIds - Array of ticket IDs to prefetch
 */
export async function prefetchEstimates(ticketIds: string[]): Promise<void> {
  const current = get(estimatesStore);

  // Filter to only tickets that need fetching
  const toFetch = ticketIds.filter(id => {
    const entry = current[id];
    if (!entry?.estimate) return true;
    return Date.now() - entry.estimate.fetchedAt >= CACHE_DURATION;
  });

  // Fetch in parallel
  await Promise.allSettled(toFetch.map(id => getTimeEstimate(id)));
}

/**
 * Clear estimate cache for a ticket (e.g., after status change)
 *
 * @param ticketId - Ticket ID to clear
 */
export function clearEstimate(ticketId: string): void {
  estimatesStore.update(store => {
    const { [ticketId]: _, ...rest } = store;
    return rest;
  });
}

/**
 * Clear all cached estimates
 */
export function clearAllEstimates(): void {
  estimatesStore.set({});
}

/**
 * Update estimate after ticket completion
 * Used when a ticket moves to DONE to record actual time
 *
 * @param ticketId - Ticket ID that was completed
 * @param actualHours - Actual hours taken
 */
export function recordCompletion(ticketId: string, actualHours: number): void {
  // Clear the estimate for this ticket since it's done
  clearEstimate(ticketId);

  // The actual time will be stored server-side via the workflow
  // This just ensures the UI updates properly
}

/**
 * Format hours into human-readable string (client-side utility)
 */
export function formatDuration(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}m`;
  }

  if (hours < 8) {
    return `${hours.toFixed(1)}h`;
  }

  const days = hours / 8; // 8-hour workday
  if (days < 5) {
    return `${days.toFixed(1)}d`;
  }

  const weeks = days / 5; // 5-day workweek
  return `${weeks.toFixed(1)}w`;
}

/**
 * Get confidence level label
 */
export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.6) return 'Medium';
  if (confidence >= 0.4) return 'Low';
  return 'Very Low';
}

/**
 * Get confidence color class
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-green-600';
  if (confidence >= 0.6) return 'text-blue-600';
  if (confidence >= 0.4) return 'text-yellow-600';
  return 'text-gray-500';
}
