/**
 * TASK-084: Cross-Project Transfer Page - Server Load
 *
 * Server-side data loading for the transfer page.
 */

import type { PageServerLoad, Actions } from './$types';
import { transferService } from '$lib/server/transfer';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	const projectId = url.searchParams.get('projectId') || undefined;
	const minSuccessRate = url.searchParams.get('minSuccessRate')
		? parseFloat(url.searchParams.get('minSuccessRate')!)
		: undefined;
	const isPublic = url.searchParams.get('isPublic')
		? url.searchParams.get('isPublic') === 'true'
		: undefined;

	const [patterns, history] = await Promise.all([
		transferService.getTransferablePatterns({
			projectId,
			minSuccessRate,
			isPublic,
			limit: 50
		}),
		transferService.getTransferHistory(projectId)
	]);

	return {
		patterns,
		history,
		filters: {
			projectId,
			minSuccessRate,
			isPublic
		}
	};
};

export const actions: Actions = {
	transfer: async ({ request }) => {
		const formData = await request.formData();
		const patternId = formData.get('patternId') as string;
		const targetProjectId = formData.get('targetProjectId') as string;

		if (!patternId || !targetProjectId) {
			return fail(400, {
				error: 'Pattern ID and target project are required',
				patternId,
				targetProjectId
			});
		}

		// Get preview first to confirm
		const preview = await transferService.getTransferPreview(patternId, targetProjectId);

		if (!preview) {
			return fail(404, {
				error: 'Pattern not found',
				patternId,
				targetProjectId
			});
		}

		// Check for blocking conflicts
		const highConflicts = preview.compatibility.conflicts.filter((c) => c.severity === 'high');
		if (highConflicts.length > 0) {
			return fail(400, {
				error: `Transfer blocked by ${highConflicts.length} high-severity conflict(s)`,
				conflicts: highConflicts,
				patternId,
				targetProjectId
			});
		}

		// Execute transfer
		const result = await transferService.executeTransfer(patternId, targetProjectId);

		if (!result.success) {
			return fail(500, {
				error: result.error || 'Transfer failed',
				patternId,
				targetProjectId
			});
		}

		return {
			success: true,
			transferId: result.transferId,
			targetPatternId: result.targetPatternId
		};
	},

	rollback: async ({ request }) => {
		const formData = await request.formData();
		const transferId = formData.get('transferId') as string;

		if (!transferId) {
			return fail(400, {
				error: 'Transfer ID is required'
			});
		}

		const success = await transferService.rollbackTransfer(transferId);

		if (!success) {
			return fail(500, {
				error: 'Rollback failed. Transfer may not exist or cannot be rolled back.'
			});
		}

		return {
			success: true,
			rolledBack: transferId
		};
	},

	preview: async ({ request }) => {
		const formData = await request.formData();
		const patternId = formData.get('patternId') as string;
		const targetProjectId = formData.get('targetProjectId') as string;

		if (!patternId || !targetProjectId) {
			return fail(400, {
				error: 'Pattern ID and target project are required'
			});
		}

		const preview = await transferService.getTransferPreview(patternId, targetProjectId);

		if (!preview) {
			return fail(404, {
				error: 'Pattern not found'
			});
		}

		return {
			success: true,
			preview
		};
	}
};
