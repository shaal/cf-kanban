<script lang="ts">
	/**
	 * Agent Catalog Page
	 * GAP-3.3.1: Visual Agent Catalog
	 *
	 * Browse all 60+ Claude Flow agent types with filtering,
	 * metrics, and pairing suggestions.
	 */
	import { cn } from '$lib/utils';
	import * as Icons from 'lucide-svelte';
	import type { PageData } from './$types';
	import type { AgentCatalogEntry, AgentCatalogFilters } from '$lib/types/agents';
	import { DEFAULT_AGENT_FILTERS } from '$lib/types/agents';
	import {
		AgentFiltersPanel,
		AgentCatalogGrid,
		AgentCatalogList,
		AgentDetailPanel
	} from '$lib/components/agents';

	let { data }: { data: PageData } = $props();

	// State
	let filters: AgentCatalogFilters = $state({ ...DEFAULT_AGENT_FILTERS });
	let selectedAgent: AgentCatalogEntry | null = $state(null);
	let showDetailPanel = $state(false);

	// Filter and sort agents
	const filteredAgents = $derived.by(() => {
		let result = [...data.agents];

		// Search filter
		if (filters.searchQuery) {
			const query = filters.searchQuery.toLowerCase();
			result = result.filter(
				agent =>
					agent.name.toLowerCase().includes(query) ||
					agent.description.toLowerCase().includes(query) ||
					agent.keywords?.some(k => k.includes(query)) ||
					agent.capabilities.some(c => c.toLowerCase().includes(query))
			);
		}

		// Category filter
		if (filters.categories.length > 0) {
			result = result.filter(agent => filters.categories.includes(agent.category));
		}

		// Complexity filter
		if (filters.complexity.length > 0) {
			result = result.filter(agent => filters.complexity.includes(agent.complexity));
		}

		// Success rate filter
		if (filters.minSuccessRate > 0 || filters.maxSuccessRate < 100) {
			result = result.filter(agent => {
				const rate = agent.metrics?.successRate ?? 85;
				return rate >= filters.minSuccessRate && rate <= filters.maxSuccessRate;
			});
		}

		// Sort
		result.sort((a, b) => {
			let comparison = 0;
			switch (filters.sortBy) {
				case 'name':
					comparison = a.name.localeCompare(b.name);
					break;
				case 'successRate':
					comparison = (a.metrics?.successRate ?? 0) - (b.metrics?.successRate ?? 0);
					break;
				case 'usageCount':
					comparison = (a.metrics?.usageCount ?? 0) - (b.metrics?.usageCount ?? 0);
					break;
				case 'avgCompletionTime':
					comparison = (a.metrics?.avgCompletionTime ?? 0) - (b.metrics?.avgCompletionTime ?? 0);
					break;
			}
			return filters.sortDirection === 'desc' ? -comparison : comparison;
		});

		return result;
	});

	// Get pairing suggestions for selected agent
	const pairingSuggestions = $derived.by(() => {
		if (!selectedAgent) return [];
		return selectedAgent.bestPairedWith
			.map(id => data.agents.find(a => a.id === id))
			.filter((a): a is AgentCatalogEntry => a !== undefined);
	});

	// Handlers
	function handleSelectAgent(agent: AgentCatalogEntry) {
		selectedAgent = agent;
		showDetailPanel = true;
	}

	function handleCloseDetail() {
		showDetailPanel = false;
	}

	function handleFilterChange(newFilters: AgentCatalogFilters) {
		filters = newFilters;
	}
</script>

<svelte:head>
	<title>Agent Catalog | CF Kanban</title>
</svelte:head>

<div class="flex h-full">
	<!-- Main Content -->
	<div class={cn('flex-1 flex flex-col overflow-hidden', showDetailPanel && 'lg:mr-96')}>
		<!-- Header -->
		<header class="flex-shrink-0 border-b bg-white px-6 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
						<Icons.Bot class="w-5 h-5 text-white" />
					</div>
					<div>
						<h1 class="text-xl font-semibold text-gray-900">Agent Catalog</h1>
						<p class="text-sm text-gray-500">
							Browse {data.totalAgents} available agent types
						</p>
					</div>
				</div>

				<!-- Quick stats -->
				<div class="hidden md:flex items-center gap-6">
					<div class="text-center">
						<p class="text-2xl font-bold text-gray-900">{data.totalAgents}</p>
						<p class="text-xs text-gray-500">Total Agents</p>
					</div>
					<div class="text-center">
						<p class="text-2xl font-bold text-green-600">{data.avgSuccessRate}%</p>
						<p class="text-xs text-gray-500">Avg Success</p>
					</div>
					<div class="text-center">
						<p class="text-2xl font-bold text-blue-600">{data.categories.length}</p>
						<p class="text-xs text-gray-500">Categories</p>
					</div>
				</div>
			</div>
		</header>

		<!-- Filters -->
		<div class="flex-shrink-0 px-6 py-4 bg-gray-50 border-b">
			<AgentFiltersPanel
				{filters}
				categories={data.categories}
				totalAgents={data.totalAgents}
				filteredCount={filteredAgents.length}
				onchange={handleFilterChange}
			/>
		</div>

		<!-- Agent Grid/List -->
		<main class="flex-1 overflow-y-auto p-6">
			{#if filters.viewMode === 'grid'}
				<AgentCatalogGrid
					agents={filteredAgents}
					{selectedAgent}
					onSelectAgent={handleSelectAgent}
				/>
			{:else}
				<AgentCatalogList
					agents={filteredAgents}
					{selectedAgent}
					onSelectAgent={handleSelectAgent}
				/>
			{/if}
		</main>
	</div>

	<!-- Detail Panel (Desktop) -->
	{#if showDetailPanel && selectedAgent}
		<aside class="hidden lg:block fixed right-0 top-0 bottom-0 w-96 border-l bg-white shadow-lg z-10">
			<AgentDetailPanel
				agent={selectedAgent}
				{pairingSuggestions}
				onclose={handleCloseDetail}
				onSelectAgent={handleSelectAgent}
			/>
		</aside>
	{/if}

	<!-- Detail Panel (Mobile - Modal) -->
	{#if showDetailPanel && selectedAgent}
		<div class="lg:hidden fixed inset-0 z-50">
			<!-- Backdrop -->
			<button
				type="button"
				class="absolute inset-0 bg-black/50"
				onclick={handleCloseDetail}
			></button>

			<!-- Panel -->
			<aside class="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl">
				<AgentDetailPanel
					agent={selectedAgent}
					{pairingSuggestions}
					onclose={handleCloseDetail}
					onSelectAgent={handleSelectAgent}
				/>
			</aside>
		</div>
	{/if}
</div>
