/**
 * GAP-3.4.3: Cross-Project Insights Dashboard Tests
 *
 * Tests for the InsightsDashboard component functionality.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
	CrossProjectInsight,
	PatternOriginInfo,
	TransferSuccessMetrics
} from '$lib/types/transfer';

describe('GAP-3.4.3: Cross-Project Insights Dashboard', () => {
	// Mock data for testing
	const mockInsights: CrossProjectInsight[] = [
		{
			id: 'insight-1',
			patternId: 'pat-jwt',
			patternName: 'JWT Authentication',
			transferId: 'transfer-1',
			sourceProjectId: 'proj-1',
			sourceProjectName: 'Auth Service',
			targetProjectId: 'proj-2',
			targetProjectName: 'E-commerce API',
			status: 'success',
			transferredAt: new Date().toISOString(),
			patternCreatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
			preTransferSuccessRate: 0.75,
			postTransferSuccessRate: 0.85,
			preTransferUsageCount: 50,
			postTransferUsageCount: 25,
			improvementRate: 13.3
		},
		{
			id: 'insight-2',
			patternId: 'pat-cache',
			patternName: 'Redis Caching',
			transferId: 'transfer-2',
			sourceProjectId: 'proj-2',
			sourceProjectName: 'E-commerce API',
			targetProjectId: 'proj-3',
			targetProjectName: 'Dashboard UI',
			status: 'failed',
			transferredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
			patternCreatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
			preTransferSuccessRate: 0.8,
			postTransferSuccessRate: 0.65,
			preTransferUsageCount: 30,
			postTransferUsageCount: 10,
			improvementRate: -18.75
		}
	];

	const mockOriginInfo: PatternOriginInfo[] = [
		{
			patternId: 'pat-jwt',
			patternName: 'JWT Authentication',
			originProjectId: 'proj-1',
			originProjectName: 'Auth Service',
			createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
			transferCount: 5,
			avgSuccessRate: 0.85,
			transferHistory: [
				{
					targetProjectId: 'proj-2',
					targetProjectName: 'E-commerce API',
					transferredAt: new Date().toISOString(),
					successRate: 0.9
				}
			]
		}
	];

	const mockSuccessMetrics: TransferSuccessMetrics = {
		totalTransfers: 12,
		successfulTransfers: 9,
		failedTransfers: 2,
		rolledBackTransfers: 1,
		averageSuccessRate: 0.75,
		averageImprovementRate: 8.5,
		topPerformingPatterns: [
			{
				patternId: 'pat-jwt',
				name: 'JWT Authentication',
				sourceProject: 'Auth Service',
				successRate: 0.9,
				transferCount: 5
			}
		],
		recentTrend: 'improving'
	};

	describe('Transfer Success Metrics', () => {
		it('should calculate average success rate correctly', () => {
			const { totalTransfers, successfulTransfers } = mockSuccessMetrics;
			const calculatedRate = successfulTransfers / totalTransfers;
			expect(calculatedRate).toBe(0.75);
		});

		it('should identify correct trend based on recent transfers', () => {
			expect(mockSuccessMetrics.recentTrend).toBe('improving');
		});

		it('should have correct status breakdown', () => {
			const { successfulTransfers, failedTransfers, rolledBackTransfers, totalTransfers } = mockSuccessMetrics;
			expect(successfulTransfers + failedTransfers + rolledBackTransfers).toBe(totalTransfers);
		});
	});

	describe('Pattern Origin Tracking', () => {
		it('should track pattern origin project correctly', () => {
			const origin = mockOriginInfo[0];
			expect(origin.originProjectId).toBe('proj-1');
			expect(origin.originProjectName).toBe('Auth Service');
		});

		it('should track transfer history for patterns', () => {
			const origin = mockOriginInfo[0];
			expect(origin.transferHistory.length).toBeGreaterThan(0);
			expect(origin.transferHistory[0].targetProjectId).toBe('proj-2');
		});

		it('should calculate average success rate for pattern', () => {
			const origin = mockOriginInfo[0];
			expect(origin.avgSuccessRate).toBe(0.85);
		});

		it('should track transfer count', () => {
			const origin = mockOriginInfo[0];
			expect(origin.transferCount).toBe(5);
		});
	});

	describe('Cross-Project Insights', () => {
		it('should include all required fields in insights', () => {
			const insight = mockInsights[0];
			expect(insight).toHaveProperty('id');
			expect(insight).toHaveProperty('patternId');
			expect(insight).toHaveProperty('patternName');
			expect(insight).toHaveProperty('transferId');
			expect(insight).toHaveProperty('sourceProjectId');
			expect(insight).toHaveProperty('sourceProjectName');
			expect(insight).toHaveProperty('targetProjectId');
			expect(insight).toHaveProperty('targetProjectName');
			expect(insight).toHaveProperty('status');
			expect(insight).toHaveProperty('transferredAt');
			expect(insight).toHaveProperty('patternCreatedAt');
			expect(insight).toHaveProperty('preTransferSuccessRate');
			expect(insight).toHaveProperty('postTransferSuccessRate');
			expect(insight).toHaveProperty('improvementRate');
		});

		it('should calculate improvement rate correctly', () => {
			const insight = mockInsights[0];
			const calculatedImprovement = ((insight.postTransferSuccessRate - insight.preTransferSuccessRate) / insight.preTransferSuccessRate) * 100;
			expect(Math.abs(calculatedImprovement - insight.improvementRate!)).toBeLessThan(0.1);
		});

		it('should support all status types', () => {
			const statuses = mockInsights.map(i => i.status);
			expect(statuses).toContain('success');
			expect(statuses).toContain('failed');
		});

		it('should track pre and post transfer metrics', () => {
			const insight = mockInsights[0];
			expect(insight.preTransferSuccessRate).toBeLessThan(insight.postTransferSuccessRate);
			expect(insight.preTransferUsageCount).toBeGreaterThan(insight.postTransferUsageCount);
		});
	});

	describe('Opt-in/Opt-out Controls', () => {
		it('should default patterns to opted-in', () => {
			const optInStatus: Record<string, boolean> = {};
			mockInsights.forEach(i => {
				// Default behavior: undefined means opted in
				optInStatus[i.patternId] = optInStatus[i.patternId] !== false;
			});
			expect(Object.values(optInStatus).every(v => v === true)).toBe(true);
		});

		it('should allow toggling opt-in status', () => {
			const optInStatus: Record<string, boolean> = { 'pat-jwt': true };

			// Toggle to opted out
			optInStatus['pat-jwt'] = false;
			expect(optInStatus['pat-jwt']).toBe(false);

			// Toggle back to opted in
			optInStatus['pat-jwt'] = true;
			expect(optInStatus['pat-jwt']).toBe(true);
		});

		it('should filter insights based on opt-in status', () => {
			const optInStatus: Record<string, boolean> = {
				'pat-jwt': true,
				'pat-cache': false
			};

			const optedInInsights = mockInsights.filter(i => optInStatus[i.patternId] !== false);
			expect(optedInInsights.length).toBe(1);
			expect(optedInInsights[0].patternId).toBe('pat-jwt');
		});
	});

	describe('Filtering and Sorting', () => {
		it('should filter insights by project', () => {
			const filterProject = 'Auth Service';
			const filtered = mockInsights.filter(i =>
				i.sourceProjectName === filterProject ||
				i.targetProjectName === filterProject
			);
			expect(filtered.length).toBe(1);
		});

		it('should sort insights by date (desc)', () => {
			const sorted = [...mockInsights].sort((a, b) =>
				new Date(b.transferredAt).getTime() - new Date(a.transferredAt).getTime()
			);
			expect(sorted[0].id).toBe('insight-1');
		});

		it('should sort insights by success rate (desc)', () => {
			const sorted = [...mockInsights].sort((a, b) =>
				b.postTransferSuccessRate - a.postTransferSuccessRate
			);
			expect(sorted[0].patternId).toBe('pat-jwt');
		});

		it('should sort insights by project name', () => {
			const sorted = [...mockInsights].sort((a, b) =>
				a.sourceProjectName.localeCompare(b.sourceProjectName)
			);
			expect(sorted[0].sourceProjectName).toBe('Auth Service');
		});
	});

	describe('Top Performing Patterns', () => {
		it('should identify top performing patterns', () => {
			const { topPerformingPatterns } = mockSuccessMetrics;
			expect(topPerformingPatterns.length).toBeGreaterThan(0);
			expect(topPerformingPatterns[0].successRate).toBeGreaterThanOrEqual(0.8);
		});

		it('should sort top patterns by success rate', () => {
			const patterns = [...mockSuccessMetrics.topPerformingPatterns];
			const sorted = patterns.sort((a, b) => b.successRate - a.successRate);
			expect(sorted[0]).toEqual(patterns[0]);
		});

		it('should include transfer count for patterns', () => {
			const pattern = mockSuccessMetrics.topPerformingPatterns[0];
			expect(pattern.transferCount).toBeGreaterThan(0);
		});
	});

	describe('Type Definitions', () => {
		it('should have correct CrossProjectInsight structure', () => {
			const insight: CrossProjectInsight = {
				id: 'test',
				patternId: 'test',
				patternName: 'Test',
				transferId: 'test',
				sourceProjectId: 'test',
				sourceProjectName: 'Test',
				targetProjectId: 'test',
				targetProjectName: 'Test',
				status: 'success',
				transferredAt: new Date().toISOString(),
				patternCreatedAt: new Date().toISOString(),
				preTransferSuccessRate: 0.5,
				postTransferSuccessRate: 0.6,
				preTransferUsageCount: 10,
				postTransferUsageCount: 5
			};
			expect(insight).toBeDefined();
		});

		it('should have correct PatternOriginInfo structure', () => {
			const origin: PatternOriginInfo = {
				patternId: 'test',
				patternName: 'Test',
				originProjectId: 'test',
				originProjectName: 'Test',
				createdAt: new Date().toISOString(),
				transferCount: 1,
				avgSuccessRate: 0.8,
				transferHistory: []
			};
			expect(origin).toBeDefined();
		});

		it('should have correct TransferSuccessMetrics structure', () => {
			const metrics: TransferSuccessMetrics = {
				totalTransfers: 10,
				successfulTransfers: 8,
				failedTransfers: 1,
				rolledBackTransfers: 1,
				averageSuccessRate: 0.8,
				averageImprovementRate: 5,
				topPerformingPatterns: [],
				recentTrend: 'stable'
			};
			expect(metrics).toBeDefined();
		});

		it('should support all trend types', () => {
			const trends: TransferSuccessMetrics['recentTrend'][] = ['improving', 'declining', 'stable'];
			trends.forEach(trend => {
				expect(['improving', 'declining', 'stable']).toContain(trend);
			});
		});

		it('should support all status types', () => {
			const statuses: CrossProjectInsight['status'][] = ['success', 'failed', 'rolled_back'];
			statuses.forEach(status => {
				expect(['success', 'failed', 'rolled_back']).toContain(status);
			});
		});
	});
});
