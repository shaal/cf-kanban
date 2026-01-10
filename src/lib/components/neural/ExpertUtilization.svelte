<script lang="ts">
	/**
	 * TASK-077: Expert Utilization Component
	 *
	 * Displays MoE (Mixture of Experts) utilization as a horizontal bar chart.
	 */
	import type { ExpertStats } from '$lib/types/neural';
	import { Users } from 'lucide-svelte';

	interface Props {
		experts: ExpertStats[];
	}

	let { experts }: Props = $props();

	// Sort experts by utilization (highest first)
	const sortedExperts = $derived([...experts].sort((a, b) => b.utilization - a.utilization));

	// Find the top utilized expert
	const topExpertId = $derived(sortedExperts.length > 0 ? sortedExperts[0].expertId : null);

	// Get utilization color based on value
	function getUtilizationColor(utilization: number): string {
		if (utilization >= 0.8) return 'bg-green-500';
		if (utilization >= 0.6) return 'bg-blue-500';
		if (utilization >= 0.4) return 'bg-yellow-500';
		return 'bg-gray-400';
	}

	// Get expert icon color
	function getExpertBgColor(expertId: string): string {
		const colors: Record<string, string> = {
			coder: 'bg-purple-100 text-purple-600',
			tester: 'bg-green-100 text-green-600',
			reviewer: 'bg-blue-100 text-blue-600',
			architect: 'bg-amber-100 text-amber-600',
			researcher: 'bg-rose-100 text-rose-600',
			coordinator: 'bg-indigo-100 text-indigo-600',
			security: 'bg-red-100 text-red-600',
			performance: 'bg-cyan-100 text-cyan-600'
		};
		return colors[expertId] ?? 'bg-gray-100 text-gray-600';
	}
</script>

<div data-testid="expert-utilization">
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-semibold text-gray-900">Expert Utilization</h3>
		<div class="flex items-center gap-2 text-sm text-gray-500">
			<Users class="w-4 h-4" />
			<span>{experts.length} experts</span>
		</div>
	</div>

	{#if experts.length === 0}
		<div class="flex items-center justify-center h-48 bg-gray-50 rounded-lg border border-dashed border-gray-300">
			<p class="text-gray-500">No expert data available</p>
		</div>
	{:else}
		<div class="space-y-4">
			{#each sortedExperts as expert}
				{@const isTop = expert.expertId === topExpertId}
				<div
					class="relative {isTop ? 'top-expert' : ''}"
					data-testid="expert-bar-{expert.expertId}"
					data-top={isTop}
				>
					<div class="flex items-center justify-between mb-1">
						<div class="flex items-center gap-2">
							<span class="inline-flex items-center justify-center w-6 h-6 rounded {getExpertBgColor(expert.expertId)}">
								<span class="text-xs font-medium uppercase">{expert.expertId[0]}</span>
							</span>
							<span class="text-sm font-medium text-gray-700">{expert.name}</span>
							{#if isTop}
								<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
									Top
								</span>
							{/if}
						</div>
						<div class="flex items-center gap-3 text-sm">
							<span class="text-gray-500">{expert.taskCount} tasks</span>
							<span class="font-semibold text-gray-900">{(expert.utilization * 100).toFixed(0)}%</span>
						</div>
					</div>

					<div class="h-3 bg-gray-100 rounded-full overflow-hidden">
						<div
							class="h-full {getUtilizationColor(expert.utilization)} rounded-full transition-all duration-500"
							style="width: {expert.utilization * 100}%"
						></div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Summary stats -->
		<div class="mt-6 pt-4 border-t border-gray-200">
			<div class="grid grid-cols-3 gap-4 text-center">
				<div>
					<p class="text-2xl font-bold text-gray-900">
						{(experts.reduce((sum, e) => sum + e.utilization, 0) / experts.length * 100).toFixed(0)}%
					</p>
					<p class="text-xs text-gray-500">Avg Utilization</p>
				</div>
				<div>
					<p class="text-2xl font-bold text-gray-900">
						{experts.reduce((sum, e) => sum + e.taskCount, 0)}
					</p>
					<p class="text-xs text-gray-500">Total Tasks</p>
				</div>
				<div>
					<p class="text-2xl font-bold text-gray-900">
						{experts.filter(e => e.utilization >= 0.5).length}
					</p>
					<p class="text-xs text-gray-500">Active (&gt;50%)</p>
				</div>
			</div>
		</div>
	{/if}
</div>
