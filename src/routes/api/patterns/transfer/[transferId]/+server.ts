/**
 * GAP-3.4.4: Pattern Transfer Details/Rollback API Endpoint
 *
 * Get transfer details and rollback a specific transfer.
 */
import { json, type RequestHandler } from '@sveltejs/kit';
import { transferService } from '$lib/server/transfer';

/**
 * GET /api/patterns/transfer/[transferId]
 * Get details of a specific transfer
 */
export const GET: RequestHandler = async ({ params }) => {
	const { transferId } = params;

	if (!transferId) {
		return json({ error: 'Transfer ID is required' }, { status: 400 });
	}

	try {
		// Get transfer history and find the specific entry
		const history = await transferService.getTransferHistory();
		const transfer = history.find(h => h.transferId === transferId);

		if (!transfer) {
			return json({ error: 'Transfer not found' }, { status: 404 });
		}

		// Get performance metrics if available
		const metrics = await transferService.calculatePerformanceMetrics(transferId);

		return json({
			transfer,
			performanceMetrics: metrics
		});
	} catch (error) {
		console.error('Get transfer details error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to get transfer details' },
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/patterns/transfer/[transferId]
 * Rollback a specific transfer
 */
export const DELETE: RequestHandler = async ({ params }) => {
	const { transferId } = params;

	if (!transferId) {
		return json({ error: 'Transfer ID is required' }, { status: 400 });
	}

	try {
		// Get transfer details first
		const history = await transferService.getTransferHistory();
		const transfer = history.find(h => h.transferId === transferId);

		if (!transfer) {
			return json({ error: 'Transfer not found' }, { status: 404 });
		}

		if (!transfer.canRollback) {
			return json({
				error: 'This transfer cannot be rolled back',
				reason: transfer.status === 'rolled_back' ? 'Already rolled back' : 'Rollback not available'
			}, { status: 400 });
		}

		const success = await transferService.rollbackTransfer(transferId);

		if (!success) {
			return json({ error: 'Rollback failed' }, { status: 500 });
		}

		return json({
			success: true,
			message: 'Transfer rolled back successfully',
			transferId
		});
	} catch (error) {
		console.error('Rollback transfer error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to rollback transfer' },
			{ status: 500 }
		);
	}
};
