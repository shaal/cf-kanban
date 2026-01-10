/**
 * GAP-3.2.1: Complexity Statistics API
 *
 * GET /api/tickets/complexity-stats
 * Returns aggregated complexity distribution statistics across tickets.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

/**
 * Complexity distribution bucket
 */
interface ComplexityBucket {
	range: string;
	min: number;
	max: number;
	count: number;
	percentage: number;
}

/**
 * Complexity statistics by status
 */
interface StatusComplexity {
	status: string;
	avgComplexity: number;
	minComplexity: number;
	maxComplexity: number;
	ticketCount: number;
}

/**
 * Response structure for complexity-stats endpoint
 */
interface ComplexityStatsResponse {
	/** Total number of tickets analyzed */
	totalTickets: number;
	/** Number of tickets with complexity scores */
	scoredTickets: number;
	/** Average complexity across all scored tickets */
	averageComplexity: number;
	/** Median complexity */
	medianComplexity: number;
	/** Standard deviation */
	standardDeviation: number;
	/** Distribution buckets */
	distribution: ComplexityBucket[];
	/** Complexity by status */
	byStatus: StatusComplexity[];
	/** Complexity by priority */
	byPriority: {
		priority: string;
		avgComplexity: number;
		count: number;
	}[];
	/** Top complex tickets */
	topComplex: {
		id: string;
		title: string;
		complexity: number;
		status: string;
	}[];
	/** Timestamp of statistics generation */
	generatedAt: string;
}

/**
 * GET /api/tickets/complexity-stats
 * Get complexity distribution statistics
 */
export const GET: RequestHandler = async ({ url }) => {
	const projectId = url.searchParams.get('projectId');
	const limit = parseInt(url.searchParams.get('limit') || '10', 10);

	try {
		// Build where clause
		const where = projectId ? { projectId } : {};

		// Get all tickets with complexity scores
		const tickets = await prisma.ticket.findMany({
			where: {
				...where,
				complexity: { not: null }
			},
			select: {
				id: true,
				title: true,
				complexity: true,
				status: true,
				priority: true
			}
		});

		// Get total ticket count
		const totalTickets = await prisma.ticket.count({ where });
		const scoredTickets = tickets.length;

		if (scoredTickets === 0) {
			return json({
				totalTickets,
				scoredTickets: 0,
				averageComplexity: 0,
				medianComplexity: 0,
				standardDeviation: 0,
				distribution: createEmptyDistribution(),
				byStatus: [],
				byPriority: [],
				topComplex: [],
				generatedAt: new Date().toISOString()
			} satisfies ComplexityStatsResponse);
		}

		// Calculate statistics
		const complexities = tickets.map((t) => t.complexity!).sort((a, b) => a - b);
		const sum = complexities.reduce((a, b) => a + b, 0);
		const average = sum / complexities.length;
		const median = complexities[Math.floor(complexities.length / 2)];

		// Standard deviation
		const squaredDiffs = complexities.map((c) => Math.pow(c - average, 2));
		const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / complexities.length;
		const standardDeviation = Math.sqrt(avgSquaredDiff);

		// Distribution buckets (1-2, 3-4, 5-6, 7-8, 9-10)
		const distribution = createDistribution(complexities);

		// Group by status
		const statusGroups = new Map<string, number[]>();
		for (const ticket of tickets) {
			const status = ticket.status;
			if (!statusGroups.has(status)) {
				statusGroups.set(status, []);
			}
			statusGroups.get(status)!.push(ticket.complexity!);
		}

		const byStatus: StatusComplexity[] = Array.from(statusGroups.entries()).map(
			([status, comps]) => ({
				status,
				avgComplexity: Math.round((comps.reduce((a, b) => a + b, 0) / comps.length) * 10) / 10,
				minComplexity: Math.min(...comps),
				maxComplexity: Math.max(...comps),
				ticketCount: comps.length
			})
		);

		// Group by priority
		const priorityGroups = new Map<string, number[]>();
		for (const ticket of tickets) {
			const priority = ticket.priority;
			if (!priorityGroups.has(priority)) {
				priorityGroups.set(priority, []);
			}
			priorityGroups.get(priority)!.push(ticket.complexity!);
		}

		const byPriority = Array.from(priorityGroups.entries()).map(([priority, comps]) => ({
			priority,
			avgComplexity: Math.round((comps.reduce((a, b) => a + b, 0) / comps.length) * 10) / 10,
			count: comps.length
		}));

		// Top complex tickets
		const topComplex = [...tickets]
			.sort((a, b) => (b.complexity || 0) - (a.complexity || 0))
			.slice(0, limit)
			.map((t) => ({
				id: t.id,
				title: t.title,
				complexity: t.complexity!,
				status: t.status
			}));

		const response: ComplexityStatsResponse = {
			totalTickets,
			scoredTickets,
			averageComplexity: Math.round(average * 10) / 10,
			medianComplexity: median,
			standardDeviation: Math.round(standardDeviation * 100) / 100,
			distribution,
			byStatus,
			byPriority,
			topComplex,
			generatedAt: new Date().toISOString()
		};

		return json(response);
	} catch (err) {
		console.error('Error getting complexity stats:', err);
		return json({ error: 'Failed to get complexity statistics' }, { status: 500 });
	}
};

/**
 * Create distribution buckets from complexity scores
 */
function createDistribution(complexities: number[]): ComplexityBucket[] {
	const buckets: ComplexityBucket[] = [
		{ range: 'Very Low (1-2)', min: 1, max: 2, count: 0, percentage: 0 },
		{ range: 'Low (3-4)', min: 3, max: 4, count: 0, percentage: 0 },
		{ range: 'Medium (5-6)', min: 5, max: 6, count: 0, percentage: 0 },
		{ range: 'High (7-8)', min: 7, max: 8, count: 0, percentage: 0 },
		{ range: 'Very High (9-10)', min: 9, max: 10, count: 0, percentage: 0 }
	];

	for (const complexity of complexities) {
		for (const bucket of buckets) {
			if (complexity >= bucket.min && complexity <= bucket.max) {
				bucket.count++;
				break;
			}
		}
	}

	const total = complexities.length;
	for (const bucket of buckets) {
		bucket.percentage = Math.round((bucket.count / total) * 100 * 10) / 10;
	}

	return buckets;
}

/**
 * Create empty distribution buckets
 */
function createEmptyDistribution(): ComplexityBucket[] {
	return [
		{ range: 'Very Low (1-2)', min: 1, max: 2, count: 0, percentage: 0 },
		{ range: 'Low (3-4)', min: 3, max: 4, count: 0, percentage: 0 },
		{ range: 'Medium (5-6)', min: 5, max: 6, count: 0, percentage: 0 },
		{ range: 'High (7-8)', min: 7, max: 8, count: 0, percentage: 0 },
		{ range: 'Very High (9-10)', min: 9, max: 10, count: 0, percentage: 0 }
	];
}
