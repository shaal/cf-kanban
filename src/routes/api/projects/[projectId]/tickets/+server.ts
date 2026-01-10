import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

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
		const { title, description, priority, labels } = body;

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

		const ticket = await prisma.ticket.create({
			data: {
				title: title.trim(),
				description: description?.trim() || null,
				priority: priority || 'MEDIUM',
				labels: labels || [],
				position: nextPosition,
				projectId
			}
		});

		return json(ticket, { status: 201 });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error creating ticket:', err);
		return json({ error: 'Failed to create ticket' }, { status: 500 });
	}
};
