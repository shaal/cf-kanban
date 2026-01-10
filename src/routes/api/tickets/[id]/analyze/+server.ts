/**
 * GAP-3.2.1: Intelligent Complexity Scoring API
 *
 * POST /api/tickets/:id/analyze
 * Analyzes a ticket and returns comprehensive complexity scoring
 * with factor breakdown and confidence levels.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { calculateComplexity, quickComplexityEstimate } from '$lib/server/analysis/complexity';
import { ticketAnalyzer } from '$lib/server/analysis/ticket-analyzer';

/**
 * Request body for analyze endpoint
 */
interface AnalyzeRequest {
	/** Force fresh analysis even if ticket has stored complexity */
	forceRefresh?: boolean;
	/** Include quick estimate (for real-time preview) */
	includeQuickEstimate?: boolean;
	/** Include ticket type classification */
	includeClassification?: boolean;
}

/**
 * Response structure for analyze endpoint
 */
interface AnalyzeResponse {
	ticketId: string;
	complexity: {
		score: number;
		confidence: number;
		factors: {
			descriptionLength: number;
			technicalKeywords: number;
			crossCutting: boolean;
			hasSecurityImplications: boolean;
			requiresNewInfrastructure: boolean;
			estimatedFiles: number;
			similarTaskComplexity: number | null;
			labelComplexity: number;
		};
		breakdown: {
			description: number;
			technical: number;
			crossCutting: number;
			security: number;
			infrastructure: number;
			files: number;
			historical: number;
			labels: number;
		};
	};
	quickEstimate?: number;
	classification?: {
		ticketType: string;
		keywords: string[];
		suggestedLabels: string[];
		suggestedAgents: string[];
		suggestedTopology: string;
		intent: string;
		confidence: number;
	};
	analyzedAt: string;
}

/**
 * POST /api/tickets/:id/analyze
 * Analyze a ticket and return complexity scoring
 */
export const POST: RequestHandler = async ({ params, request }) => {
	const { id } = params;

	try {
		// Get the ticket
		const ticket = await prisma.ticket.findUnique({
			where: { id }
		});

		if (!ticket) {
			throw error(404, 'Ticket not found');
		}

		// Parse request body
		let body: AnalyzeRequest = {};
		try {
			body = await request.json();
		} catch {
			// Empty body is acceptable
		}

		const { forceRefresh = false, includeQuickEstimate = false, includeClassification = false } = body;

		// Perform complexity analysis
		const complexityResult = await calculateComplexity(
			ticket.title,
			ticket.description,
			ticket.labels || [],
			ticket.projectId
		);

		// Build response
		const response: AnalyzeResponse = {
			ticketId: id,
			complexity: complexityResult,
			analyzedAt: new Date().toISOString()
		};

		// Add quick estimate if requested
		if (includeQuickEstimate) {
			response.quickEstimate = quickComplexityEstimate(
				ticket.title,
				ticket.description,
				ticket.labels || []
			);
		}

		// Add classification if requested
		if (includeClassification) {
			const analysis = ticketAnalyzer.analyze({
				title: ticket.title,
				description: ticket.description,
				priority: ticket.priority,
				labels: ticket.labels || []
			});
			response.classification = analysis;
		}

		// Update ticket complexity if changed or forcing refresh
		if (forceRefresh || ticket.complexity !== complexityResult.score) {
			await prisma.ticket.update({
				where: { id },
				data: { complexity: complexityResult.score }
			});
		}

		return json(response);
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error analyzing ticket:', err);
		return json({ error: 'Failed to analyze ticket' }, { status: 500 });
	}
};
