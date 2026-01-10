<script lang="ts">
	/**
	 * Agent Card Component
	 * GAP-3.3.1: Visual Agent Catalog
	 *
	 * Displays an agent type with its key info and metrics.
	 */
	import { cn } from '$lib/utils';
	import * as Icons from 'lucide-svelte';
	import type { AgentCatalogEntry } from '$lib/types/agents';
	import { CATEGORY_CONFIG } from '$lib/types/agents';
	import Badge from '$lib/components/ui/Badge.svelte';

	interface Props {
		agent: AgentCatalogEntry;
		selected?: boolean;
		compact?: boolean;
		onclick?: (agent: AgentCatalogEntry) => void;
		class?: string;
	}

	let { agent, selected = false, compact = false, onclick, class: className = '' }: Props = $props();

	// Get the icon component dynamically
	const IconComponent = $derived((Icons as Record<string, typeof Icons.Code>)[agent.icon] || Icons.Bot);

	// Category color
	const categoryColor = $derived(CATEGORY_CONFIG[agent.category]?.color || '#6b7280');

	// Format completion time
	function formatTime(ms: number | undefined): string {
		if (!ms) return '-';
		if (ms < 60000) return `${Math.round(ms / 1000)}s`;
		return `${Math.round(ms / 60000)}m`;
	}

	// Complexity badge variant
	const complexityVariant = $derived(
		agent.complexity === 'basic'
			? 'secondary'
			: agent.complexity === 'intermediate'
				? 'default'
				: 'destructive'
	);
</script>

<button
	type="button"
	class={cn(
		'group relative flex w-full text-left rounded-lg border bg-white transition-all duration-200',
		'hover:shadow-md hover:border-gray-300',
		selected && 'ring-2 ring-blue-500 border-blue-300 shadow-md',
		compact ? 'p-3' : 'p-4',
		className
	)}
	onclick={() => onclick?.(agent)}
>
	<!-- Category indicator bar -->
	<div
		class="absolute left-0 top-3 bottom-3 w-1 rounded-full"
		style="background-color: {categoryColor}"
	></div>

	<div class="flex-1 ml-3">
		<!-- Header row -->
		<div class="flex items-start justify-between gap-2">
			<div class="flex items-center gap-2">
				<!-- Icon -->
				<div
					class="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
					style="background-color: {categoryColor}20"
				>
					<IconComponent class="w-4 h-4" style="color: {categoryColor}" />
				</div>

				<!-- Name and category -->
				<div>
					<h3 class="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
						{agent.name}
					</h3>
					{#if !compact}
						<p class="text-xs text-gray-500">{CATEGORY_CONFIG[agent.category]?.label}</p>
					{/if}
				</div>
			</div>

			<!-- Complexity badge -->
			<Badge variant={complexityVariant} class="text-xs capitalize">
				{agent.complexity}
			</Badge>
		</div>

		<!-- Description -->
		{#if !compact}
			<p class="mt-2 text-sm text-gray-600 line-clamp-2">
				{agent.description}
			</p>
		{/if}

		<!-- Metrics row -->
		{#if agent.metrics && !compact}
			<div class="mt-3 flex items-center gap-4 text-xs text-gray-500">
				<!-- Success rate -->
				<div class="flex items-center gap-1">
					<Icons.TrendingUp class="w-3 h-3" />
					<span class={agent.metrics.successRate >= 85 ? 'text-green-600' : 'text-yellow-600'}>
						{agent.metrics.successRate}%
					</span>
				</div>

				<!-- Usage count -->
				<div class="flex items-center gap-1">
					<Icons.Zap class="w-3 h-3" />
					<span>{agent.metrics.usageCount} uses</span>
				</div>

				<!-- Avg time -->
				<div class="flex items-center gap-1">
					<Icons.Clock class="w-3 h-3" />
					<span>{formatTime(agent.metrics.avgCompletionTime)}</span>
				</div>
			</div>
		{/if}

		<!-- Best paired with (compact view) -->
		{#if compact && agent.bestPairedWith.length > 0}
			<div class="mt-2 flex items-center gap-1 text-xs text-gray-400">
				<Icons.Link class="w-3 h-3" />
				<span>Pairs with: {agent.bestPairedWith.slice(0, 2).join(', ')}</span>
			</div>
		{/if}

		<!-- Capabilities preview -->
		{#if !compact && agent.capabilities.length > 0}
			<div class="mt-3 flex flex-wrap gap-1">
				{#each agent.capabilities.slice(0, 3) as capability}
					<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
						{capability}
					</span>
				{/each}
				{#if agent.capabilities.length > 3}
					<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-50 text-gray-400">
						+{agent.capabilities.length - 3} more
					</span>
				{/if}
			</div>
		{/if}
	</div>
</button>
