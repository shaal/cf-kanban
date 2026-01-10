<script lang="ts">
	/**
	 * Agent Metrics Panel Component
	 * GAP-3.3.4: Agent Success Metrics
	 *
	 * Full metrics panel for agent detail view showing trends,
	 * sparklines, and recent task outcomes.
	 */
	import { cn } from '$lib/utils';
	import * as Icons from 'lucide-svelte';
	import type { AgentMetricsWithHistory, TaskOutcome, MetricsHistoryPoint } from '$lib/types/agents';
	import { formatCompletionTime } from '$lib/types/agents';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import MetricsSparkline from './MetricsSparkline.svelte';
	import MetricsTrendBadge from './MetricsTrendBadge.svelte';
	import MetricsProgressBar from './MetricsProgressBar.svelte';

	interface Props {
		agentTypeId: string;
		metrics?: AgentMetricsWithHistory;
		class?: string;
	}

	let { agentTypeId, metrics, class: className = '' }: Props = $props();

	// Transform history points for sparkline
	function toSparklineData(history: MetricsHistoryPoint[]): { value: number; timestamp: Date }[] {
		return history.map((h) => ({
			value: h.value,
			timestamp: new Date(h.timestamp)
		}));
	}

	// Format relative time
	function formatRelativeTime(date: Date): string {
		const now = new Date();
		const diff = now.getTime() - new Date(date).getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days < 7) return `${days}d ago`;
		return new Date(date).toLocaleDateString();
	}

	// Get task type display name
	function getTaskTypeLabel(taskType: string): string {
		return taskType
			.split('-')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}
</script>

