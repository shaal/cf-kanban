/**
 * Agent Metrics Store
 * GAP-3.3.4: Agent Metrics Dashboard
 *
 * State management for tracking agent performance metrics with historical data,
 * trend analysis, and real-time updates via WebSocket.
 */

import { writable, derived, get } from 'svelte/store';
import type {
	AgentMetricsWithHistory,
	MetricsHistoryPoint,
	TaskOutcome,
	MetricsTrend,
	MetricsPeriod,
	TaskOutcomePayload,
	AgentMetricsUpdatePayload,
	AgentMetrics
} from '$lib/types/agents';
import { calculateTrend } from '$lib/types/agents';

/**
 * Internal store mapping agentTypeId to AgentMetricsWithHistory
 */
const agentMetricsMap = writable<Map<string, AgentMetricsWithHistory>>(new Map());

/**
 * Derived store: Array of all agent metrics
 */
export const allAgentMetrics = derived(agentMetricsMap, ($map) => Array.from($map.values()));

/**
 * Derived store: Top 5 performing agents by success rate
 */
export const topPerformingAgents = derived(agentMetricsMap, ($map) => {
	return Array.from($map.values())
		.filter((m) => m.tasksCompleted > 0)
		.sort((a, b) => b.successRate - a.successRate)
		.slice(0, 5);
});

/**
 * Derived store: Last 20 task outcomes across all agents
 */
export const recentTasks = derived(agentMetricsMap, ($map) => {
	const allOutcomes: TaskOutcome[] = [];
	for (const metrics of $map.values()) {
		allOutcomes.push(...metrics.recentOutcomes);
	}
	return allOutcomes
		.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
		.slice(0, 20);
});

/**
 * Record a task outcome and recalculate metrics for the agent
 * @param outcome - The task outcome to record
 */
export function recordTaskOutcome(outcome: TaskOutcome): void {
	agentMetricsMap.update((map) => {
		const existing = map.get(outcome.agentTypeId);

		if (existing) {
			// Add outcome to recent outcomes (keep last 50)
			const updatedOutcomes = [outcome, ...existing.recentOutcomes].slice(0, 50);

			// Recalculate metrics
			const successCount = updatedOutcomes.filter((o) => o.success).length;
			const newSuccessRate = (successCount / updatedOutcomes.length) * 100;
			const avgTime =
				updatedOutcomes.reduce((sum, o) => sum + o.completionTime, 0) / updatedOutcomes.length;

			// Add new history points for today
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const successHistory = [...existing.successHistory];
			const lastSuccessPoint = successHistory[successHistory.length - 1];
			if (lastSuccessPoint && isSameDay(lastSuccessPoint.timestamp, today)) {
				// Update today's data point
				lastSuccessPoint.value = newSuccessRate;
				lastSuccessPoint.sampleSize = (lastSuccessPoint.sampleSize ?? 0) + 1;
			} else {
				// Add new data point
				successHistory.push({
					timestamp: today,
					value: newSuccessRate,
					sampleSize: 1
				});
			}

			const completionTimeHistory = [...existing.completionTimeHistory];
			const lastTimePoint = completionTimeHistory[completionTimeHistory.length - 1];
			if (lastTimePoint && isSameDay(lastTimePoint.timestamp, today)) {
				// Update today's data point (running average)
				const prevTotal = lastTimePoint.value * (lastTimePoint.sampleSize ?? 1);
				const newSampleSize = (lastTimePoint.sampleSize ?? 1) + 1;
				lastTimePoint.value = (prevTotal + outcome.completionTime) / newSampleSize;
				lastTimePoint.sampleSize = newSampleSize;
			} else {
				// Add new data point
				completionTimeHistory.push({
					timestamp: today,
					value: outcome.completionTime,
					sampleSize: 1
				});
			}

			const updated: AgentMetricsWithHistory = {
				...existing,
				tasksCompleted: existing.tasksCompleted + 1,
				successRate: newSuccessRate,
				avgCompletionTime: avgTime,
				usageCount: existing.usageCount + 1,
				lastUsed: outcome.completedAt,
				recentOutcomes: updatedOutcomes,
				successHistory,
				completionTimeHistory,
				successTrend: calculateTrend(successHistory, true),
				completionTimeTrend: calculateTrend(completionTimeHistory, false)
			};

			map.set(outcome.agentTypeId, updated);
		} else {
			// Create new metrics entry for this agent type
			const now = new Date();
			now.setHours(0, 0, 0, 0);

			const newMetrics: AgentMetricsWithHistory = {
				agentTypeId: outcome.agentTypeId,
				tasksCompleted: 1,
				successRate: outcome.success ? 100 : 0,
				avgCompletionTime: outcome.completionTime,
				usageCount: 1,
				lastUsed: outcome.completedAt,
				successHistory: [
					{
						timestamp: now,
						value: outcome.success ? 100 : 0,
						sampleSize: 1
					}
				],
				completionTimeHistory: [
					{
						timestamp: now,
						value: outcome.completionTime,
						sampleSize: 1
					}
				],
				recentOutcomes: [outcome],
				successTrend: 'stable',
				completionTimeTrend: 'stable'
			};

			map.set(outcome.agentTypeId, newMetrics);
		}

		return new Map(map);
	});
}

