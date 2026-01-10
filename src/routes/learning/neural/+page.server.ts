/**
 * TASK-076: Neural Training Page Server
 *
 * Server-side data loading for the neural training dashboard.
 */

import type { PageServerLoad, Actions } from './$types';
import { neuralTrainingService } from '$lib/server/neural/training-service';
import { fail } from '@sveltejs/kit';
import type { TrainingConfig } from '$lib/types/neural';

export const load: PageServerLoad = async () => {
	const dashboardData = await neuralTrainingService.getDashboardData();

	return {
		...dashboardData
	};
};

export const actions: Actions = {
	/**
	 * Trigger neural training with provided configuration
	 */
	triggerTraining: async ({ request }) => {
		const formData = await request.formData();

		const config: TrainingConfig = {
			epochs: parseInt(formData.get('epochs')?.toString() ?? '10', 10),
			learningRate: parseFloat(formData.get('learningRate')?.toString() ?? '0.001'),
			batchSize: parseInt(formData.get('batchSize')?.toString() ?? '32', 10),
			modelType: (formData.get('modelType')?.toString() ?? 'moe') as TrainingConfig['modelType'],
			patternType: (formData.get('patternType')?.toString() ?? 'coordination') as TrainingConfig['patternType'],
			optimizerType: (formData.get('optimizerType')?.toString() ?? 'adam') as TrainingConfig['optimizerType']
		};

		// Validate config
		if (config.epochs < 1 || config.epochs > 100) {
			return fail(400, { error: 'Epochs must be between 1 and 100' });
		}

		if (config.learningRate <= 0 || config.learningRate > 1) {
			return fail(400, { error: 'Learning rate must be between 0 and 1' });
		}

		if (config.batchSize < 1 || config.batchSize > 256) {
			return fail(400, { error: 'Batch size must be between 1 and 256' });
		}

		const result = await neuralTrainingService.triggerTraining(config);

		if (!result.success) {
			return fail(500, { error: result.error ?? 'Training failed to start' });
		}

		return {
			success: true,
			trainingId: result.trainingId,
			message: 'Training started successfully'
		};
	},

	/**
	 * Predict pattern for a given task description
	 */
	predictPattern: async ({ request }) => {
		const formData = await request.formData();
		const taskDescription = formData.get('taskDescription')?.toString();

		if (!taskDescription || taskDescription.trim().length === 0) {
			return fail(400, { error: 'Task description is required' });
		}

		const prediction = await neuralTrainingService.predictPattern(taskDescription);

		if (!prediction) {
			return fail(404, { error: 'No matching patterns found' });
		}

		return {
			prediction,
			success: true
		};
	}
};
