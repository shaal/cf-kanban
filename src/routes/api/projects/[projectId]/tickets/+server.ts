import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { publishTicketCreated } from '$lib/server/events';
import type { Ticket } from '$lib/types';

/**
 * GET /api/projects/:projectId/tickets
 * List all tickets for a project, ordered by position
 */
export const GET: RequestHandler = async ({ params }) => {
	const { projectId } = params;

	// Check if project exists
	const project = await prisma.project.findUnique({
		where: { id: projectId }
	});

	if (!project) {
		throw error(404, 'Project not found');
	}

	const tickets = await prisma.ticket.findMany({
		where: { projectId },
		orderBy: { position: 'asc' }
	});

	return json(tickets);
};

/**
 * POST /api/projects/:projectId/tickets
 * Create a new ticket in the project
 *
 * TASK-035: Publishes ticket created event via Redis pub/sub
 */
export const POST: RequestHandler = async ({ params, request }) => {
	const { projectId } = params;

	try {
		// Check if project exists
		const project = await prisma.project.findUnique({
			where: { id: projectId }
		});

		if (!project) {
			throw error(404, 'Project not found');
		}

		const body = await request.json();
		const { title, description, priority, labels, dependencyIds } = body;

		// Validate required fields
		if (!title || typeof title !== 'string' || title.trim().length === 0) {
			return json(
				{ error: 'Title is required and must be a non-empty string' },
				{ status: 400 }
			);
		}

		// Validate priority if provided
		const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
		if (priority && !validPriorities.includes(priority)) {
			return json(
				{ error: 'Priority must be one of: LOW, MEDIUM, HIGH, CRITICAL' },
				{ status: 400 }
			);
		}

		// Get the next position for the ticket
		const lastTicket = await prisma.ticket.findFirst({
			where: { projectId },
			orderBy: { position: 'desc' }
		});
		const nextPosition = (lastTicket?.position ?? -1) + 1;

		// GAP-3.2.4: Validate dependency IDs if provided
		let validDependencyIds: string[] = [];
		if (dependencyIds && Array.isArray(dependencyIds) && dependencyIds.length > 0) {
			// Verify all dependency IDs are valid tickets in this project
			const dependencyTickets = await prisma.ticket.findMany({
				where: {
					id: { in: dependencyIds },
					projectId
				},
				select: { id: true }
			});
			validDependencyIds = dependencyTickets.map(t => t.id);

			// Warn if some dependencies were invalid (but don't fail)
			if (validDependencyIds.length !== dependencyIds.length) {
				console.warn(`Some dependency IDs were invalid: expected ${dependencyIds.length}, found ${validDependencyIds.length}`);
			}
		}

		const ticket = await prisma.ticket.create({
			data: {
				title: title.trim(),
				description: description?.trim() || null,
				priority: priority || 'MEDIUM',
				labels: labels || [],
				dependencyIds: validDependencyIds,
				position: nextPosition,
				projectId
			}
		});

		// TASK-035: Publish ticket created event for real-time sync
		await publishTicketCreated(projectId, ticket as Ticket);

		return json(ticket, { status: 201 });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error creating ticket:', err);
		return json({ error: 'Failed to create ticket' }, { status: 500 });
	}
};
