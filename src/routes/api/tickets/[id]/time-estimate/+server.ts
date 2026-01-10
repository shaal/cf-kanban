import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { estimateCompletionTime, formatDuration, formatRange } from '$lib/server/analysis/time-estimation';

/**
 * GET /api/tickets/:id/time-estimate
 *
 * GAP-3.2.3: Get estimated completion time for a ticket
 *
 * Returns time estimate based on:
 * - Ticket complexity
 * - Ticket type (derived from labels)
 * - Historical data from similar completed tickets
 */
export const GET: RequestHandler = async ({ params }) => {
  const { id } = params;

  try {
    // Fetch ticket with its labels
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        labels: true,
        complexity: true,
        status: true,
        projectId: true,
        createdAt: true
      }
    });

    if (!ticket) {
      throw error(404, 'Ticket not found');
    }

    // For DONE or CANCELLED tickets, return actual duration instead of estimate
    if (ticket.status === 'DONE' || ticket.status === 'CANCELLED') {
      const actualDuration = await getActualDuration(id);
      if (actualDuration !== null) {
        return json({
          hours: actualDuration,
          confidence: 1.0,
          range: { min: actualDuration, max: actualDuration },
          basedOn: 'actual' as const,
          formatted: formatDuration(actualDuration),
          formattedRange: formatDuration(actualDuration),
          isActual: true
        });
      }
    }

    // Derive ticket type from labels
    const ticketType = deriveTicketType(ticket.labels);

    // Use complexity if available, otherwise default to 5 (medium)
    const complexity = ticket.complexity ?? 5;

    // Get estimate from the time estimation service
    const estimate = await estimateCompletionTime(
      complexity,
      ticketType,
      ticket.labels,
      ticket.projectId
    );

    return json({
      hours: estimate.hours,
      confidence: estimate.confidence,
      range: estimate.range,
      basedOn: estimate.basedOn,
      formatted: formatDuration(estimate.hours),
      formattedRange: formatRange(estimate.range),
      notes: estimate.notes,
      isActual: false
    });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error getting time estimate:', err);
    return json({ error: 'Failed to get time estimate' }, { status: 500 });
  }
};

/**
 * Derive ticket type from labels
 *
 * Looks for common type-indicating labels
 */
function deriveTicketType(labels: string[]): string {
  const labelLower = labels.map(l => l.toLowerCase());

  if (labelLower.some(l => l.includes('bug') || l.includes('fix'))) {
    return 'bug';
  }
  if (labelLower.some(l => l.includes('feature') || l.includes('feat'))) {
    return 'feature';
  }
  if (labelLower.some(l => l.includes('refactor'))) {
    return 'refactor';
  }
  if (labelLower.some(l => l.includes('doc') || l.includes('documentation'))) {
    return 'docs';
  }
  if (labelLower.some(l => l.includes('test'))) {
    return 'test';
  }
  if (labelLower.some(l => l.includes('chore') || l.includes('maintenance'))) {
    return 'chore';
  }

  // Default to feature for new work
  return 'feature';
}

/**
 * Get actual duration for a completed ticket
 *
 * Calculates time between IN_PROGRESS and DONE transitions
 */
async function getActualDuration(ticketId: string): Promise<number | null> {
  try {
    const history = await prisma.ticketHistory.findMany({
      where: {
        ticketId,
        OR: [
          { toStatus: 'IN_PROGRESS' },
          { toStatus: 'DONE' }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });

    const startEvent = history.find(h => h.toStatus === 'IN_PROGRESS');
    const endEvent = history.find(h => h.toStatus === 'DONE');

    if (startEvent && endEvent) {
      const durationMs = endEvent.createdAt.getTime() - startEvent.createdAt.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);

      // Return null for unrealistic durations
      if (durationHours < 0.01 || durationHours > 2000) {
        return null;
      }

      return Math.round(durationHours * 100) / 100;
    }

    return null;
  } catch {
    return null;
  }
}
