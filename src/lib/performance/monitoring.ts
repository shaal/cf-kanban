/**
 * TASK-095: Performance Monitoring Module
 *
 * Provides web-vitals integration, custom performance marks,
 * performance dashboard data, and degradation alerts.
 */

// Type definitions
type MetricClassification = 'good' | 'needs-improvement' | 'poor';
type AlertSeverity = 'info' | 'warning' | 'critical';
type BudgetStatus = 'within-budget' | 'over-budget';

interface Threshold {
	good: number;
	poor: number;
}

interface MetricStats {
	count: number;
	average: number;
	min: number;
	max: number;
	p75: number;
	p95: number;
	values: number[];
}

interface Alert {
	metric: string;
	value: number;
	threshold: number;
	status: 'ok' | 'violated';
	severity: AlertSeverity;
	timestamp: number;
}

interface AlertConfig {
	severity?: AlertSeverity;
}

interface BudgetResult {
	status: BudgetStatus;
	budget: number;
	actual: number;
	overBy?: number;
}

interface Interaction {
	type: string;
	target: string;
	duration: number;
	timestamp: number;
}

interface InteractionStats {
	count: number;
	average: number;
	min: number;
	max: number;
}

interface PerformanceReport {
	summary: Record<string, MetricStats>;
	details: Record<string, unknown>;
	recommendations: string[];
	generatedAt: number;
}

interface DashboardData {
	metrics: Record<string, MetricStats>;
	alerts: Alert[];
	timestamp: number;
}

interface CollectedMetrics {
	timestamp: number;
	pageLoad: number;
	custom: Record<string, number>;
}

// Storage for metrics
const metricsStore: Record<string, number[]> = {};
const alertThresholds: Map<string, { value: number; severity: AlertSeverity }> = new Map();
const budgets: Map<string, number> = new Map();
const interactions: Interaction[] = [];
let rumActive = false;

/**
 * Web Vitals thresholds based on Google's recommendations
 */
export const WEB_VITAL_THRESHOLDS: Record<string, Threshold> = {
	LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint (ms)
	FID: { good: 100, poor: 300 }, // First Input Delay (ms)
	CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift (score)
	FCP: { good: 1800, poor: 3000 }, // First Contentful Paint (ms)
	TTFB: { good: 800, poor: 1800 }, // Time to First Byte (ms)
	INP: { good: 200, poor: 500 } // Interaction to Next Paint (ms)
};

/**
 * Performance recommendations for common issues
 */
const RECOMMENDATIONS: Record<string, string[]> = {
	LCP: [
		'Optimize images with proper sizing and lazy loading',
		'Preload critical resources',
		'Use CDN for static assets',
		'Minimize render-blocking resources'
	],
	FID: [
		'Break up long JavaScript tasks',
		'Use web workers for heavy computations',
		'Reduce JavaScript execution time',
		'Defer non-critical JavaScript'
	],
	CLS: [
		'Set explicit dimensions for images and embeds',
		'Reserve space for dynamic content',
		'Avoid inserting content above existing content',
		'Use CSS transform for animations'
	]
};

/**
 * Initialize web vitals collection
 *
 * @param onMetric - Callback for metric reporting
 */
export function initWebVitals(onMetric?: (metric: { name: string; value: number }) => void): void {
	// Web vitals would be initialized here in a browser environment
	// This is a simplified version for the module structure
	if (typeof window !== 'undefined' && onMetric) {
		// In a real implementation, we'd import from 'web-vitals'
		// and call getCLS, getFID, getLCP, etc.
	}
}

/**
 * Classify a metric value as good, needs-improvement, or poor
 *
 * @param metric - The metric name
 * @param value - The metric value
 * @returns Classification string
 */
export function classifyMetric(metric: string, value: number): MetricClassification {
	const threshold = WEB_VITAL_THRESHOLDS[metric];
	if (!threshold) {
		return 'needs-improvement';
	}

	if (value <= threshold.good) {
		return 'good';
	}
	if (value >= threshold.poor) {
		return 'poor';
	}
	return 'needs-improvement';
}

/**
 * Start a performance mark
 *
 * @param name - Mark name
 */
export function startMark(name: string): void {
	performance.mark(`${name}-start`);
}

/**
 * End a performance mark and measure duration
 *
 * @param name - Mark name
 * @returns Duration in milliseconds
 */
