/**
 * TASK-108: Resource Dashboard Tests
 *
 * Tests for resource dashboard components including:
 * - Real-time resource usage display
 * - Historical usage charts (D3.js)
 * - Alerts when approaching limits
 * - Cost estimation display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as d3 from 'd3';
import type { UsageMetrics, DailyUsage } from '$lib/server/resources/usage';
import type { ResourceLimits } from '$lib/server/resources/limits';

/**
 * Mock usage data for tests
 */
const mockUsageMetrics: UsageMetrics = {
	agentHours: 25.5,
	apiCalls: 5000,
	storageUsedMB: 350,
	websocketConnections: 12,
	swarmExecutions: 8,
	timestamp: Date.now()
};

const mockLimits: ResourceLimits = {
	maxAgentsPerProject: 50,
	maxConcurrentSwarms: 10,
	storageQuotaMB: 500,
	maxApiCallsPerHour: 10000,
	maxWebSocketConnections: 100
};

const mockHistoricalData: DailyUsage[] = [
	{ date: '2024-01-10', agentHours: 20, apiCalls: 4000, storageUsedMB: 300, swarmExecutions: 5 },
	{ date: '2024-01-11', agentHours: 22, apiCalls: 4500, storageUsedMB: 320, swarmExecutions: 6 },
	{ date: '2024-01-12', agentHours: 18, apiCalls: 3500, storageUsedMB: 310, swarmExecutions: 4 },
	{ date: '2024-01-13', agentHours: 25, apiCalls: 5500, storageUsedMB: 340, swarmExecutions: 7 },
	{ date: '2024-01-14', agentHours: 28, apiCalls: 6000, storageUsedMB: 350, swarmExecutions: 9 },
	{ date: '2024-01-15', agentHours: 25.5, apiCalls: 5000, storageUsedMB: 350, swarmExecutions: 8 }
];

