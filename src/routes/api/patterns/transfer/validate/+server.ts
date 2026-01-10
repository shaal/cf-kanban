/**
 * GAP-3.4.4: Pattern Transfer Validation API Endpoint
 *
 * Validates pattern compatibility before transfer without generating full preview.
 * Quick validation check for UI feedback.
 */
import { json, type RequestHandler } from '@sveltejs/kit';
import { transferService } from '$lib/server/transfer';

interface ValidateRequest {
	patternId: string;
	targetProjectId: string;
}

interface ValidationResult {
	valid: boolean;
	score: number;
	hasBlockingConflicts: boolean;
	conflictCount: number;
	warningCount: number;
	message: string;
}

/**
 * POST /api/patterns/transfer/validate
 * Quick validation check for pattern transfer
 */
export const POST: RequestHandler = async ({ request }) => {
	let body: ValidateRequest;

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
		// Check transfer permissions
		const canTransfer = await transferService.canTransfer(
			patternId.trim(),
			targetProjectId.trim()
		);

		if (!canTransfer.allowed) {
			const result: ValidationResult = {
				valid: false,
				score: 0,
				hasBlockingConflicts: true,
				conflictCount: 1,
				warningCount: 0,
				message: canTransfer.reason || 'Transfer not allowed'
			};
			return json(result);
		}

		// Get preview for detailed validation
		const preview = await transferService.getTransferPreview(
			patternId.trim(),
			targetProjectId.trim()
		);

		if (!preview) {
			const result: ValidationResult = {
				valid: false,
				score: 0,
				hasBlockingConflicts: true,
				conflictCount: 1,
				warningCount: 0,
				message: 'Pattern not found or invalid'
			};
			return json(result, { status: 404 });
		}

		const highConflicts = preview.compatibility.conflicts.filter(c => c.severity === 'high');
		const mediumConflicts = preview.compatibility.conflicts.filter(c => c.severity === 'medium');
		const hasBlockingConflicts = highConflicts.length > 0;

		let message: string;
		if (hasBlockingConflicts) {
			message = `Transfer blocked: ${highConflicts.length} high-severity conflict(s)`;
		} else if (mediumConflicts.length > 0) {
			message = `Transfer possible with ${mediumConflicts.length} warning(s) - review recommended`;
		} else if (preview.compatibility.score >= 80) {
			message = 'Transfer recommended - high compatibility';
		} else if (preview.compatibility.score >= 60) {
			message = 'Transfer possible - moderate compatibility';
		} else {
			message = 'Transfer possible but not recommended - low compatibility';
		}

		const result: ValidationResult = {
			valid: !hasBlockingConflicts,
			score: preview.compatibility.score,
			hasBlockingConflicts,
			conflictCount: preview.compatibility.conflicts.length,
			warningCount: preview.compatibility.warnings.length,
			message
		};

		return json(result);
	} catch (error) {
		console.error('Transfer validation error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to validate transfer' },
			{ status: 500 }
		);
	}
};
