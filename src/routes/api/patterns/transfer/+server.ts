/**
 * GAP-3.4.4: Pattern Transfer API Endpoint
 *
 * REST API for transferring patterns between projects.
 * Supports transfer execution, preview, validation, and history retrieval.
 */
import { json, type RequestHandler } from '@sveltejs/kit';
import { transferService } from '$lib/server/transfer';
import type { TransferResult, TransferPreview, TransferHistoryEntry } from '$lib/types/transfer';

/**
 * POST /api/patterns/transfer
 * Execute a pattern transfer to another project
 */
export const POST: RequestHandler = async ({ request }) => {
	let body: { patternId: string; targetProjectId: string };

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
		// Check if transfer is allowed
		const preview = await transferService.getTransferPreview(patternId.trim(), targetProjectId.trim());

		if (!preview) {
			return json({ error: 'Pattern not found or invalid' }, { status: 404 });
		}

		// Check for blocking conflicts
		const highConflicts = preview.compatibility.conflicts.filter(c => c.severity === 'high');
		if (highConflicts.length > 0) {
			return json({
				error: 'Transfer blocked due to compatibility issues',
				conflicts: highConflicts,
				compatibilityScore: preview.compatibility.score
			}, { status: 409 });
		}

		// Execute the transfer
		const result: TransferResult = await transferService.executeTransfer(
			patternId.trim(),
			targetProjectId.trim()
		);

		if (!result.success) {
			return json({
				error: result.error || 'Transfer failed',
				transferId: result.transferId
			}, { status: 500 });
		}

		return json({
			success: true,
			transferId: result.transferId,
			targetPatternId: result.targetPatternId,
			sourcePattern: result.sourcePattern,
			timestamp: result.timestamp
		}, { status: 201 });
	} catch (error) {
		console.error('Pattern transfer error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to transfer pattern' },
			{ status: 500 }
		);
	}
};

/**
 * GET /api/patterns/transfer
 * Get transfer history, optionally filtered by project
 */
export const GET: RequestHandler = async ({ url }) => {
	const projectId = url.searchParams.get('projectId') || undefined;
	const limit = parseInt(url.searchParams.get('limit') || '50', 10);

	try {
		const history: TransferHistoryEntry[] = await transferService.getTransferHistory(projectId);

		// Apply limit
		const limitedHistory = history.slice(0, limit);

		return json({
			history: limitedHistory,
			total: history.length,
			projectId
		});
	} catch (error) {
		console.error('Get transfer history error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to get transfer history' },
			{ status: 500 }
		);
	}
};