describe('Resource Dashboard', () => {
	describe('ResourceUsageData', () => {
		it('should calculate usage percentages', async () => {
			const { calculateUsagePercentages } = await import('$lib/components/resources/utils');

			const percentages = calculateUsagePercentages(mockUsageMetrics, mockLimits);

			expect(percentages.storage).toBeCloseTo(70, 0); // 350/500 = 70%
			expect(percentages.apiCalls).toBeCloseTo(50, 0); // 5000/10000 = 50%
		});

		it('should identify warning thresholds', async () => {
			const { getUsageStatus } = await import('$lib/components/resources/utils');

			// 70% storage should be warning
			const storageStatus = getUsageStatus(70);
			expect(storageStatus).toBe('warning');

			// 50% API calls should be normal
			const apiStatus = getUsageStatus(50);
			expect(apiStatus).toBe('normal');

			// 95% would be critical
			const criticalStatus = getUsageStatus(95);
			expect(criticalStatus).toBe('critical');
		});

		it('should determine alert levels', async () => {
			const { determineAlertLevel, AlertLevel } = await import('$lib/components/resources/utils');

			expect(determineAlertLevel(50)).toBe(AlertLevel.NONE);
			expect(determineAlertLevel(75)).toBe(AlertLevel.WARNING);
			expect(determineAlertLevel(90)).toBe(AlertLevel.DANGER);
			expect(determineAlertLevel(100)).toBe(AlertLevel.CRITICAL);
		});
	});

	describe('UsageGauge', () => {
		it('should calculate gauge arc path', async () => {
			const { createGaugeArc } = await import('$lib/components/resources/utils');

			const arcPath = createGaugeArc(70, 100);

			expect(arcPath).toBeDefined();
			expect(arcPath).toContain('M'); // Move command
			expect(arcPath).toContain('A'); // Arc command
		});

		it('should return correct color for percentage', async () => {
			const { getGaugeColor } = await import('$lib/components/resources/utils');

			expect(getGaugeColor(30)).toBe('#10b981'); // green
			expect(getGaugeColor(75)).toBe('#f59e0b'); // amber/warning
			expect(getGaugeColor(92)).toBe('#ef4444'); // red/danger
		});
	});

	describe('HistoricalUsageChart', () => {
		it('should create scales for chart data', () => {
			const xScale = d3.scaleTime()
				.domain([
					new Date('2024-01-10'),
					new Date('2024-01-15')
				])
				.range([0, 600]);

			const yScale = d3.scaleLinear()
				.domain([0, 30]) // max agent hours
				.range([300, 0]);

			expect(xScale(new Date('2024-01-10'))).toBe(0);
			expect(xScale(new Date('2024-01-15'))).toBe(600);
			expect(yScale(0)).toBe(300);
			expect(yScale(30)).toBe(0);
		});

		it('should generate line path for usage data', () => {
			const data = mockHistoricalData.map(d => ({
				x: new Date(d.date),
				y: d.agentHours
			}));

			const xScale = d3.scaleTime()
				.domain(d3.extent(data, d => d.x) as [Date, Date])
				.range([0, 600]);

			const yScale = d3.scaleLinear()
				.domain([0, d3.max(data, d => d.y) as number])
				.range([300, 0]);

			const lineGenerator = d3.line<{ x: Date; y: number }>()
				.x(d => xScale(d.x))
				.y(d => yScale(d.y));

			const path = lineGenerator(data);

			expect(path).toBeDefined();
			expect(path).toContain('M');
			expect(path).toContain('L');
		});

		it('should format date axis labels', () => {
			const formatDate = d3.utcFormat('%b %d');

			expect(formatDate(new Date('2024-01-15T12:00:00Z'))).toBe('Jan 15');
			expect(formatDate(new Date('2024-02-01T12:00:00Z'))).toBe('Feb 01');
		});
	});

	describe('AlertNotifications', () => {
		it('should generate alerts when approaching limits', async () => {
			const { generateAlerts } = await import('$lib/components/resources/utils');

			const usage: UsageMetrics = {
				...mockUsageMetrics,
				storageUsedMB: 450, // 90% of 500MB limit
				apiCalls: 8500 // 85% of 10000 limit
			};

			const alerts = generateAlerts(usage, mockLimits);

			expect(alerts.length).toBeGreaterThan(0);
			expect(alerts.some(a => a.type === 'storage')).toBe(true);
			expect(alerts.some(a => a.type === 'apiCalls')).toBe(true);
		});

		it('should categorize alerts by severity', async () => {
			const { categorizeAlerts, AlertLevel } = await import('$lib/components/resources/utils');

			const alerts = [
				{ type: 'storage', level: AlertLevel.DANGER, message: 'Storage 90% used' },
				{ type: 'apiCalls', level: AlertLevel.WARNING, message: 'API calls 75% used' },
				{ type: 'agents', level: AlertLevel.NONE, message: 'Agents at normal levels' }
			];

			const categorized = categorizeAlerts(alerts);

			expect(categorized.critical.length).toBe(0);
			expect(categorized.danger.length).toBe(1);
			expect(categorized.warning.length).toBe(1);
			expect(categorized.normal.length).toBe(1);
		});
	});

	describe('CostEstimation', () => {
		it('should estimate cost based on usage', async () => {
			const { estimateCost, CostBreakdown } = await import('$lib/components/resources/utils');

			const cost = estimateCost(mockUsageMetrics);

			expect(cost).toBeDefined();
			expect(cost.total).toBeGreaterThanOrEqual(0);
			expect(cost.breakdown).toBeDefined();
			expect(cost.breakdown.agents).toBeGreaterThanOrEqual(0);
			expect(cost.breakdown.storage).toBeGreaterThanOrEqual(0);
			expect(cost.breakdown.apiCalls).toBeGreaterThanOrEqual(0);
		});

		it('should apply tier-based pricing', async () => {
			const { estimateCostWithTier } = await import('$lib/components/resources/utils');

			const freeCost = estimateCostWithTier(mockUsageMetrics, 'free');
			const proCost = estimateCostWithTier(mockUsageMetrics, 'pro');

			// Pro tier should have lower per-unit costs
			expect(proCost.perUnitCosts.agentHour).toBeLessThanOrEqual(freeCost.perUnitCosts.agentHour);
		});

		it('should format currency values', async () => {
			const { formatCurrency } = await import('$lib/components/resources/utils');

			expect(formatCurrency(100)).toBe('$100.00');
			expect(formatCurrency(1234.567)).toBe('$1,234.57');
			expect(formatCurrency(0)).toBe('$0.00');
		});
	});

	describe('RealTimeUpdates', () => {
		it('should format update timestamps', async () => {
			const { formatLastUpdated } = await import('$lib/components/resources/utils');

			const now = Date.now();
			const oneMinuteAgo = now - 60000;
			const fiveMinutesAgo = now - 300000;

			expect(formatLastUpdated(now)).toContain('Just now');
			expect(formatLastUpdated(oneMinuteAgo)).toContain('1 minute');
			expect(formatLastUpdated(fiveMinutesAgo)).toContain('5 minutes');
		});

		it('should calculate time until reset', async () => {
			const { calculateTimeUntilReset } = await import('$lib/components/resources/utils');

			// Assuming hourly reset windows
			const result = calculateTimeUntilReset();

			expect(result.minutes).toBeGreaterThanOrEqual(0);
			expect(result.minutes).toBeLessThanOrEqual(60);
			expect(result.formatted).toMatch(/\d+ min/);
		});
	});

	describe('ProgressBar', () => {
		it('should calculate progress bar width', async () => {
			const { calculateProgressWidth } = await import('$lib/components/resources/utils');

			expect(calculateProgressWidth(50, 100)).toBe(50);
			expect(calculateProgressWidth(100, 100)).toBe(100);
			expect(calculateProgressWidth(150, 100)).toBe(100); // Cap at 100%
			expect(calculateProgressWidth(0, 100)).toBe(0);
		});

		it('should apply correct color classes', async () => {
			const { getProgressColorClass } = await import('$lib/components/resources/utils');

			expect(getProgressColorClass(30)).toBe('bg-green-500');
			expect(getProgressColorClass(75)).toBe('bg-amber-500');
			expect(getProgressColorClass(92)).toBe('bg-red-500');
		});
	});

	describe('DashboardSummary', () => {
		it('should compile summary statistics', async () => {
			const { compileSummary } = await import('$lib/components/resources/utils');

			const summary = compileSummary(mockUsageMetrics, mockLimits, mockHistoricalData);

			expect(summary.currentUsage).toBeDefined();
			expect(summary.trends).toBeDefined();
			expect(summary.alerts).toBeDefined();
			expect(summary.estimatedCost).toBeDefined();
		});

		it('should calculate usage trends', async () => {
			const { calculateTrend } = await import('$lib/components/resources/utils');

			const values = [20, 22, 18, 25, 28, 25.5];
			const trend = calculateTrend(values);

			expect(trend.direction).toBeDefined();
			expect(trend.changePercent).toBeDefined();
			expect(['up', 'down', 'stable']).toContain(trend.direction);
		});
	});
});

