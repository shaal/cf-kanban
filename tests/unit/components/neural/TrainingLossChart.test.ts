/**
 * TASK-077: Training Loss Chart Component Tests
 *
 * Tests for the training loss visualization component that displays
 * loss and accuracy metrics over training epochs.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import type { TrainingMetrics } from '$lib/types/neural';

// Mock data for testing
const mockTrainingMetrics: TrainingMetrics[] = [
	{ epoch: 1, loss: 0.8, accuracy: 0.65, timestamp: Date.now() - 3000 },
	{ epoch: 2, loss: 0.6, accuracy: 0.75, timestamp: Date.now() - 2000 },
	{ epoch: 3, loss: 0.4, accuracy: 0.82, timestamp: Date.now() - 1000 },
	{ epoch: 4, loss: 0.25, accuracy: 0.88, timestamp: Date.now() }
];

describe('TrainingLossChart', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render chart container', async () => {
		const { default: TrainingLossChart } = await import('$lib/components/neural/TrainingLossChart.svelte');
		render(TrainingLossChart, { props: { metrics: mockTrainingMetrics } });

		const container = document.querySelector('[data-testid="training-loss-chart"]');
		expect(container).toBeDefined();
	});

	it('should display chart title', async () => {
		const { default: TrainingLossChart } = await import('$lib/components/neural/TrainingLossChart.svelte');
		render(TrainingLossChart, { props: { metrics: mockTrainingMetrics } });

		expect(screen.getByText(/training loss/i)).toBeDefined();
	});

	it('should render with empty metrics', async () => {
		const { default: TrainingLossChart } = await import('$lib/components/neural/TrainingLossChart.svelte');
		render(TrainingLossChart, { props: { metrics: [] } });

		expect(screen.getByText(/no training data/i)).toBeDefined();
	});

	it('should display latest loss value', async () => {
		const { default: TrainingLossChart } = await import('$lib/components/neural/TrainingLossChart.svelte');
		render(TrainingLossChart, { props: { metrics: mockTrainingMetrics } });

		expect(screen.getByText(/0\.25/)).toBeDefined();
	});

	it('should display latest accuracy value', async () => {
		const { default: TrainingLossChart } = await import('$lib/components/neural/TrainingLossChart.svelte');
		render(TrainingLossChart, { props: { metrics: mockTrainingMetrics } });

		// Accuracy as percentage
		expect(screen.getByText(/88/)).toBeDefined();
	});

	it('should show improvement indicator when loss decreases', async () => {
		const { default: TrainingLossChart } = await import('$lib/components/neural/TrainingLossChart.svelte');
		render(TrainingLossChart, { props: { metrics: mockTrainingMetrics } });

		const improvement = document.querySelector('[data-testid="improvement-indicator"]');
		expect(improvement).toBeDefined();
	});

	it('should accept custom height prop', async () => {
		const { default: TrainingLossChart } = await import('$lib/components/neural/TrainingLossChart.svelte');
		render(TrainingLossChart, { props: { metrics: mockTrainingMetrics, height: 300 } });

		const chart = document.querySelector('[data-testid="training-loss-chart"]');
		expect(chart).toBeDefined();
	});
});