<Card class={cn('p-4', className)}>
	<div class="space-y-6">
		<!-- Header -->
		<div class="flex items-center justify-between">
			<h3 class="text-sm font-semibold text-gray-900 flex items-center gap-2">
				<Icons.Activity class="w-4 h-4 text-blue-500" />
				Performance Metrics
			</h3>
			{#if metrics}
				<span class="text-xs text-gray-500">
					{metrics.tasksCompleted} tasks completed
				</span>
			{/if}
		</div>

		{#if metrics}
			<!-- Main Metrics Grid -->
			<div class="grid grid-cols-2 gap-4">
				<!-- Success Rate -->
				<div class="bg-gray-50 rounded-lg p-3">
					<div class="flex items-center justify-between mb-2">
						<span class="text-xs text-gray-500 font-medium">Success Rate</span>
						<MetricsTrendBadge trend={metrics.successTrend} metric="success" size="sm" />
					</div>
					<div class="flex items-center gap-3">
						<MetricsProgressBar
							value={metrics.successRate}
							size="md"
							variant="circular"
							showLabel={true}
						/>
						<MetricsSparkline
							data={toSparklineData(metrics.successHistory)}
							width={50}
							height={24}
							color={metrics.successRate >= 80 ? '#22c55e' : metrics.successRate >= 60 ? '#eab308' : '#ef4444'}
							showTrend={false}
						/>
					</div>
				</div>

				<!-- Average Completion Time -->
				<div class="bg-gray-50 rounded-lg p-3">
					<div class="flex items-center justify-between mb-2">
						<span class="text-xs text-gray-500 font-medium">Avg. Time</span>
						<MetricsTrendBadge trend={metrics.completionTimeTrend} metric="time" size="sm" />
					</div>
					<div class="flex items-center gap-3">
						<div class="flex items-center gap-1">
							<Icons.Clock class="w-4 h-4 text-blue-500" />
							<span class="text-lg font-semibold text-gray-900">
								{formatCompletionTime(metrics.avgCompletionTime)}
							</span>
						</div>
						<MetricsSparkline
							data={toSparklineData(metrics.completionTimeHistory)}
							width={50}
							height={24}
							color="#3b82f6"
							showTrend={false}
						/>
					</div>
				</div>
			</div>

			<!-- Historical Trend Charts -->
			<div class="space-y-3">
				<h4 class="text-xs font-medium text-gray-700 flex items-center gap-1.5">
					<Icons.TrendingUp class="w-3.5 h-3.5" />
					Trend History
				</h4>
				<div class="grid grid-cols-2 gap-3">
					<div class="border rounded-lg p-2">
						<span class="text-xs text-gray-500 block mb-1">Success Rate</span>
						<MetricsSparkline
							data={toSparklineData(metrics.successHistory)}
							width={120}
							height={32}
							color="#22c55e"
							showTrend={true}
						/>
					</div>
					<div class="border rounded-lg p-2">
						<span class="text-xs text-gray-500 block mb-1">Completion Time</span>
						<MetricsSparkline
							data={toSparklineData(metrics.completionTimeHistory)}
							width={120}
							height={32}
							color="#3b82f6"
							showTrend={true}
						/>
					</div>
				</div>
			</div>

			<!-- Recent Task Outcomes -->
			{#if metrics.recentOutcomes && metrics.recentOutcomes.length > 0}
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<h4 class="text-xs font-medium text-gray-700 flex items-center gap-1.5">
							<Icons.ListChecks class="w-3.5 h-3.5" />
							Recent Tasks
						</h4>
						<span class="text-xs text-gray-400">
							Last {Math.min(metrics.recentOutcomes.length, 5)} of {metrics.recentOutcomes.length}
						</span>
					</div>
					<div class="space-y-2 max-h-48 overflow-y-auto">
						{#each metrics.recentOutcomes.slice(0, 5) as outcome (outcome.id)}
							<div
								class={cn(
									'flex items-center justify-between p-2 rounded-lg border',
									outcome.success ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
								)}
							>
								<div class="flex items-center gap-2 min-w-0 flex-1">
									{#if outcome.success}
										<Icons.CheckCircle2 class="w-4 h-4 text-green-500 flex-shrink-0" />
									{:else}
										<Icons.XCircle class="w-4 h-4 text-red-500 flex-shrink-0" />
									{/if}
									<div class="min-w-0">
										<p class="text-xs font-medium text-gray-900 truncate">
											{getTaskTypeLabel(outcome.taskType)}
										</p>
										{#if outcome.errorMessage}
											<p class="text-xs text-red-600 truncate" title={outcome.errorMessage}>
												{outcome.errorMessage}
											</p>
										{/if}
									</div>
								</div>
								<div class="flex items-center gap-2 flex-shrink-0">
									<Badge variant={outcome.success ? 'secondary' : 'destructive'} class="text-xs">
										{formatCompletionTime(outcome.completionTime)}
									</Badge>
									<span class="text-xs text-gray-400">
										{formatRelativeTime(outcome.completedAt)}
									</span>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Summary Stats -->
			<div class="pt-3 border-t">
				<div class="grid grid-cols-3 gap-3 text-center">
					<div>
						<p class="text-xs text-gray-500">Tasks</p>
						<p class="text-sm font-semibold text-gray-900">{metrics.tasksCompleted}</p>
					</div>
					<div>
						<p class="text-xs text-gray-500">Uses</p>
						<p class="text-sm font-semibold text-gray-900">{metrics.usageCount}</p>
					</div>
					<div>
						<p class="text-xs text-gray-500">Last Used</p>
						<p class="text-sm font-semibold text-gray-900">
							{metrics.lastUsed ? formatRelativeTime(metrics.lastUsed) : 'Never'}
						</p>
					</div>
				</div>
			</div>
		{:else}
			<!-- No metrics available -->
			<div class="text-center py-8">
				<Icons.BarChart3 class="w-8 h-8 text-gray-300 mx-auto mb-2" />
				<p class="text-sm text-gray-500">No metrics available</p>
				<p class="text-xs text-gray-400 mt-1">
					Metrics will appear after the agent completes tasks
				</p>
			</div>
		{/if}
	</div>
</Card>
