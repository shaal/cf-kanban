<script lang="ts">
	/**
	 * Agent Catalog Grid View Component
	 * GAP-3.3.1: Visual Agent Catalog
	 *
	 * Grid layout for displaying agents.
	 */
	import { cn } from '$lib/utils';
	import type { AgentCatalogEntry } from '$lib/types/agents';
	import AgentCard from './AgentCard.svelte';

	interface Props {
		agents: AgentCatalogEntry[];
		selectedAgent: AgentCatalogEntry | null;
		onSelectAgent: (agent: AgentCatalogEntry) => void;
		class?: string;
	}

	let { agents, selectedAgent, onSelectAgent, class: className = '' }: Props = $props();
</script>

<div class={cn('grid gap-4', 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', className)}>
	{#each agents as agent (agent.id)}
		<AgentCard
			{agent}
			selected={selectedAgent?.id === agent.id}
			onclick={onSelectAgent}
		/>
	{/each}
</div>

{#if agents.length === 0}
	<div class="col-span-full flex flex-col items-center justify-center py-12 text-center">
		<div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
			<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
		</div>
		<h3 class="text-sm font-medium text-gray-900">No agents found</h3>
		<p class="mt-1 text-sm text-gray-500">Try adjusting your filters or search query.</p>
	</div>
{/if}