describe('D3 Chart Integration', () => {
	describe('Stacked Area Chart', () => {
		it('should create stacked data for multi-metric display', () => {
			const data = mockHistoricalData.map(d => ({
				date: new Date(d.date),
				agents: d.agentHours,
				swarms: d.swarmExecutions
			}));

			const stack = d3.stack<{ date: Date; agents: number; swarms: number }>()
				.keys(['agents', 'swarms']);

			const stackedData = stack(data);

			expect(stackedData).toHaveLength(2);
			expect(stackedData[0].key).toBe('agents');
			expect(stackedData[1].key).toBe('swarms');
		});
	});

	describe('Donut Chart', () => {
		it('should create pie layout for cost breakdown', () => {
			const costData = [
				{ name: 'Agents', value: 25 },
				{ name: 'Storage', value: 15 },
				{ name: 'API Calls', value: 10 }
			];

			const pieGenerator = d3.pie<{ name: string; value: number }>()
				.value(d => d.value);

			const arcs = pieGenerator(costData);

			expect(arcs).toHaveLength(3);
			expect(arcs[0].startAngle).toBeDefined();
			expect(arcs[0].endAngle).toBeDefined();
		});

		it('should generate arc paths', () => {
			const arcGenerator = d3.arc<d3.PieArcDatum<{ name: string; value: number }>>()
				.innerRadius(50)
				.outerRadius(100);

			const testDatum: d3.PieArcDatum<{ name: string; value: number }> = {
				data: { name: 'Test', value: 50 },
				value: 50,
				index: 0,
				startAngle: 0,
				endAngle: Math.PI,
				padAngle: 0
			};

			const path = arcGenerator(testDatum);

			expect(path).toBeDefined();
			expect(path).toContain('M');
			expect(path).toContain('A');
		});
	});

	describe('Tooltip Positioning', () => {
		it('should calculate tooltip position', async () => {
			const { calculateTooltipPosition } = await import('$lib/components/resources/utils');

			const position = calculateTooltipPosition(100, 100, 800, 600, 200, 100);

			expect(position.x).toBeGreaterThanOrEqual(0);
			expect(position.y).toBeGreaterThanOrEqual(0);
			expect(position.x + 200).toBeLessThanOrEqual(800);
			expect(position.y + 100).toBeLessThanOrEqual(600);
		});
	});
});
