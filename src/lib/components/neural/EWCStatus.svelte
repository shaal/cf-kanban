<script lang="ts">
	/**
	 * TASK-077: EWC Status Component
	 *
	 * Displays Elastic Weight Consolidation (EWC++) status for forgetting prevention.
	 */
	import type { EWCMetrics } from '$lib/types/neural';
	import { Shield, AlertTriangle, CheckCircle2, Clock } from 'lucide-svelte';

	interface Props {
		metrics: EWCMetrics | null;
	}

	let { metrics }: Props = $props();

	// Determine health status based on forgetting rate
	const healthStatus = $derived(() => {
		if (!metrics) return 'unknown';
		if (metrics.forgettingRate <= 0.05) return 'healthy';
		if (metrics.forgettingRate <= 0.15) return 'warning';
		return 'critical';
	});

	const statusConfig = $derived(() => {
		const status = healthStatus();
		return {
			healthy: {
				icon: CheckCircle2,
				color: 'text-green-600',
				bg: 'bg-green-50',
				border: 'border-green-200',
				label: 'Healthy'
			},
			warning: {
				icon: AlertTriangle,
				color: 'text-yellow-600',
				bg: 'bg-yellow-50',
				border: 'border-yellow-200',
				label: 'Warning'
			},
			critical: {
				icon: AlertTriangle,
				color: 'text-red-600',
				bg: 'bg-red-50',
				border: 'border-red-200',
				label: 'Critical'
			},
			unknown: {
				icon: Shield,
				color: 'text-gray-600',
				bg: 'bg-gray-50',
				border: 'border-gray-200',
				label: 'Unknown'
			}
		}[status];
	});

	// Format time ago
	function timeAgo(timestamp: number): string {
		const seconds = Math.floor((Date.now() - timestamp) / 1000);
		if (seconds < 60) return `${seconds}s ago`;
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}
</script>

<div data-testid="ewc-status">
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-semibold text-gray-900">Forgetting Prevention (EWC++)</h3>
		{#if metrics}
			{@const currentStatus = statusConfig()}
			{@const StatusIcon = currentStatus.icon}
			<div
				data-testid="ewc-health-status"
				data-status={healthStatus()}
				class="flex items-center gap-1.5 px-2.5 py-1 rounded-full {currentStatus.bg} {currentStatus.border} border"
			>
				<StatusIcon class="w-4 h-4 {currentStatus.color}" />
				<span class="text-sm font-medium {currentStatus.color}">{currentStatus.label}</span>
			</div>
		{/if}
	</div>

	{#if !metrics}
		<div class="flex items-center justify-center h-48 bg-gray-50 rounded-lg border border-dashed border-gray-300">
			<p class="text-gray-500">No EWC data available</p>
		</div>
	{:else}
		<div class="space-y-6">
			<!-- Main metrics -->
			<div class="grid grid-cols-2 gap-4">
				<!-- Consolidation Strength -->
				<div class="p-4 bg-gray-50 rounded-lg">
					<div class="flex items-center justify-between mb-2">
						<span class="text-sm text-gray-600">Consolidation Strength</span>
						<span class="text-lg font-bold text-emerald-600">
							{(metrics.consolidationStrength * 100).toFixed(0)}%
						</span>
					</div>
					<div class="h-2 bg-gray-200 rounded-full overflow-hidden">
						<div
							class="h-full bg-emerald-500 rounded-full"
							style="width: {metrics.consolidationStrength * 100}%"
						></div>
					</div>
				</div>

				<!-- Forgetting Rate -->
				<div class="p-4 bg-gray-50 rounded-lg">
					<div class="flex items-center justify-between mb-2">
						<span class="text-sm text-gray-600">Forgetting Rate</span>
						<span class="text-lg font-bold {metrics.forgettingRate <= 0.05 ? 'text-green-600' : metrics.forgettingRate <= 0.15 ? 'text-yellow-600' : 'text-red-600'}">
							{(metrics.forgettingRate * 100).toFixed(1)}%
						</span>
					</div>
					<div class="h-2 bg-gray-200 rounded-full overflow-hidden">
						<div
							class="h-full {metrics.forgettingRate <= 0.05 ? 'bg-green-500' : metrics.forgettingRate <= 0.15 ? 'bg-yellow-500' : 'bg-red-500'} rounded-full"
							style="width: {Math.min(metrics.forgettingRate * 100 * 5, 100)}%"
						></div>
					</div>
					<p class="text-xs text-gray-500 mt-1">Target: &lt;5%</p>
				</div>
			</div>

			<!-- Fisher Importance -->
			<div class="p-4 bg-gray-50 rounded-lg">
				<div class="flex items-center justify-between mb-2">
					<span class="text-sm text-gray-600">Fisher Importance</span>
					<span class="text-lg font-bold text-blue-600">
						{(metrics.fisherImportance * 100).toFixed(0)}%
					</span>
				</div>
				<div class="h-2 bg-gray-200 rounded-full overflow-hidden">
					<div
						class="h-full bg-blue-500 rounded-full"
						style="width: {metrics.fisherImportance * 100}%"
					></div>
				</div>
				<p class="text-xs text-gray-500 mt-1">Importance weighting for parameter protection</p>
			</div>

			<!-- Stats row -->
			<div class="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
				<div class="text-center">
					<p class="text-2xl font-bold text-gray-900">{metrics.protectedPatterns}</p>
					<p class="text-xs text-gray-500">Protected Patterns</p>
				</div>
				<div class="text-center">
					<p class="text-2xl font-bold text-gray-900">{metrics.totalConsolidations}</p>
					<p class="text-xs text-gray-500">Consolidations</p>
				</div>
				<div class="text-center">
					<div class="flex items-center justify-center gap-1 text-gray-600">
						<Clock class="w-4 h-4" />
						<p class="text-sm font-medium">Last Consolidation</p>
					</div>
					<p class="text-xs text-gray-500 mt-1">{timeAgo(metrics.lastConsolidation)}</p>
				</div>
			</div>
		</div>
	{/if}
</div>
