/**
 * GAP-UX.2: Time Travel API Endpoint
 *
 * Provides time travel data for a specific ticket, including
 * timeline events, snapshots, and decision annotations.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { timeTravelService } from '$lib/server/time-travel';

/**
 * GET /api/tickets/[id]/time-travel
 *
 * Returns complete time travel data for a ticket including:
 * - Timeline events
 * - Current snapshot
 * - Decision annotations
 * - Agent recommendations
 */
export const GET: RequestHandler = async ({ params }) => {
  const { id } = params;

  if (!id) {
    throw error(400, 'Ticket ID is required');
  }

  try {
    const data = await timeTravelService.getTimeTravelData(id);

    if (!data) {
      throw error(404, 'Ticket not found');
    }

    // Extract decision annotations
    const decisions = timeTravelService.extractDecisionAnnotations(data.events);

    // Extract agent recommendations
    const recommendations = timeTravelService.extractAgentRecommendations(data.events);

    return json({
      success: true,
      data: {
        ...data,
        decisions,
        recommendations
      }
    });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }

    console.error('Error fetching time travel data:', err);
    throw error(500, 'Failed to fetch time travel data');
  }
};

/**
 * GET /api/tickets/[id]/time-travel?snapshot=INDEX
 *
 * Returns snapshot at a specific event index
 */
export const POST: RequestHandler = async ({ params, request }) => {
  const { id } = params;

  if (!id) {
    throw error(400, 'Ticket ID is required');
  }

  try {
    const body = await request.json();
    const { eventIndex } = body;

    if (typeof eventIndex !== 'number' || eventIndex < 0) {
      throw error(400, 'Valid event index is required');
    }

    const snapshot = await timeTravelService.getSnapshotAtEvent(id, eventIndex);

    if (!snapshot) {
      throw error(404, 'Snapshot not found for the specified event');
    }

    return json({
      success: true,
      data: { snapshot }
    });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }

    console.error('Error fetching snapshot:', err);
    throw error(500, 'Failed to fetch snapshot');
  }
};
