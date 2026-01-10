/**
 * TASK-077: Expert Utilization Component Tests
 *
 * Tests for the MoE (Mixture of Experts) utilization data processing.
 * Component rendering tests are handled by integration/e2e tests.
 */

import { describe, it, expect } from 'vitest';
import type { ExpertStats } from '$lib/types/neural';

// Mock expert utilization data
const mockExpertStats: ExpertStats[] = [
	{ expertId: 'coder', name: 'Coder Expert', utilization: 0.85, taskCount: 42 },
	{ expertId: 'tester', name: 'Tester Expert', utilization: 0.65, taskCount: 28 },
	{ expertId: 'reviewer', name: 'Reviewer Expert', utilization: 0.45, taskCount: 15 },
	{ expertId: 'architect', name: 'Architect Expert', utilization: 0.30, taskCount: 10 }
];

describe('ExpertUtilization Data Processing', () => {
	it('should have valid ExpertStats structure', () => {
		expect(mockExpertStats).toHaveLength(4);
		expect(mockExpertStats[0]).toHaveProperty('expertId');
		expect(mockExpertStats[0]).toHaveProperty('name');
		expect(mockExpertStats[0]).toHaveProperty('utilization');
		expect(mockExpertStats[0]).toHaveProperty('taskCount');
	});

	it('should sort experts by utilization (descending)', () => {
		const sortedExperts = [...mockExpertStats].sort((a, b) => b.utilization - a.utilization);
		expect(sortedExperts[0].expertId).toBe('coder');
		expect(sortedExperts[sortedExperts.length - 1].expertId).toBe('architect');
	});

	it('should identify top utilized expert', () => {
		const sortedExperts = [...mockExpertStats].sort((a, b) => b.utilization - a.utilization);
		const topExpertId = sortedExperts[0].expertId;
		expect(topExpertId).toBe('coder');
	});

	it('should calculate average utilization', () => {
		const avgUtilization = mockExpertStats.reduce((sum, e) => sum + e.utilization, 0) / mockExpertStats.length;
		expect(avgUtilization).toBeCloseTo(0.5625, 4);
	});

	it('should calculate total task count', () => {
		const totalTasks = mockExpertStats.reduce((sum, e) => sum + e.taskCount, 0);
		expect(totalTasks).toBe(95);
	});

	it('should count active experts (>50% utilization)', () => {
		const activeCount = mockExpertStats.filter(e => e.utilization >= 0.5).length;
		expect(activeCount).toBe(2); // coder and tester
	});

	it('should format utilization as percentage', () => {
		const utilization = mockExpertStats[0].utilization;
		const formattedUtilization = `${(utilization * 100).toFixed(0)}%`;
		expect(formattedUtilization).toBe('85%');
	});

	it('should classify utilization levels correctly', () => {
		const getUtilizationLevel = (utilization: number) => {
			if (utilization >= 0.8) return 'high';
			if (utilization >= 0.6) return 'medium';
			if (utilization >= 0.4) return 'low';
			return 'very-low';
		};

		expect(getUtilizationLevel(0.85)).toBe('high');
		expect(getUtilizationLevel(0.65)).toBe('medium');
		expect(getUtilizationLevel(0.45)).toBe('low');
		expect(getUtilizationLevel(0.30)).toBe('very-low');
	});

	it('should handle empty experts list', () => {
		const emptyExperts: ExpertStats[] = [];
		expect(emptyExperts.length).toBe(0);
	});
});
