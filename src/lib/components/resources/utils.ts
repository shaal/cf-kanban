/**
 * TASK-108: Resource Dashboard Utilities
 *
 * Utility functions for the resource dashboard including:
 * - Usage percentage calculations
 * - Alert generation and categorization
 * - Cost estimation
 * - D3 chart helpers
 */

import * as d3 from 'd3';
import type { UsageMetrics, DailyUsage } from '$lib/server/resources/usage';
import type { ResourceLimits } from '$lib/server/resources/limits';

/**
 * Alert severity levels
 */
export enum AlertLevel {
	NONE = 'none',
	WARNING = 'warning',
	DANGER = 'danger',
	CRITICAL = 'critical'
}

/**
 * Usage status types
 */
export type UsageStatus = 'normal' | 'warning' | 'critical';

/**
 * Alert notification
 */
export interface Alert {
	type: 'agents' | 'storage' | 'apiCalls' | 'websockets' | 'swarms';
	level: AlertLevel;
	message: string;
	percentage: number;
}

/**
 * Categorized alerts
 */
export interface CategorizedAlerts {
	critical: Alert[];
	danger: Alert[];
	warning: Alert[];
	normal: Alert[];
}

/**
 * Cost breakdown
 */
export interface CostBreakdown {
	agents: number;
	storage: number;
	apiCalls: number;
	swarms: number;
}

/**
 * Cost estimation result
 */
export interface CostEstimate {
	total: number;
	breakdown: CostBreakdown;
	currency: string;
}

/**
 * Cost with per-unit pricing
 */
export interface CostWithPricing extends CostEstimate {
	perUnitCosts: {
		agentHour: number;
		storageMB: number;
		apiCall: number;
		swarm: number;
	};
}

/**
 * Usage percentages
 */
export interface UsagePercentages {
	agents?: number;
	storage: number;
	apiCalls: number;
	websockets?: number;
	swarms?: number;
}

/**
 * Trend information
 */
export interface Trend {
	direction: 'up' | 'down' | 'stable';
	changePercent: number;
}

/**
 * Dashboard summary
 */
export interface DashboardSummary {
	currentUsage: UsageMetrics;
	trends: Record<string, Trend>;
	alerts: Alert[];
	estimatedCost: CostEstimate;
}

/**
 * Tooltip position
 */
export interface TooltipPosition {
	x: number;
	y: number;
}

// ============================================
// Usage Calculations
// ============================================

/**
 * Calculate usage percentages relative to limits
 */
export function calculateUsagePercentages(
	usage: UsageMetrics,
	limits: ResourceLimits
): UsagePercentages {
	return {
		storage: (usage.storageUsedMB / limits.storageQuotaMB) * 100,
		apiCalls: (usage.apiCalls / limits.maxApiCallsPerHour) * 100,
		websockets: limits.maxWebSocketConnections > 0
			? (usage.websocketConnections / limits.maxWebSocketConnections) * 100
			: 0,
		swarms: limits.maxConcurrentSwarms > 0
			? (usage.swarmExecutions / limits.maxConcurrentSwarms) * 100
			: 0
	};
}

/**
 * Get usage status based on percentage
 */
export function getUsageStatus(percentage: number): UsageStatus {
	if (percentage >= 90) {
		return 'critical';
	} else if (percentage >= 70) {
		return 'warning';
	}
	return 'normal';
}

/**
 * Determine alert level based on percentage
 */
export function determineAlertLevel(percentage: number): AlertLevel {
	if (percentage >= 100) {
		return AlertLevel.CRITICAL;
	} else if (percentage >= 90) {
		return AlertLevel.DANGER;
	} else if (percentage >= 70) {
		return AlertLevel.WARNING;
	}
	return AlertLevel.NONE;
}

// ============================================
// Gauge Chart Helpers
// ============================================

/**
 * Create arc path for gauge visualization
 */
export function createGaugeArc(value: number, max: number): string {
	const percentage = Math.min(value / max, 1);
	const startAngle = -Math.PI / 2;
	const endAngle = startAngle + percentage * Math.PI;

	const arc = d3.arc()
		.innerRadius(60)
		.outerRadius(80)
		.startAngle(startAngle)
		.endAngle(endAngle);

	return arc({
		innerRadius: 60,
		outerRadius: 80,
		startAngle,
		endAngle
	}) || '';
}

