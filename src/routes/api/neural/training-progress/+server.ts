/**
 * GAP-3.4.1: Neural Training Progress API
 *
 * GET /api/neural/training-progress
 * Returns the current neural training status and progress.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { neuralTrainingService } from '$lib/server/neural/training-service';

/**
 * Response structure for training-progress endpoint
 */
interface TrainingProgressResponse {
	/** Whether training is currently in progress */
	isTraining: boolean;
	/** Current epoch number (if training) */
	currentEpoch?: number;
	/** Total epochs for current training (if training) */
	totalEpochs?: number;
	/** Progress percentage (0-100) */
	progress?: number;
	/** Estimated time remaining in milliseconds */
	estimatedTimeRemaining?: number;
	/** Current loss value */
	currentLoss?: number;
	/** Current accuracy value */
	currentAccuracy?: number;
	/** Current training configuration */
	config?: {
		epochs: number;
		learningRate: number;
		batchSize: number;
		modelType: string;
		patternType: string;
		optimizerType: string;
	};
	/** Intelligence system status */
	intelligence: {
		sonaEnabled: boolean;
		moeEnabled: boolean;
		hnswEnabled: boolean;
		ewcEnabled: boolean;
		totalPatterns: number;
		indexedPatterns: number;
		avgQueryTime: number;
	};
	/** Recent training history */
	recentTraining: {
		id: string;
		startTime: number;
		endTime?: number;
		epochs: number;
		finalLoss?: number;
		finalAccuracy?: number;
		status: string;
	}[];
	/** Timestamp */
	timestamp: string;
}

/**
 * GET /api/neural/training-progress
 * Get current training status and progress
 */
export const GET: RequestHandler = async () => {
	try {
		// Get current training status
		const trainingStatus = await neuralTrainingService.getTrainingStatus();

		// Get current config
		const config = await neuralTrainingService.getCurrentConfig();

		// Get intelligence status
		const intelligenceStatus = await neuralTrainingService.getIntelligenceStatus();

		// Get recent training history
		const trainingHistory = await neuralTrainingService.getTrainingHistory();

		const response: TrainingProgressResponse = {
			isTraining: trainingStatus.isTraining,
			currentEpoch: trainingStatus.currentEpoch,
			totalEpochs: trainingStatus.totalEpochs,
			progress: trainingStatus.progress,
			estimatedTimeRemaining: trainingStatus.estimatedTimeRemaining,
			currentLoss: trainingStatus.currentLoss,
			currentAccuracy: trainingStatus.currentAccuracy,
			config: {
				epochs: config.epochs,
				learningRate: config.learningRate,
				batchSize: config.batchSize,
				modelType: config.modelType,
				patternType: config.patternType,
				optimizerType: config.optimizerType
			},
			intelligence: intelligenceStatus,
			recentTraining: trainingHistory.slice(0, 5).map((t) => ({
				id: t.id,
				startTime: t.startTime,
				endTime: t.endTime,
				epochs: t.epochs,
				finalLoss: t.finalLoss,
				finalAccuracy: t.finalAccuracy,
				status: t.status
			})),
			timestamp: new Date().toISOString()
		};

		return json(response);
	} catch (err) {
		console.error('Error getting training progress:', err);
		return json({ error: 'Failed to get training progress' }, { status: 500 });
	}
};
