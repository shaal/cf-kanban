import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { ticketStateMachine } from '$lib/state-machine/ticket-state-machine';
import type { TicketState } from '$lib/state-machine/types';
import { TICKET_STATES } from '$lib/state-machine/types';

/**
 * POST /api/tickets/:id/transition
 * Transition a ticket to a new state
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

		// Perform the transition
		const updatedTicket = await ticketStateMachine.transition(id, newState, {
			triggeredBy: triggeredBy || 'system',
			reason
		});

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
