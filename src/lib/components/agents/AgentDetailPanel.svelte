<script lang="ts">
	/**
	 * Agent Detail Panel Component
	 * GAP-3.3.1: Visual Agent Catalog
	 *
	 * Detailed view of a selected agent with full info.
	 */
	import { cn } from '$lib/utils';
	import * as Icons from 'lucide-svelte';
	import type { AgentCatalogEntry } from '$lib/types/agents';
	import { CATEGORY_CONFIG } from '$lib/types/agents';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		agent: AgentCatalogEntry;
		pairingSuggestions?: AgentCatalogEntry[];
		onclose: () => void;
		onSelectAgent?: (agent: AgentCatalogEntry) => void;
		class?: string;
	}

	let { agent, pairingSuggestions = [], onclose, onSelectAgent, class: className = '' }: Props = $props();

	// Get the icon component dynamically
	const IconComponent = $derived((Icons as Record<string, typeof Icons.Code>)[agent.icon] || Icons.Bot);

	// Category config
	const categoryConfig = $derived(CATEGORY_CONFIG[agent.category]);

	// Format time
	function formatTime(ms: number | undefined): string {
		if (!ms) return 'N/A';
		if (ms < 60000) return `${Math.round(ms / 1000)} seconds`;
		return `${Math.round(ms / 60000)} minutes`;
	}

	// Format date
	function formatDate(date: Date | undefined): string {
		if (!date) return 'Never';
		const d = new Date(date);
		const now = new Date();
		const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
		if (diffDays === 0) return 'Today';
		if (diffDays === 1) return 'Yesterday';
		if (diffDays < 7) return `${diffDays} days ago`;
		return d.toLocaleDateString();
	}

	// Complexity color
	const complexityColor = $derived(
		agent.complexity === 'basic'
			? 'text-green-600 bg-green-50'
			: agent.complexity === 'intermediate'
				? 'text-blue-600 bg-blue-50'
				: 'text-orange-600 bg-orange-50'
	);
</script>