/**
 * Get metrics for a specific agent type
 * @param agentTypeId - The agent type ID
 * @returns The metrics or undefined if not found
 */
export function getAgentMetrics(agentTypeId: string): AgentMetricsWithHistory | undefined {
	return get(agentMetricsMap).get(agentTypeId);
}

/**
 * Update metrics for an agent type (partial update)
 * @param agentTypeId - The agent type ID
 * @param metrics - Partial metrics to update
 */
export function updateAgentMetrics(agentTypeId: string, metrics: Partial<AgentMetrics>): void {
	agentMetricsMap.update((map) => {
		const existing = map.get(agentTypeId);
		if (existing) {
			map.set(agentTypeId, {
				...existing,
				...metrics
			});
		}
		return new Map(map);
	});
}

/**
 * Get metrics history filtered by time period
 * @param agentTypeId - The agent type ID
 * @param period - The time period to filter by
 * @returns Filtered history points or empty arrays
 */
export function getMetricsForPeriod(
	agentTypeId: string,
	period: MetricsPeriod
): { successHistory: MetricsHistoryPoint[]; completionTimeHistory: MetricsHistoryPoint[] } {
	const metrics = get(agentMetricsMap).get(agentTypeId);
	if (!metrics) {
		return { successHistory: [], completionTimeHistory: [] };
	}

	if (period === 'all') {
		return {
			successHistory: metrics.successHistory,
			completionTimeHistory: metrics.completionTimeHistory
		};
	}

	const cutoffDate = getCutoffDate(period);

	return {
		successHistory: metrics.successHistory.filter((p) => p.timestamp >= cutoffDate),
		completionTimeHistory: metrics.completionTimeHistory.filter((p) => p.timestamp >= cutoffDate)
	};
}

/**
 * Initialize with mock metrics data for development
 * Generates 30 days of realistic historical data with 20 recent task outcomes per agent
 */
