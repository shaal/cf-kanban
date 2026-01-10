/**
 * GAP-3.4.1: Neural Training Metrics API
 *
 * GET /api/neural/metrics
 * Returns training metrics over time including loss, accuracy,
 * SONA adaptation, and EWC consolidation metrics.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { neuralTrainingService } from '$lib/server/neural/training-service';

/**
 * Response structure for metrics endpoint
 */
interface NeuralMetricsResponse {
	/** Training metrics over time (loss and accuracy per epoch) */
	trainingMetrics: {
		epoch: number;
		loss: number;
		accuracy: number;
		timestamp: number;
		validationLoss?: number;
		validationAccuracy?: number;
	}[];
	/** SONA (Self-Optimizing Neural Architecture) metrics */
	sona: {
		adaptationSpeed: number;
		adaptationCount: number;
		lastAdaptation: number;
		efficiency: number;
	};
	/** EWC (Elastic Weight Consolidation) metrics */
	ewc: {
		fisherImportance: number;
		consolidationStrength: number;
		forgettingRate: number;
		lastConsolidation: number;
		totalConsolidations: number;
		protectedPatterns: number;
	};
	/** MoE (Mixture of Experts) utilization */
	expertStats: {
		expertId: string;
		name: string;
		utilization: number;
		taskCount: number;
		avgLatency?: number;
		specialization?: string;
	}[];
	/** Performance summary */
	performance: {
		avgTrainingLoss: number;
		avgTrainingAccuracy: number;
		trainingTrend: 'improving' | 'stable' | 'declining';
		sonaEfficiency: number;
		ewcProtection: number;
		expertBalance: number;
	};
	/** Period of data */
	period: {
		start: number;
		end: number;
		dataPoints: number;
	};
	/** Timestamp */
	timestamp: string;
}

/**
 * GET /api/neural/metrics
 * Get training metrics over time
 */
export const GET: RequestHandler = async ({ url }) => {
	const period = url.searchParams.get('period') || '24h';
	const includeExperts = url.searchParams.get('includeExperts') !== 'false';

	try {
		// Get training metrics
		const trainingMetrics = await neuralTrainingService.getTrainingMetrics();

		// Get SONA metrics
		const sonaMetrics = await neuralTrainingService.getSONAMetrics();

		// Get EWC metrics
		const ewcMetrics = await neuralTrainingService.getEWCMetrics();

		// Get expert stats if requested
		let expertStats: {
			expertId: string;
			name: string;
			utilization: number;
			taskCount: number;
			avgLatency?: number;
			specialization?: string;
		}[] = [];

		if (includeExperts) {
			expertStats = await neuralTrainingService.getExpertStats();
		}

		// Calculate performance summary
		const performance = calculatePerformanceSummary(
			trainingMetrics,
			sonaMetrics,
			ewcMetrics,
			expertStats
		);

		// Determine period bounds
		const now = Date.now();
		const periodMs = parsePeriod(period);
		const start = now - periodMs;

		// Filter metrics to period
		const filteredMetrics = trainingMetrics.filter((m) => m.timestamp >= start);

		const response: NeuralMetricsResponse = {
			trainingMetrics: filteredMetrics,
			sona: sonaMetrics,
			ewc: ewcMetrics,
			expertStats,
			performance,
			period: {
				start,
				end: now,
				dataPoints: filteredMetrics.length
			},
			timestamp: new Date().toISOString()
		};

		return json(response);
	} catch (err) {
		console.error('Error getting neural metrics:', err);
		return json({ error: 'Failed to get neural metrics' }, { status: 500 });
	}
};

/**
 * Parse period string to milliseconds
 */
function parsePeriod(period: string): number {
	const match = period.match(/^(\d+)([hdwm])$/);
	if (!match) return 24 * 60 * 60 * 1000; // Default 24h

	const value = parseInt(match[1], 10);
	const unit = match[2];

	switch (unit) {
		case 'h':
			return value * 60 * 60 * 1000;
		case 'd':
			return value * 24 * 60 * 60 * 1000;
		case 'w':
			return value * 7 * 24 * 60 * 60 * 1000;
		case 'm':
			return value * 30 * 24 * 60 * 60 * 1000;
		default:
			return 24 * 60 * 60 * 1000;
	}
}

/**
 * Calculate performance summary from metrics
 */
function calculatePerformanceSummary(
	trainingMetrics: { epoch: number; loss: number; accuracy: number; timestamp: number }[],
	sonaMetrics: { adaptationSpeed: number; adaptationCount: number; lastAdaptation: number; efficiency: number },
	ewcMetrics: { fisherImportance: number; consolidationStrength: number; forgettingRate: number; lastConsolidation: number; totalConsolidations: number; protectedPatterns: number },
	expertStats: { expertId: string; name: string; utilization: number; taskCount: number }[]
): {
	avgTrainingLoss: number;
	avgTrainingAccuracy: number;
	trainingTrend: 'improving' | 'stable' | 'declining';
	sonaEfficiency: number;
	ewcProtection: number;
	expertBalance: number;
} {
	// Calculate average loss and accuracy
	let avgLoss = 0;
	let avgAccuracy = 0;

	if (trainingMetrics.length > 0) {
		avgLoss =
			trainingMetrics.reduce((sum, m) => sum + m.loss, 0) / trainingMetrics.length;
		avgAccuracy =
			trainingMetrics.reduce((sum, m) => sum + m.accuracy, 0) / trainingMetrics.length;
	}

	// Calculate training trend
	let trainingTrend: 'improving' | 'stable' | 'declining' = 'stable';
	if (trainingMetrics.length >= 3) {
		const recent = trainingMetrics.slice(-3);
		const older = trainingMetrics.slice(0, 3);
		const recentAvgLoss = recent.reduce((s, m) => s + m.loss, 0) / recent.length;
		const olderAvgLoss = older.reduce((s, m) => s + m.loss, 0) / older.length;

		const improvement = (olderAvgLoss - recentAvgLoss) / olderAvgLoss;
		if (improvement > 0.05) {
			trainingTrend = 'improving';
		} else if (improvement < -0.05) {
			trainingTrend = 'declining';
		}
	}

	// SONA efficiency (adaptation speed < 0.05ms is 100%)
	const sonaEfficiency = Math.min(1, 0.05 / Math.max(0.001, sonaMetrics.adaptationSpeed));

	// EWC protection (based on forgetting rate - lower is better)
	const ewcProtection = 1 - ewcMetrics.forgettingRate;

	// Expert balance (standard deviation of utilization - lower is better)
	let expertBalance = 1;
	if (expertStats.length > 1) {
		const avgUtil =
			expertStats.reduce((s, e) => s + e.utilization, 0) / expertStats.length;
		const variance =
			expertStats.reduce((s, e) => s + Math.pow(e.utilization - avgUtil, 2), 0) /
			expertStats.length;
		const stdDev = Math.sqrt(variance);
		expertBalance = Math.max(0, 1 - stdDev); // Lower std dev = better balance
	}

	return {
		avgTrainingLoss: Math.round(avgLoss * 1000) / 1000,
		avgTrainingAccuracy: Math.round(avgAccuracy * 100) / 100,
		trainingTrend,
		sonaEfficiency: Math.round(sonaEfficiency * 100) / 100,
		ewcProtection: Math.round(ewcProtection * 100) / 100,
		expertBalance: Math.round(expertBalance * 100) / 100
	};
}
