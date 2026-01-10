/**
 * GAP-UX.2: Time Travel History Page Server
 *
 * Server-side data loading for the ticket history time travel view.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { timeTravelService } from '$lib/server/time-travel';
import { prisma } from '$lib/server/prisma';

export const load: PageServerLoad = async ({ params }) => {
  const { projectId, ticketId } = params;

  // Verify project exists
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true }
  });

  if (!project) {
    throw error(404, 'Project not found');
  }

  // Get time travel data
  const timeTravelData = await timeTravelService.getTimeTravelData(ticketId);

  if (!timeTravelData) {
    throw error(404, 'Ticket not found');
  }

  // Verify ticket belongs to this project
  if (timeTravelData.projectId !== projectId) {
    throw error(404, 'Ticket not found in this project');
  }

  // Extract decision annotations
  const decisions = timeTravelService.extractDecisionAnnotations(timeTravelData.events);

  // Extract agent recommendations
  const recommendations = timeTravelService.extractAgentRecommendations(timeTravelData.events);

  return {
    project: {
      id: project.id,
      name: project.name
    },
    ticketId: timeTravelData.ticketId,
    ticketTitle: timeTravelData.ticketTitle,
    projectName: timeTravelData.projectName,
    events: timeTravelData.events.map(event => ({
      ...event,
      timestamp: event.timestamp.toISOString(),
      snapshot: event.snapshot ? {
        ...event.snapshot,
        timestamp: event.snapshot.timestamp.toISOString()
      } : null
    })),
    currentSnapshot: timeTravelData.currentSnapshot ? {
      ...timeTravelData.currentSnapshot,
      timestamp: timeTravelData.currentSnapshot.timestamp.toISOString()
    } : null,
    decisions: decisions.map(d => ({
      ...d,
      timestamp: d.timestamp.toISOString()
    })),
    recommendations: recommendations.map(r => ({
      ...r,
      timestamp: r.timestamp.toISOString()
    })),
    totalEvents: timeTravelData.totalEvents,
    firstEventAt: timeTravelData.firstEventAt.toISOString(),
    lastEventAt: timeTravelData.lastEventAt.toISOString()
  };
};