export function initializeMockMetrics(): void {
	const agentTypes = [
		{ id: 'coder', baseSuccessRate: 92, baseTime: 120000 },
		{ id: 'tester', baseSuccessRate: 85, baseTime: 180000 },
		{ id: 'reviewer', baseSuccessRate: 88, baseTime: 90000 },
		{ id: 'researcher', baseSuccessRate: 87, baseTime: 240000 },
		{ id: 'coordinator', baseSuccessRate: 90, baseTime: 60000 },
		{ id: 'security-architect', baseSuccessRate: 94, baseTime: 300000 },
		{ id: 'performance-engineer', baseSuccessRate: 91, baseTime: 200000 },
		{ id: 'planner', baseSuccessRate: 89, baseTime: 150000 },
		{ id: 'memory-specialist', baseSuccessRate: 86, baseTime: 180000 },
		{ id: 'hierarchical-coordinator', baseSuccessRate: 84, baseTime: 120000 }
	];

	const taskTypes = [
		'implement-feature',
		'fix-bug',
		'code-review',
		'write-tests',
		'refactor',
		'security-audit',
		'performance-optimization',
		'documentation'
	];

	const map = new Map<string, AgentMetricsWithHistory>();

	for (const agentConfig of agentTypes) {
		const { id: agentType, baseSuccessRate, baseTime } = agentConfig;

		// Generate 30 days of history
		const successHistory: MetricsHistoryPoint[] = [];
		const completionTimeHistory: MetricsHistoryPoint[] = [];
		const recentOutcomes: TaskOutcome[] = [];

		const now = new Date();
		let totalTasks = 0;
		let successfulTasks = 0;
		let totalTime = 0;

		for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
			const date = new Date(now);
			date.setDate(date.getDate() - daysAgo);
			date.setHours(0, 0, 0, 0);

			// Daily variation: +/- 8% from base for success rate
			const dailySuccessRate = Math.min(
				100,
				Math.max(50, baseSuccessRate + (Math.random() - 0.5) * 16)
			);

			// Daily variation: +/- 30% for completion time
			const dailyCompletionTime = Math.max(
				10000,
				baseTime + (Math.random() - 0.5) * baseTime * 0.6
			);

			// Random sample size per day (8-25 tasks)
			const sampleSize = Math.floor(Math.random() * 18) + 8;

			successHistory.push({
				timestamp: new Date(date),
				value: Math.round(dailySuccessRate * 10) / 10,
				sampleSize
			});

			completionTimeHistory.push({
				timestamp: new Date(date),
				value: Math.round(dailyCompletionTime),
				sampleSize
			});

			// Generate task outcomes for recent days (last 2 days for recentOutcomes)
			if (daysAgo <= 1) {
				const tasksForDay = Math.min(sampleSize, 10);
				for (let t = 0; t < tasksForDay && recentOutcomes.length < 20; t++) {
					const success = Math.random() * 100 < dailySuccessRate;
					const completionTime = Math.round(
						dailyCompletionTime + (Math.random() - 0.5) * dailyCompletionTime * 0.4
					);
					const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)];

					const startedAt = new Date(date);
					startedAt.setHours(8 + Math.floor(Math.random() * 10));
					startedAt.setMinutes(Math.floor(Math.random() * 60));
					startedAt.setSeconds(Math.floor(Math.random() * 60));

					const completedAt = new Date(startedAt.getTime() + completionTime);

					recentOutcomes.push({
						id: `outcome-${agentType}-${daysAgo}-${t}-${Date.now()}`,
						agentTypeId: agentType,
						projectId: 'mock-project',
						taskType,
						success,
						completionTime,
						errorMessage: success ? undefined : `Task failed: ${taskType} encountered an error`,
						startedAt,
						completedAt
					});
				}
			}

			totalTasks += sampleSize;
			successfulTasks += Math.round((sampleSize * dailySuccessRate) / 100);
			totalTime += sampleSize * dailyCompletionTime;
		}

		// Sort recent outcomes by completion time (most recent first)
		recentOutcomes.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());

		// Ensure we have exactly 20 outcomes
		while (recentOutcomes.length < 20) {
			const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)];
			const success = Math.random() * 100 < baseSuccessRate;
			const completionTime = Math.round(baseTime + (Math.random() - 0.5) * baseTime * 0.4);
			const startedAt = new Date(now.getTime() - Math.random() * 48 * 60 * 60 * 1000);
			const completedAt = new Date(startedAt.getTime() + completionTime);

			recentOutcomes.push({
				id: `outcome-${agentType}-fill-${recentOutcomes.length}`,
				agentTypeId: agentType,
				projectId: 'mock-project',
				taskType,
				success,
				completionTime,
				errorMessage: success ? undefined : `Task failed: ${taskType} encountered an error`,
				startedAt,
				completedAt
			});
		}

		recentOutcomes.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());

		const metrics: AgentMetricsWithHistory = {
			agentTypeId: agentType,
			tasksCompleted: totalTasks,
			successRate: Math.round((successfulTasks / totalTasks) * 1000) / 10,
			avgCompletionTime: Math.round(totalTime / totalTasks),
			usageCount: totalTasks,
			lastUsed: recentOutcomes[0]?.completedAt ?? new Date(),
			successHistory,
			completionTimeHistory,
			recentOutcomes: recentOutcomes.slice(0, 20),
			successTrend: calculateTrend(successHistory, true),
			completionTimeTrend: calculateTrend(completionTimeHistory, false)
		};

		map.set(agentType, metrics);
	}

	agentMetricsMap.set(map);
}

/**
 * WebSocket event handlers factory
 * Returns handlers that can be registered with Socket.IO
 * @returns Object with event name keys and handler function values
 */
export function createMetricsEventHandlers() {
	return {
		'agent:task:completed': (payload: TaskOutcomePayload) => {
			recordTaskOutcome(payload.outcome);
		},

		'agent:metrics:updated': (payload: AgentMetricsUpdatePayload) => {
			updateAgentMetrics(payload.agentTypeId, payload.metrics);
		}
	};
}

/**
 * Clear all metrics data
 */
export function clearAllMetrics(): void {
	agentMetricsMap.set(new Map());
}

/**
 * Bulk initialize metrics from server data
 * @param metricsArray - Array of metrics to initialize
 */
export function initializeMetrics(metricsArray: AgentMetricsWithHistory[]): void {
	const map = new Map<string, AgentMetricsWithHistory>();
	for (const metrics of metricsArray) {
		map.set(metrics.agentTypeId, metrics);
	}
	agentMetricsMap.set(map);
}

/**
 * Create a reactive store for a specific agent's metrics
 * @param agentTypeId - The agent type ID to watch
 * @returns A derived store for that agent's metrics
 */
export function createAgentMetricsStore(agentTypeId: string) {
	return derived(agentMetricsMap, ($map) => $map.get(agentTypeId));
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if two dates are the same day
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if dates are on the same calendar day
 */
function isSameDay(date1: Date, date2: Date): boolean {
	return (
		date1.getFullYear() === date2.getFullYear() &&
		date1.getMonth() === date2.getMonth() &&
		date1.getDate() === date2.getDate()
	);
}

/**
 * Get the cutoff date for a time period
 * @param period - The time period
 * @returns Date representing the start of the period
 */
function getCutoffDate(period: MetricsPeriod): Date {
	const now = new Date();
	switch (period) {
		case '24h':
			return new Date(now.getTime() - 24 * 60 * 60 * 1000);
		case '7d':
			return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
		case '30d':
			return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
		case '90d':
			return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
		default:
			return new Date(0);
	}
}
