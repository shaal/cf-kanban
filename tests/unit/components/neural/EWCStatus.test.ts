/**
 * TASK-077: EWC Status Component Tests
 *
 * Tests for the Elastic Weight Consolidation status indicator component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import type { EWCMetrics } from '$lib/types/neural';

// Mock EWC metrics
const mockEWCMetrics: EWCMetrics = {
	fisherImportance: 0.85,
	consolidationStrength: 0.92,
	forgettingRate: 0.03,
	lastConsolidation: Date.now() - 60000,
	totalConsolidations: 15,
	protectedPatterns: 42
};

describe('EWCStatus', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render component container', async () => {
		const { default: EWCStatus } = await import('$lib/components/neural/EWCStatus.svelte');
		render(EWCStatus, { props: { metrics: mockEWCMetrics } });

		const container = document.querySelector('[data-testid="ewc-status"]');
		expect(container).toBeDefined();
	});

	it('should display component title', async () => {
		const { default: EWCStatus } = await import('$lib/components/neural/EWCStatus.svelte');
		render(EWCStatus, { props: { metrics: mockEWCMetrics } });

		expect(screen.getByText(/forgetting prevention/i)).toBeDefined();
	});

	it('should show consolidation strength indicator', async () => {
		const { default: EWCStatus } = await import('$lib/components/neural/EWCStatus.svelte');
		render(EWCStatus, { props: { metrics: mockEWCMetrics } });

		expect(screen.getByText(/92%/)).toBeDefined();
	});

	it('should display forgetting rate', async () => {
		const { default: EWCStatus } = await import('$lib/components/neural/EWCStatus.svelte');
		render(EWCStatus, { props: { metrics: mockEWCMetrics } });

		// 3% forgetting rate
		expect(screen.getByText(/3%/)).toBeDefined();
	});

	it('should show protected patterns count', async () => {
		const { default: EWCStatus } = await import('$lib/components/neural/EWCStatus.svelte');
		render(EWCStatus, { props: { metrics: mockEWCMetrics } });

		expect(screen.getByText('42')).toBeDefined();
	});

	it('should display status indicator based on forgetting rate', async () => {
		const { default: EWCStatus } = await import('$lib/components/neural/EWCStatus.svelte');
		render(EWCStatus, { props: { metrics: mockEWCMetrics } });

		// Low forgetting rate (< 5%) should show healthy status
		const status = document.querySelector('[data-testid="ewc-health-status"]');
		expect(status?.getAttribute('data-status')).toBe('healthy');
	});

	it('should show warning status for high forgetting rate', async () => {
		const { default: EWCStatus } = await import('$lib/components/neural/EWCStatus.svelte');
		const highForgettingMetrics = { ...mockEWCMetrics, forgettingRate: 0.15 };
		render(EWCStatus, { props: { metrics: highForgettingMetrics } });

		const status = document.querySelector('[data-testid="ewc-health-status"]');
		expect(status?.getAttribute('data-status')).toBe('warning');
	});

	it('should display time since last consolidation', async () => {
		const { default: EWCStatus } = await import('$lib/components/neural/EWCStatus.svelte');
		render(EWCStatus, { props: { metrics: mockEWCMetrics } });

		expect(screen.getByText(/last consolidation/i)).toBeDefined();
	});

	it('should handle null metrics gracefully', async () => {
		const { default: EWCStatus } = await import('$lib/components/neural/EWCStatus.svelte');
		render(EWCStatus, { props: { metrics: null } });

		expect(screen.getByText(/no ewc data/i)).toBeDefined();
	});
});