export function endMark(name: string): number {
	performance.mark(`${name}-end`);
	const measure = performance.measure(name, `${name}-start`, `${name}-end`);
	return measure.duration;
}

/**
 * Record a custom metric
 *
 * @param name - Metric name
 * @param value - Metric value
 */
export function recordMetric(name: string, value: number): void {
	if (!metricsStore[name]) {
		metricsStore[name] = [];
	}
	metricsStore[name].push(value);
}

/**
 * Clear all recorded metrics
 */
export function clearMetrics(): void {
	for (const key of Object.keys(metricsStore)) {
		delete metricsStore[key];
	}
}

/**
 * Collect current performance metrics
 *
 * @returns Collected metrics object
 */
export async function collectMetrics(): Promise<CollectedMetrics> {
	const custom: Record<string, number> = {};

	for (const [name, values] of Object.entries(metricsStore)) {
		if (values.length > 0) {
			custom[name] = values[values.length - 1];
		}
	}

	return {
		timestamp: Date.now(),
		pageLoad: typeof performance !== 'undefined' ? performance.now() : 0,
		custom
	};
}

/**
 * Calculate percentile from an array of values
 *
 * @param values - Array of numbers
 * @param percentile - Percentile (0-100)
 * @returns Percentile value
 */
function calculatePercentile(values: number[], percentile: number): number {
	if (values.length === 0) return 0;

	const sorted = [...values].sort((a, b) => a - b);
	const index = Math.ceil((percentile / 100) * sorted.length) - 1;
	return sorted[Math.max(0, index)];
}

/**
 * Calculate statistics for a metric
 *
 * @param values - Array of metric values
 * @returns Metric statistics
 */
function calculateStats(values: number[]): MetricStats {
	if (values.length === 0) {
		return {
			count: 0,
			average: 0,
			min: 0,
			max: 0,
			p75: 0,
			p95: 0,
			values: []
		};
	}

	const sum = values.reduce((a, b) => a + b, 0);
	return {
		count: values.length,
		average: sum / values.length,
		min: Math.min(...values),
		max: Math.max(...values),
		p75: calculatePercentile(values, 75),
		p95: calculatePercentile(values, 95),
		values: [...values]
	};
}

/**
 * Get dashboard data with aggregated metrics
 *
 * @returns Dashboard data object
 */
export function getDashboardData(): DashboardData {
	const metrics: Record<string, MetricStats> = {};

	for (const [name, values] of Object.entries(metricsStore)) {
		metrics[name] = calculateStats(values);
	}

	return {
		metrics,
		alerts: checkAlerts(),
		timestamp: Date.now()
	};
}

/**
 * Set an alert threshold for a metric
 *
 * @param metric - Metric name
 * @param threshold - Threshold value
 * @param config - Alert configuration
 */
export function setAlertThreshold(
	metric: string,
	threshold: number,
	config: AlertConfig = {}
): void {
	alertThresholds.set(metric, {
		value: threshold,
		severity: config.severity ?? 'warning'
	});
}

/**
 * Get the alert threshold for a metric
 *
 * @param metric - Metric name
 * @returns Threshold value or undefined
 */
export function getAlertThreshold(metric: string): number | undefined {
	return alertThresholds.get(metric)?.value;
}

/**
 * Check all metrics against their alert thresholds
 *
 * @returns Array of alerts
 */
export function checkAlerts(): Alert[] {
	const alerts: Alert[] = [];

	for (const [metric, config] of alertThresholds) {
		const values = metricsStore[metric];
		if (!values || values.length === 0) continue;

		const latestValue = values[values.length - 1];
		const violated = latestValue > config.value;

		alerts.push({
			metric,
			value: latestValue,
			threshold: config.value,
			status: violated ? 'violated' : 'ok',
			severity: config.severity,
			timestamp: Date.now()
		});
	}

	return alerts;
}

/**
 * Set a performance budget
 *
 * @param metric - Metric name
 * @param budget - Budget value (max allowed)
 */
export function setPerformanceBudget(metric: string, budget: number): void {
	budgets.set(metric, budget);
}

/**
 * Clear all performance budgets
 */
export function clearBudgets(): void {
	budgets.clear();
}

/**
 * Check metrics against budgets
 *
 * @param actualValues - Actual metric values
 * @returns Budget check results
 */