<div class={cn('flex flex-col h-full bg-white', className)}>
	<!-- Header -->
	<div class="flex items-start justify-between p-4 border-b">
		<div class="flex items-center gap-3">
			<!-- Icon -->
			<div
				class="w-12 h-12 rounded-xl flex items-center justify-center"
				style="background-color: {categoryConfig?.color}20"
			>
				<IconComponent class="w-6 h-6" style="color: {categoryConfig?.color}" />
			</div>

			<div>
				<h2 class="text-lg font-semibold text-gray-900">{agent.name}</h2>
				<p class="text-sm" style="color: {categoryConfig?.color}">{categoryConfig?.label}</p>
			</div>
		</div>

		<button
			type="button"
			class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
			onclick={onclose}
		>
			<Icons.X class="w-5 h-5" />
		</button>
	</div>

	<!-- Content -->
	<div class="flex-1 overflow-y-auto p-4 space-y-6">
		<!-- Description -->
		<div>
			<p class="text-sm text-gray-600 leading-relaxed">{agent.description}</p>
		</div>

		<!-- Complexity badge -->
		<div class="flex items-center gap-2">
			<span class="text-xs font-medium text-gray-500">Complexity:</span>
			<span class={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', complexityColor)}>
				{agent.complexity}
			</span>
		</div>

		<!-- Metrics -->
		{#if agent.metrics}
			<div>
				<h3 class="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
					<Icons.BarChart3 class="w-4 h-4" />
					Performance Metrics
				</h3>
				<div class="grid grid-cols-2 gap-3">
					<!-- Success Rate -->
					<div class="bg-gray-50 rounded-lg p-3">
						<div class="flex items-center gap-1 text-xs text-gray-500 mb-1">
							<Icons.TrendingUp class="w-3 h-3" />
							Success Rate
						</div>
						<p class={cn(
							'text-xl font-semibold',
							agent.metrics.successRate >= 90 ? 'text-green-600' :
							agent.metrics.successRate >= 80 ? 'text-blue-600' : 'text-yellow-600'
						)}>
							{agent.metrics.successRate}%
						</p>
					</div>

					<!-- Usage Count -->
					<div class="bg-gray-50 rounded-lg p-3">
						<div class="flex items-center gap-1 text-xs text-gray-500 mb-1">
							<Icons.Zap class="w-3 h-3" />
							Total Uses
						</div>
						<p class="text-xl font-semibold text-gray-900">{agent.metrics.usageCount}</p>
					</div>

					<!-- Avg Time -->
					<div class="bg-gray-50 rounded-lg p-3">
						<div class="flex items-center gap-1 text-xs text-gray-500 mb-1">
							<Icons.Clock class="w-3 h-3" />
							Avg. Time
						</div>
						<p class="text-xl font-semibold text-gray-900">{formatTime(agent.metrics.avgCompletionTime)}</p>
					</div>

					<!-- Last Used -->
					<div class="bg-gray-50 rounded-lg p-3">
						<div class="flex items-center gap-1 text-xs text-gray-500 mb-1">
							<Icons.Calendar class="w-3 h-3" />
							Last Used
						</div>
						<p class="text-sm font-semibold text-gray-900">{formatDate(agent.metrics.lastUsed)}</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Capabilities -->
		<div>
			<h3 class="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
				<Icons.Sparkles class="w-4 h-4" />
				Capabilities
			</h3>
			<div class="flex flex-wrap gap-2">
				{#each agent.capabilities as capability}
					<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
						{capability}
					</span>
				{/each}
			</div>
		</div>

		<!-- Use Cases -->
		<div>
			<h3 class="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
				<Icons.Target class="w-4 h-4" />
				Use Cases
			</h3>
			<ul class="space-y-2">
				{#each agent.useCases as useCase}
					<li class="flex items-start gap-2 text-sm text-gray-600">
						<Icons.Check class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
						{useCase}
					</li>
				{/each}
			</ul>
		</div>

		<!-- Best Paired With -->
		{#if pairingSuggestions.length > 0 || agent.bestPairedWith.length > 0}
			<div>
				<h3 class="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
					<Icons.Link2 class="w-4 h-4" />
					Best Paired With
				</h3>
				<div class="space-y-2">
					{#if pairingSuggestions.length > 0}
						{#each pairingSuggestions as pairing}
							{@const PairingIcon = (Icons as Record<string, typeof Icons.Code>)[pairing.icon] || Icons.Bot}
							<button
								type="button"
								class="w-full flex items-center gap-3 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left"
								onclick={() => onSelectAgent?.(pairing)}
							>
								<div
									class="w-8 h-8 rounded-lg flex items-center justify-center"
									style="background-color: {CATEGORY_CONFIG[pairing.category]?.color}20"
								>
									<PairingIcon class="w-4 h-4" style="color: {CATEGORY_CONFIG[pairing.category]?.color}" />
								</div>
								<div class="flex-1">
									<p class="text-sm font-medium text-gray-900">{pairing.name}</p>
									<p class="text-xs text-gray-500">{CATEGORY_CONFIG[pairing.category]?.label}</p>
								</div>
								<Icons.ChevronRight class="w-4 h-4 text-gray-400" />
							</button>
						{/each}
					{:else}
						{#each agent.bestPairedWith as pairingId}
							<span class="inline-flex items-center px-3 py-1.5 rounded-lg text-sm bg-blue-50 text-blue-700">
								{pairingId}
							</span>
						{/each}
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<!-- Footer Actions -->
	<div class="p-4 border-t bg-gray-50">
		<Button class="w-full" disabled>
			<Icons.Play class="w-4 h-4 mr-2" />
			Spawn Agent
		</Button>
		<p class="text-xs text-gray-400 text-center mt-2">Coming in GAP-3.3.5</p>
	</div>
</div>
