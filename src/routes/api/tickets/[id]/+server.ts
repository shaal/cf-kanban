import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

/**
 * GET /api/tickets/:id
 * Get a single ticket with its history
 */
export const GET: RequestHandler = async ({ params }) => {
	const ticket = await prisma.ticket.findUnique({
		where: { id: params.id },
		include: {
			history: {
				orderBy: { createdAt: 'desc' }
			}
		}
	});

	if (!ticket) {
		throw error(404, 'Ticket not found');
	}

	return json(ticket);
};

/**
 * PUT /api/tickets/:id
 * Update a ticket's fields (except status - use transition endpoint)
 */
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		// Check if ticket exists
		const existingTicket = await prisma.ticket.findUnique({
			where: { id: params.id }
		});

		if (!existingTicket) {
			throw error(404, 'Ticket not found');
		}

		const body = await request.json();
		const { title, description, priority, labels, complexity, position } = body;

		// Build update data
		const updateData: Record<string, unknown> = {};

		if (title !== undefined) {
			if (typeof title !== 'string' || title.trim().length === 0) {
				return json(
					{ error: 'Title must be a non-empty string' },
					{ status: 400 }
				);
			}
			updateData.title = title.trim();
		}

		if (description !== undefined) {
			updateData.description = description?.trim() || null;
		}

		if (priority !== undefined) {
			const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
			if (!validPriorities.includes(priority)) {
				return json(
					{ error: `Priority must be one of: ${validPriorities.join(', ')}` },
					{ status: 400 }
				);
			}
			updateData.priority = priority;
		}

		if (labels !== undefined) {
			if (!Array.isArray(labels)) {
				return json({ error: 'Labels must be an array' }, { status: 400 });
			}
			updateData.labels = labels;
		}

		if (complexity !== undefined) {
			if (typeof complexity !== 'number' || complexity < 0) {
				return json(
					{ error: 'Complexity must be a non-negative number' },
					{ status: 400 }
				);
			}
			updateData.complexity = complexity;
		}

		if (position !== undefined) {
			if (typeof position !== 'number' || position < 0) {
				return json(
					{ error: 'Position must be a non-negative number' },
					{ status: 400 }
				);
			}
			updateData.position = position;
		}

		const ticket = await prisma.ticket.update({
			where: { id: params.id },
			data: updateData
		});

		return json(ticket);
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error updating ticket:', err);
		return json({ error: 'Failed to update ticket' }, { status: 500 });
	}
};

/**
 * DELETE /api/tickets/:id
 * Delete a ticket and all its history (cascade)
 */
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		// Check if ticket exists
		const existingTicket = await prisma.ticket.findUnique({
			where: { id: params.id }
		});

		if (!existingTicket) {
			throw error(404, 'Ticket not found');
		}

		await prisma.ticket.delete({
			where: { id: params.id }
		});

		return new Response(null, { status: 204 });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error deleting ticket:', err);
		return json({ error: 'Failed to delete ticket' }, { status: 500 });
	}
};
