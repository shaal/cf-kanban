/**
 * GAP-3.4.4: Pattern Transfer Preview API Endpoint
 *
 * Provides transfer compatibility preview without executing the transfer.
 * Validates pattern compatibility and estimates integration requirements.
 */
import { json, type RequestHandler } from '@sveltejs/kit';
import { transferService } from '$lib/server/transfer';

interface PreviewRequest {
	patternId: string;
	targetProjectId: string;
}

/**
 * POST /api/patterns/transfer/preview
 * Get transfer preview with compatibility validation
 */
export const POST: RequestHandler = async ({ request }) => {
	let body: PreviewRequest;

	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { patternId, targetProjectId } = body;

	// Validate required fields
	if (!patternId || typeof patternId !== 'string' || patternId.trim().length === 0) {
		return json({ error: 'patternId is required' }, { status: 400 });
	}

	if (!targetProjectId || typeof targetProjectId !== 'string' || targetProjectId.trim().length === 0) {
		return json({ error: 'targetProjectId is required' }, { status: 400 });
	}

	try {
		const preview = await transferService.getTransferPreview(
			patternId.trim(),
			targetProjectId.trim()
		);

		if (!preview) {
			return json({ error: 'Pattern not found' }, { status: 404 });
		}

		// Determine if transfer is recommended
		const isRecommended = preview.compatibility.score >= 70 &&
			preview.compatibility.conflicts.filter(c => c.severity === 'high').length === 0;

		return json({
			pattern: preview.pattern,
			compatibility: preview.compatibility,
			estimatedIntegration: preview.estimatedIntegration,
			isRecommended,
			validationPassed: preview.compatibility.conflicts.filter(c => c.severity === 'high').length === 0
		});
	} catch (error) {
		console.error('Transfer preview error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to generate transfer preview' },
			{ status: 500 }
		);
	}
};
