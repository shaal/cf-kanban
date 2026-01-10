import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { ticketStateMachine } from '$lib/state-machine/ticket-state-machine';
import type { TicketState } from '$lib/state-machine/types';
import { TICKET_STATES } from '$lib/state-machine/types';
import { publishTicketMoved } from '$lib/server/events';

/**
 * GAP-3.2.4: States that can progress regardless of dependency status
 * (backwards transitions, cancellation, or non-progress states)
 */
const BYPASS_DEPENDENCY_CHECK_STATES: TicketState[] = [
	'BACKLOG',
	'CANCELLED',
	'NEEDS_FEEDBACK'
];

/**
 * GAP-3.2.4: States that indicate "progress" and require dependencies to be complete
 */
const PROGRESS_STATES: TicketState[] = [
	'TODO',
	'IN_PROGRESS',
	'REVIEW',
	'DONE'
];

/**
 * POST /api/tickets/:id/transition
 * Transition a ticket to a new state
 *
 * TASK-035: Publishes ticket moved events via Redis pub/sub
 * GAP-3.2.4: Blocks transitions if dependencies are incomplete
 */
export const POST: RequestHandler = async ({ params, request }) => {
	const { id } = params;

	try {
		const body = await request.json();
		const { toState, triggeredBy, reason } = body;

		// Validate toState
		if (!toState || !TICKET_STATES.includes(toState)) {
			return json(
				{ error: 'Invalid state. Must be one of: BACKLOG, TODO, IN_PROGRESS, NEEDS_FEEDBACK, READY_TO_RESUME, REVIEW, DONE, CANCELLED' },
				{ status: 400 }
			);
		}

		// Get current ticket
		const ticket = await prisma.ticket.findUnique({ where: { id } });

		if (!ticket) {
			throw error(404, 'Ticket not found');
		}

		const currentState = ticket.status as TicketState;
		const newState = toState as TicketState;

		// Check if transition is valid
		if (!ticketStateMachine.canTransition(currentState, newState)) {
			return json(
				{
					error: 'Invalid transition from ' + currentState + ' to ' + newState,
					message: 'Cannot transition ticket from ' + currentState + ' to ' + newState
				},
				{ status: 400 }
			);
		}

		// GAP-3.2.4: Check for blocking dependencies when transitioning to progress states
		if (
			PROGRESS_STATES.includes(newState) &&
			!BYPASS_DEPENDENCY_CHECK_STATES.includes(newState) &&
			ticket.dependencyIds &&
			ticket.dependencyIds.length > 0
		) {
			// Check if all dependencies are completed (DONE status)
			const incompleteDependencies = await prisma.ticket.findMany({
				where: {
					id: { in: ticket.dependencyIds },
					status: { not: 'DONE' }
				},
				select: { id: true, title: true, status: true }
			});

			if (incompleteDependencies.length > 0) {
				const depNames = incompleteDependencies
					.map(d => `"${d.title}" (${d.status})`)
					.join(', ');
				return json(
					{
						error: 'Blocked by incomplete dependencies',
						message: `This ticket is blocked by ${incompleteDependencies.length} incomplete ${incompleteDependencies.length === 1 ? 'dependency' : 'dependencies'}: ${depNames}`,
						blockedBy: incompleteDependencies
					},
					{ status: 400 }
				);
			}
		}

		// Perform the transition
		const updatedTicket = await ticketStateMachine.transition(id, newState, {
			triggeredBy: triggeredBy || 'system',
			reason
		});

		// TASK-035: Publish ticket moved event for real-time sync
		await publishTicketMoved(
			ticket.projectId,
			id,
			currentState,
			newState,
			updatedTicket.position
		);

		return json({
			ticket: updatedTicket,
			transition: {
				from: currentState,
				to: newState
			}
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error transitioning ticket:', err);
		return json({ error: 'Failed to transition ticket' }, { status: 500 });
	}
};