export function checkBudgets(actualValues: Record<string, number>): Record<string, BudgetResult> {
	const results: Record<string, BudgetResult> = {};

	for (const [metric, budget] of budgets) {
		const actual = actualValues[metric];
		if (actual === undefined) continue;

		const overBudget = actual > budget;
		results[metric] = {
			status: overBudget ? 'over-budget' : 'within-budget',
			budget,
			actual,
			...(overBudget ? { overBy: actual - budget } : {})
		};
	}

	return results;
}

/**
 * Start Real User Monitoring
 */
export function startRUM(): void {
	rumActive = true;
	interactions.length = 0;
}

/**
 * Stop Real User Monitoring
 */
export function stopRUM(): void {
	rumActive = false;
}

/**
 * Record a user interaction
 *
 * @param type - Interaction type (click, input, etc.)
 * @param target - Target element identifier
 * @param duration - Interaction duration in ms
 */
export function recordInteraction(type: string, target: string, duration: number): void {
	if (!rumActive) return;

	interactions.push({
		type,
		target,
		duration,
		timestamp: Date.now()
	});
}

/**
 * Get all recorded interactions
 *
 * @returns Array of interactions
 */
export function getInteractions(): Interaction[] {
	return [...interactions];
}

/**
 * Get aggregated interaction statistics
 *
 * @returns Stats grouped by interaction type
 */
export function getInteractionStats(): Record<string, InteractionStats> {
	const stats: Record<string, InteractionStats> = {};

	const byType: Record<string, number[]> = {};
	for (const interaction of interactions) {
		if (!byType[interaction.type]) {
			byType[interaction.type] = [];
		}
		byType[interaction.type].push(interaction.duration);
	}

	for (const [type, durations] of Object.entries(byType)) {
		const sum = durations.reduce((a, b) => a + b, 0);
		stats[type] = {
			count: durations.length,
			average: sum / durations.length,
			min: Math.min(...durations),
			max: Math.max(...durations)
		};
	}

	return stats;
}

/**
 * Generate a performance report
 *
 * @returns Performance report object
 */
export function generateReport(): PerformanceReport {
	const summary: Record<string, MetricStats> = {};
	const recommendations: string[] = [];

	for (const [name, values] of Object.entries(metricsStore)) {
		summary[name] = calculateStats(values);

		// Check for poor web vitals and add recommendations
		if (values.length > 0) {
			const latestValue = values[values.length - 1];
			const classification = classifyMetric(name, latestValue);

			if (classification === 'poor' && RECOMMENDATIONS[name]) {
				recommendations.push(...RECOMMENDATIONS[name]);
			}
		}
	}

	return {
		summary,
		details: {
			alerts: checkAlerts(),
			budgets: Array.from(budgets.entries()).map(([metric, budget]) => ({ metric, budget }))
		},
		recommendations: [...new Set(recommendations)], // Deduplicate
		generatedAt: Date.now()
	};
}

/**
 * Create a performance observer for specific entry types
 *
 * @param entryTypes - Entry types to observe
 * @param callback - Callback for entries
 * @returns PerformanceObserver instance
 */
export function createPerformanceObserver(
	entryTypes: string[],
	callback: (entries: PerformanceEntryList) => void
): PerformanceObserver | null {
	if (typeof PerformanceObserver === 'undefined') {
		return null;
	}

	const observer = new PerformanceObserver((list) => {
		callback(list.getEntries());
	});

	try {
		observer.observe({ entryTypes });
	} catch {
		// Some entry types may not be supported
		return null;
	}

	return observer;
}

/**
 * Get navigation timing data
 *
 * @returns Navigation timing metrics
 */
export function getNavigationTiming(): Record<string, number> | null {
	if (typeof performance === 'undefined' || !performance.getEntriesByType) {
		return null;
	}

	const entries = performance.getEntriesByType('navigation');
	if (entries.length === 0) {
		return null;
	}

	const nav = entries[0] as PerformanceNavigationTiming;
	return {
		dns: nav.domainLookupEnd - nav.domainLookupStart,
		tcp: nav.connectEnd - nav.connectStart,
		ttfb: nav.responseStart - nav.requestStart,
		download: nav.responseEnd - nav.responseStart,
		domInteractive: nav.domInteractive - nav.navigationStart,
		domComplete: nav.domComplete - nav.navigationStart,
		loadComplete: nav.loadEventEnd - nav.navigationStart
	};
}