/**
 * Get gauge color based on percentage
 */
export function getGaugeColor(percentage: number): string {
	if (percentage >= 90) {
		return '#ef4444'; // red
	} else if (percentage >= 70) {
		return '#f59e0b'; // amber
	}
	return '#10b981'; // green
}

// ============================================
// Alert Generation
// ============================================

/**
 * Generate alerts based on usage vs limits
 */
export function generateAlerts(usage: UsageMetrics, limits: ResourceLimits): Alert[] {
	const alerts: Alert[] = [];

	// Storage alert
	const storagePercent = (usage.storageUsedMB / limits.storageQuotaMB) * 100;
	const storageLevel = determineAlertLevel(storagePercent);
	if (storageLevel !== AlertLevel.NONE) {
		alerts.push({
			type: 'storage',
			level: storageLevel,
			message: `Storage usage at ${storagePercent.toFixed(0)}% (${usage.storageUsedMB}MB / ${limits.storageQuotaMB}MB)`,
			percentage: storagePercent
		});
	}

	// API calls alert
	const apiPercent = (usage.apiCalls / limits.maxApiCallsPerHour) * 100;
	const apiLevel = determineAlertLevel(apiPercent);
	if (apiLevel !== AlertLevel.NONE) {
		alerts.push({
			type: 'apiCalls',
			level: apiLevel,
			message: `API calls at ${apiPercent.toFixed(0)}% (${usage.apiCalls} / ${limits.maxApiCallsPerHour})`,
			percentage: apiPercent
		});
	}

	// WebSocket alert
	if (limits.maxWebSocketConnections > 0) {
		const wsPercent = (usage.websocketConnections / limits.maxWebSocketConnections) * 100;
		const wsLevel = determineAlertLevel(wsPercent);
		if (wsLevel !== AlertLevel.NONE) {
			alerts.push({
				type: 'websockets',
				level: wsLevel,
				message: `WebSocket connections at ${wsPercent.toFixed(0)}%`,
				percentage: wsPercent
			});
		}
	}

	return alerts;
}

/**
 * Categorize alerts by severity
 */
export function categorizeAlerts(alerts: Alert[]): CategorizedAlerts {
	return {
		critical: alerts.filter(a => a.level === AlertLevel.CRITICAL),
		danger: alerts.filter(a => a.level === AlertLevel.DANGER),
		warning: alerts.filter(a => a.level === AlertLevel.WARNING),
		normal: alerts.filter(a => a.level === AlertLevel.NONE)
	};
}

// ============================================
// Cost Estimation
// ============================================

// Default pricing (per unit)
const DEFAULT_PRICING = {
	agentHour: 0.10,
	storageMB: 0.001,
	apiCall: 0.00001,
	swarm: 0.05
};

// Tier-based pricing multipliers
const TIER_MULTIPLIERS: Record<string, number> = {
	free: 1.0,
	starter: 0.8,
	pro: 0.6,
	enterprise: 0.4
};

/**
 * Estimate cost based on usage
 */
export function estimateCost(usage: UsageMetrics): CostEstimate {
	const breakdown: CostBreakdown = {
		agents: usage.agentHours * DEFAULT_PRICING.agentHour,
		storage: usage.storageUsedMB * DEFAULT_PRICING.storageMB,
		apiCalls: usage.apiCalls * DEFAULT_PRICING.apiCall,
		swarms: usage.swarmExecutions * DEFAULT_PRICING.swarm
	};

	const total = breakdown.agents + breakdown.storage + breakdown.apiCalls + breakdown.swarms;

	return {
		total,
		breakdown,
		currency: 'USD'
	};
}

/**
 * Estimate cost with tier-based pricing
 */
export function estimateCostWithTier(usage: UsageMetrics, tier: string): CostWithPricing {
	const multiplier = TIER_MULTIPLIERS[tier] || 1.0;

	const perUnitCosts = {
		agentHour: DEFAULT_PRICING.agentHour * multiplier,
		storageMB: DEFAULT_PRICING.storageMB * multiplier,
		apiCall: DEFAULT_PRICING.apiCall * multiplier,
		swarm: DEFAULT_PRICING.swarm * multiplier
	};

	const breakdown: CostBreakdown = {
		agents: usage.agentHours * perUnitCosts.agentHour,
		storage: usage.storageUsedMB * perUnitCosts.storageMB,
		apiCalls: usage.apiCalls * perUnitCosts.apiCall,
		swarms: usage.swarmExecutions * perUnitCosts.swarm
	};

	const total = breakdown.agents + breakdown.storage + breakdown.apiCalls + breakdown.swarms;

	return {
		total,
		breakdown,
		currency: 'USD',
		perUnitCosts
	};
}

