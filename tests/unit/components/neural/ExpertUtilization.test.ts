/**
 * TASK-077: Expert Utilization Component Tests
 *
 * Tests for the MoE (Mixture of Experts) utilization bar chart component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import type { ExpertStats } from '$lib/types/neural';

// Mock expert utilization data
const mockExpertStats: ExpertStats[] = [
	{ expertId: 'coder', name: 'Coder Expert', utilization: 0.85, taskCount: 42 },
	{ expertId: 'tester', name: 'Tester Expert', utilization: 0.65, taskCount: 28 },
	{ expertId: 'reviewer', name: 'Reviewer Expert', utilization: 0.45, taskCount: 15 },
	{ expertId: 'architect', name: 'Architect Expert', utilization: 0.30, taskCount: 10 }
];

describe('ExpertUtilization', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render component container', async () => {
		const { default: ExpertUtilization } = await import('$lib/components/neural/ExpertUtilization.svelte');
		render(ExpertUtilization, { props: { experts: mockExpertStats } });

		const container = document.querySelector('[data-testid="expert-utilization"]');
		expect(container).toBeDefined();
	});

	it('should display component title', async () => {
		const { default: ExpertUtilization } = await import('$lib/components/neural/ExpertUtilization.svelte');
		render(ExpertUtilization, { props: { experts: mockExpertStats } });

		expect(screen.getByText(/expert utilization/i)).toBeDefined();
	});

	it('should render bar for each expert', async () => {
		const { default: ExpertUtilization } = await import('$lib/components/neural/ExpertUtilization.svelte');
		render(ExpertUtilization, { props: { experts: mockExpertStats } });

		const bars = document.querySelectorAll('[data-testid^="expert-bar-"]');
		expect(bars.length).toBe(4);
	});

	it('should display expert names', async () => {
		const { default: ExpertUtilization } = await import('$lib/components/neural/ExpertUtilization.svelte');
		render(ExpertUtilization, { props: { experts: mockExpertStats } });

		expect(screen.getByText('Coder Expert')).toBeDefined();
		expect(screen.getByText('Tester Expert')).toBeDefined();
	});

	it('should show utilization percentages', async () => {
		const { default: ExpertUtilization } = await import('$lib/components/neural/ExpertUtilization.svelte');
		render(ExpertUtilization, { props: { experts: mockExpertStats } });

		expect(screen.getByText('85%')).toBeDefined();
		expect(screen.getByText('65%')).toBeDefined();
	});

	it('should handle empty experts list', async () => {
		const { default: ExpertUtilization } = await import('$lib/components/neural/ExpertUtilization.svelte');
		render(ExpertUtilization, { props: { experts: [] } });

		expect(screen.getByText(/no expert data/i)).toBeDefined();
	});

	it('should highlight top utilized expert', async () => {
		const { default: ExpertUtilization } = await import('$lib/components/neural/ExpertUtilization.svelte');
		render(ExpertUtilization, { props: { experts: mockExpertStats } });

		const topExpert = document.querySelector('[data-testid="expert-bar-coder"]');
		expect(topExpert?.classList.contains('top-expert') || topExpert?.getAttribute('data-top') === 'true').toBeTruthy();
	});
});
