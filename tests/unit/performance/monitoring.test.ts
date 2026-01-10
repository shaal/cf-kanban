/**
 * TASK-095: Performance Monitoring Tests
 *
 * Tests for web-vitals integration, custom performance marks,
 * performance dashboard, and degradation alerts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Performance Monitoring', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset performance mock
		vi.spyOn(performance, 'now').mockReturnValue(0);
		vi.spyOn(performance, 'mark').mockImplementation(() => ({
			name: 'test',
			entryType: 'mark',
			startTime: 0,
			duration: 0,
			detail: null,
			toJSON: () => ({})
		}));
		vi.spyOn(performance, 'measure').mockImplementation(() => ({
			name: 'test',
			entryType: 'measure',
			startTime: 0,
			duration: 100,
			detail: null,
			toJSON: () => ({})
		}));
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Web Vitals Integration', () => {
		it('should export initWebVitals function', async () => {
			const { initWebVitals } = await import('$lib/performance/monitoring');
			expect(typeof initWebVitals).toBe('function');
		});

		it('should export web vitals metric types', async () => {
			const { WEB_VITAL_THRESHOLDS } = await import('$lib/performance/monitoring');

			expect(WEB_VITAL_THRESHOLDS).toBeDefined();
			expect(WEB_VITAL_THRESHOLDS.LCP).toBeDefined();
			expect(WEB_VITAL_THRESHOLDS.FID).toBeDefined();
			expect(WEB_VITAL_THRESHOLDS.CLS).toBeDefined();
		});

		it('should define good/needs-improvement/poor thresholds', async () => {
			const { WEB_VITAL_THRESHOLDS } = await import('$lib/performance/monitoring');

			expect(WEB_VITAL_THRESHOLDS.LCP.good).toBeLessThan(WEB_VITAL_THRESHOLDS.LCP.poor);
			expect(WEB_VITAL_THRESHOLDS.FID.good).toBeLessThan(WEB_VITAL_THRESHOLDS.FID.poor);
			expect(WEB_VITAL_THRESHOLDS.CLS.good).toBeLessThan(WEB_VITAL_THRESHOLDS.CLS.poor);
		});

		it('should classify metric values correctly', async () => {
			const { classifyMetric } = await import('$lib/performance/monitoring');

			// LCP thresholds: good < 2500, poor >= 4000
			expect(classifyMetric('LCP', 1000)).toBe('good');
			expect(classifyMetric('LCP', 3000)).toBe('needs-improvement');
			expect(classifyMetric('LCP', 5000)).toBe('poor');
		});
	});

	describe('Custom Performance Marks', () => {
		it('should export startMark function', async () => {
			const { startMark } = await import('$lib/performance/monitoring');
			expect(typeof startMark).toBe('function');
		});

		it('should create a performance mark', async () => {
			const { startMark } = await import('$lib/performance/monitoring');

			startMark('page-load');

			expect(performance.mark).toHaveBeenCalledWith('page-load-start');
		});

		it('should export endMark function', async () => {
			const { endMark } = await import('$lib/performance/monitoring');
			expect(typeof endMark).toBe('function');
		});

		it('should measure between start and end marks', async () => {
			const { startMark, endMark } = await import('$lib/performance/monitoring');

			startMark('api-call');
			endMark('api-call');

			expect(performance.mark).toHaveBeenCalledWith('api-call-start');
			expect(performance.mark).toHaveBeenCalledWith('api-call-end');
			expect(performance.measure).toHaveBeenCalledWith(
				'api-call',
				'api-call-start',
				'api-call-end'
			);
		});

		it('should return measurement duration', async () => {
			const { startMark, endMark } = await import('$lib/performance/monitoring');

			vi.spyOn(performance, 'measure').mockReturnValue({
				name: 'test',
				entryType: 'measure',
				startTime: 0,
				duration: 150,
				detail: null,
				toJSON: () => ({})
			} as PerformanceMeasure);

			startMark('render');
			const duration = endMark('render');

			expect(duration).toBe(150);
		});
	});

	describe('Performance Metrics Collection', () => {
		it('should export collectMetrics function', async () => {
			const { collectMetrics } = await import('$lib/performance/monitoring');
			expect(typeof collectMetrics).toBe('function');
		});

		it('should collect navigation timing metrics', async () => {
			const { collectMetrics } = await import('$lib/performance/monitoring');

			const metrics = await collectMetrics();

			expect(metrics).toHaveProperty('timestamp');
			expect(metrics).toHaveProperty('pageLoad');
		});

		it('should include custom metrics', async () => {
			const { collectMetrics, recordMetric } = await import('$lib/performance/monitoring');

			recordMetric('api-response-time', 120);

			const metrics = await collectMetrics();

			expect(metrics.custom).toBeDefined();
			expect(metrics.custom['api-response-time']).toBe(120);
		});
	});

	describe('Performance Dashboard Data', () => {
		it('should export getDashboardData function', async () => {
			const { getDashboardData } = await import('$lib/performance/monitoring');
			expect(typeof getDashboardData).toBe('function');
		});

		it('should aggregate metrics over time periods', async () => {
			const { getDashboardData, recordMetric } = await import(
				'$lib/performance/monitoring'
			);

			// Record some metrics
			recordMetric('LCP', 2000);
			recordMetric('LCP', 2500);
			recordMetric('LCP', 1800);

			const data = getDashboardData();

			expect(data.metrics).toBeDefined();
			expect(data.metrics.LCP).toBeDefined();
			expect(data.metrics.LCP.average).toBeDefined();
		});

		it('should include p75 and p95 percentiles', async () => {
			const { getDashboardData, recordMetric, clearMetrics } = await import(
				'$lib/performance/monitoring'
			);

			clearMetrics();

			// Record enough metrics for percentile calculation
			for (let i = 1; i <= 100; i++) {
				recordMetric('test-metric', i * 10);
			}

			const data = getDashboardData();

			expect(data.metrics['test-metric'].p75).toBeDefined();
			expect(data.metrics['test-metric'].p95).toBeDefined();
		});
	});

	describe('Degradation Alerts', () => {
		it('should export setAlertThreshold function', async () => {
			const { setAlertThreshold } = await import('$lib/performance/monitoring');
			expect(typeof setAlertThreshold).toBe('function');
		});

		it('should configure alert thresholds', async () => {
			const { setAlertThreshold, getAlertThreshold } = await import(
				'$lib/performance/monitoring'
			);

			setAlertThreshold('page-load', 2000);

			expect(getAlertThreshold('page-load')).toBe(2000);
		});

		it('should export checkAlerts function', async () => {
			const { checkAlerts } = await import('$lib/performance/monitoring');
			expect(typeof checkAlerts).toBe('function');
		});

		it('should detect threshold violations', async () => {
			const { setAlertThreshold, recordMetric, checkAlerts, clearMetrics } = await import(
				'$lib/performance/monitoring'
			);

			clearMetrics();
			setAlertThreshold('api-response', 200);
			recordMetric('api-response', 350); // Exceeds threshold

			const alerts = checkAlerts();

			expect(alerts).toContainEqual(
				expect.objectContaining({
					metric: 'api-response',
					status: 'violated'
				})
			);
		});

		it('should include alert severity levels', async () => {
			const { setAlertThreshold, recordMetric, checkAlerts, clearMetrics } = await import(
				'$lib/performance/monitoring'
			);

			clearMetrics();
			setAlertThreshold('slow-metric', 100, { severity: 'critical' });
			recordMetric('slow-metric', 200);

			const alerts = checkAlerts();

			expect(alerts[0].severity).toBe('critical');
		});
	});

	describe('Performance Budgets', () => {
		it('should export setPerformanceBudget function', async () => {
			const { setPerformanceBudget } = await import('$lib/performance/monitoring');
			expect(typeof setPerformanceBudget).toBe('function');
		});

		it('should define budgets for page load targets', async () => {
			const { setPerformanceBudget, checkBudgets, clearBudgets } = await import(
				'$lib/performance/monitoring'
			);

			clearBudgets();
			setPerformanceBudget('page-load', 2000);

			const budgets = checkBudgets({ 'page-load': 1500 });

			expect(budgets['page-load'].status).toBe('within-budget');
		});

		it('should flag over-budget metrics', async () => {
			const { setPerformanceBudget, checkBudgets, clearBudgets } = await import(
				'$lib/performance/monitoring'
			);

			clearBudgets();
			setPerformanceBudget('api-response', 200);

			const budgets = checkBudgets({ 'api-response': 350 });

			expect(budgets['api-response'].status).toBe('over-budget');
			expect(budgets['api-response'].overBy).toBe(150);
		});
	});

	describe('Real User Monitoring (RUM)', () => {
		it('should export startRUM function', async () => {
			const { startRUM } = await import('$lib/performance/monitoring');
			expect(typeof startRUM).toBe('function');
		});

		it('should track user interactions', async () => {
			const { startRUM, recordInteraction, getInteractions, stopRUM } = await import(
				'$lib/performance/monitoring'
			);

			startRUM();
			recordInteraction('click', 'submit-button', 50);
			recordInteraction('click', 'nav-link', 30);

			const interactions = getInteractions();

			expect(interactions).toHaveLength(2);
			expect(interactions[0].target).toBe('submit-button');

			stopRUM();
		});

		it('should aggregate interaction metrics', async () => {
			const { startRUM, recordInteraction, getInteractionStats, stopRUM } = await import(
				'$lib/performance/monitoring'
			);

			startRUM();
			recordInteraction('click', 'button', 50);
			recordInteraction('click', 'button', 60);
			recordInteraction('click', 'button', 40);

			const stats = getInteractionStats();

			expect(stats.click.count).toBe(3);
			expect(stats.click.average).toBe(50);

			stopRUM();
		});
	});

	describe('Performance Reporting', () => {
		it('should export generateReport function', async () => {
			const { generateReport } = await import('$lib/performance/monitoring');
			expect(typeof generateReport).toBe('function');
		});

		it('should generate summary report', async () => {
			const { generateReport, recordMetric, clearMetrics } = await import(
				'$lib/performance/monitoring'
			);

			clearMetrics();
			recordMetric('LCP', 2000);
			recordMetric('FID', 50);
			recordMetric('CLS', 0.05);

			const report = generateReport();

			expect(report.summary).toBeDefined();
			expect(report.details).toBeDefined();
			expect(report.generatedAt).toBeDefined();
		});

		it('should include recommendations for poor metrics', async () => {
			const { generateReport, recordMetric, clearMetrics } = await import(
				'$lib/performance/monitoring'
			);

			clearMetrics();
			recordMetric('LCP', 5000); // Poor LCP

			const report = generateReport();

			expect(report.recommendations).toBeDefined();
			expect(report.recommendations.length).toBeGreaterThan(0);
		});
	});
});
