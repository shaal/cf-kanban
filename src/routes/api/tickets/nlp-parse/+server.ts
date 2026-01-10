/**
 * GAP-3.2.7: NLP Parsing API
 *
 * POST /api/tickets/nlp-parse
 * Provides LLM-powered natural language parsing for ticket descriptions:
 * - Auto-suggests labels based on content
 * - Extracts technical requirements
 * - Identifies routing hints for agent assignment
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { nlpParser, type NLPParseResult } from '$lib/server/analysis/nlp-parser';

/**
 * Request body for NLP parsing endpoint
 */
interface NLPParseRequest {
	title: string;
	description?: string;
}

/**
 * Response from NLP parsing endpoint
 */
interface NLPParseResponse extends NLPParseResult {
	/** Whether NLP service is available */
	nlpAvailable: boolean;
	/** Processing time in ms */
	processingTimeMs: number;
}

/**
 * POST /api/tickets/nlp-parse
 * Parse ticket content using NLP for intelligent suggestions
 */
export const POST: RequestHandler = async ({ request }) => {
	const startTime = Date.now();

	try {
		const body: NLPParseRequest = await request.json();
		const { title, description } = body;

		// Validate input
		if (!title || typeof title !== 'string' || title.trim().length < 3) {
			return json(
				{
					error: 'Title must be at least 3 characters',
					nlpAvailable: nlpParser.isAvailable(),
					processingTimeMs: Date.now() - startTime
				},
				{ status: 400 }
			);
		}

		// Parse using NLP service
		const result = await nlpParser.parse(title.trim(), description?.trim() || null);

		const response: NLPParseResponse = {
			...result,
			nlpAvailable: nlpParser.isAvailable(),
			processingTimeMs: Date.now() - startTime
		};

		return json(response);
	} catch (err) {
		console.error('NLP parsing error:', err);
		return json(
			{
				error: 'Failed to parse ticket content',
				nlpAvailable: nlpParser.isAvailable(),
				processingTimeMs: Date.now() - startTime
			},
			{ status: 500 }
		);
	}
};

/**
 * GET /api/tickets/nlp-parse
 * Check NLP service availability
 */
export const GET: RequestHandler = async () => {
	return json({
		available: nlpParser.isAvailable(),
		message: nlpParser.isAvailable()
			? 'NLP parsing service is available'
			: 'NLP parsing service is unavailable (ANTHROPIC_API_KEY not configured)'
	});
};