/**
 * Format currency value
 */
export function formatCurrency(value: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(value);
}

// ============================================
// Time Formatting
// ============================================

/**
 * Format last updated timestamp
 */
export function formatLastUpdated(timestamp: number): string {
	const now = Date.now();
	const diff = now - timestamp;
	const minutes = Math.floor(diff / 60000);

	if (minutes < 1) {
		return 'Just now';
	} else if (minutes === 1) {
		return '1 minute ago';
	} else if (minutes < 60) {
		return `${minutes} minutes ago`;
	} else {
		const hours = Math.floor(minutes / 60);
		return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
	}
}

/**
 * Calculate time until next hourly reset
 */
export function calculateTimeUntilReset(): { minutes: number; formatted: string } {
	const now = new Date();
	const nextHour = new Date(now);
	nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);

	const diffMs = nextHour.getTime() - now.getTime();
	const minutes = Math.ceil(diffMs / 60000);

	return {
		minutes,
		formatted: `${minutes} min`
	};
}

// ============================================
// Progress Bar Helpers
// ============================================

/**
 * Calculate progress bar width percentage
 */
export function calculateProgressWidth(current: number, max: number): number {
	if (max <= 0) return 0;
	return Math.min(100, (current / max) * 100);
}

/**
 * Get progress bar color class based on percentage
 */
export function getProgressColorClass(percentage: number): string {
	if (percentage >= 90) {
		return 'bg-red-500';
	} else if (percentage >= 70) {
		return 'bg-amber-500';
	}
	return 'bg-green-500';
}

// ============================================
// Trend Calculation
// ============================================

/**
 * Calculate trend from historical values
 */
export function calculateTrend(values: number[]): Trend {
	if (values.length < 2) {
		return { direction: 'stable', changePercent: 0 };
	}

	const recent = values.slice(-3);
	const older = values.slice(0, 3);

	const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
	const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

	if (olderAvg === 0) {
		return { direction: recentAvg > 0 ? 'up' : 'stable', changePercent: 0 };
	}

	const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

	let direction: 'up' | 'down' | 'stable';
	if (changePercent > 5) {
		direction = 'up';
	} else if (changePercent < -5) {
		direction = 'down';
	} else {
		direction = 'stable';
	}

	return { direction, changePercent: Math.abs(changePercent) };
}

// ============================================
// Dashboard Summary
// ============================================

/**
 * Compile dashboard summary from usage data
 */
export function compileSummary(
	usage: UsageMetrics,
	limits: ResourceLimits,
	history: DailyUsage[]
): DashboardSummary {
	// Calculate trends
	const agentTrend = calculateTrend(history.map(h => h.agentHours));
	const apiTrend = calculateTrend(history.map(h => h.apiCalls));
	const storageTrend = calculateTrend(history.map(h => h.storageUsedMB));

	return {
		currentUsage: usage,
		trends: {
			agents: agentTrend,
			apiCalls: apiTrend,
			storage: storageTrend
		},
		alerts: generateAlerts(usage, limits),
		estimatedCost: estimateCost(usage)
	};
}

// ============================================
// Tooltip Positioning
// ============================================

/**
 * Calculate tooltip position to keep it within bounds
 */
export function calculateTooltipPosition(
	mouseX: number,
	mouseY: number,
	containerWidth: number,
	containerHeight: number,
	tooltipWidth: number,
	tooltipHeight: number
): TooltipPosition {
	let x = mouseX + 10;
	let y = mouseY + 10;

	// Prevent overflow on right
	if (x + tooltipWidth > containerWidth) {
		x = mouseX - tooltipWidth - 10;
	}

	// Prevent overflow on bottom
	if (y + tooltipHeight > containerHeight) {
		y = mouseY - tooltipHeight - 10;
	}

	// Keep within bounds
	x = Math.max(0, x);
	y = Math.max(0, y);

	return { x, y };
}
