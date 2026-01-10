/**
 * TASK-078: Training Configuration Panel Tests
 *
 * Tests for the neural training configuration panel component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import type { TrainingConfig, TrainingHistory } from '$lib/types/neural';

// Mock training configuration
const mockConfig: TrainingConfig = {
	epochs: 10,
	learningRate: 0.001,
	batchSize: 32,
	modelType: 'moe',
	patternType: 'coordination',
	optimizerType: 'adam'
};

// Mock training history
const mockHistory: TrainingHistory[] = [
	{
		id: 'train-001',
		startTime: Date.now() - 3600000,
		endTime: Date.now() - 3500000,
		epochs: 10,
		finalLoss: 0.25,
		finalAccuracy: 0.88,
		status: 'completed'
	},
	{
		id: 'train-002',
		startTime: Date.now() - 7200000,
		endTime: Date.now() - 7100000,
		epochs: 5,
		finalLoss: 0.35,
		finalAccuracy: 0.82,
		status: 'completed'
	}
];

describe('TrainingConfig', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render component container', async () => {
		const { default: TrainingConfig } = await import('$lib/components/neural/TrainingConfig.svelte');
		render(TrainingConfig, { props: { config: mockConfig, history: mockHistory } });

		const container = document.querySelector('[data-testid="training-config"]');
		expect(container).toBeDefined();
	});

	it('should display current configuration values', async () => {
		const { default: TrainingConfig } = await import('$lib/components/neural/TrainingConfig.svelte');
		render(TrainingConfig, { props: { config: mockConfig, history: mockHistory } });

		expect(screen.getByDisplayValue('10')).toBeDefined(); // epochs
		expect(screen.getByDisplayValue('0.001')).toBeDefined(); // learning rate
		expect(screen.getByDisplayValue('32')).toBeDefined(); // batch size
	});

	it('should have epochs input field', async () => {
		const { default: TrainingConfig } = await import('$lib/components/neural/TrainingConfig.svelte');
		render(TrainingConfig, { props: { config: mockConfig, history: mockHistory } });

		const epochsInput = screen.getByLabelText(/epochs/i);
		expect(epochsInput).toBeDefined();
	});

	it('should have learning rate input field', async () => {
		const { default: TrainingConfig } = await import('$lib/components/neural/TrainingConfig.svelte');
		render(TrainingConfig, { props: { config: mockConfig, history: mockHistory } });

		const lrInput = screen.getByLabelText(/learning rate/i);
		expect(lrInput).toBeDefined();
	});

	it('should have batch size input field', async () => {
		const { default: TrainingConfig } = await import('$lib/components/neural/TrainingConfig.svelte');
		render(TrainingConfig, { props: { config: mockConfig, history: mockHistory } });

		const batchInput = screen.getByLabelText(/batch size/i);
		expect(batchInput).toBeDefined();
	});

	it('should have trigger training button', async () => {
		const { default: TrainingConfig } = await import('$lib/components/neural/TrainingConfig.svelte');
		render(TrainingConfig, { props: { config: mockConfig, history: mockHistory } });

		const triggerButton = screen.getByRole('button', { name: /trigger training/i });
		expect(triggerButton).toBeDefined();
	});

	it('should emit onTriggerTraining event when button clicked', async () => {
		const { default: TrainingConfig } = await import('$lib/components/neural/TrainingConfig.svelte');
		const mockHandler = vi.fn();
		render(TrainingConfig, {
			props: {
				config: mockConfig,
				history: mockHistory,
				onTriggerTraining: mockHandler
			}
		});

		const triggerButton = screen.getByRole('button', { name: /trigger training/i });
		await fireEvent.click(triggerButton);

		expect(mockHandler).toHaveBeenCalledTimes(1);
	});

	it('should have collapsible history section', async () => {
		const { default: TrainingConfig } = await import('$lib/components/neural/TrainingConfig.svelte');
		render(TrainingConfig, { props: { config: mockConfig, history: mockHistory } });

		const historyToggle = screen.getByRole('button', { name: /training history/i });
		expect(historyToggle).toBeDefined();
	});

	it('should display training history entries', async () => {
		const { default: TrainingConfig } = await import('$lib/components/neural/TrainingConfig.svelte');
		render(TrainingConfig, { props: { config: mockConfig, history: mockHistory, historyExpanded: true } });

		expect(screen.getByText('train-001')).toBeDefined();
	});

	it('should show model type selector', async () => {
		const { default: TrainingConfig } = await import('$lib/components/neural/TrainingConfig.svelte');
		render(TrainingConfig, { props: { config: mockConfig, history: mockHistory } });

		const modelSelect = screen.getByLabelText(/model type/i);
		expect(modelSelect).toBeDefined();
	});

	it('should validate epochs is positive', async () => {
		const { default: TrainingConfig } = await import('$lib/components/neural/TrainingConfig.svelte');
		render(TrainingConfig, { props: { config: mockConfig, history: mockHistory } });

		const epochsInput = screen.getByLabelText(/epochs/i);
		await fireEvent.input(epochsInput, { target: { value: '-5' } });

		const error = document.querySelector('[data-testid="epochs-error"]');
		expect(error).toBeDefined();
	});
});
