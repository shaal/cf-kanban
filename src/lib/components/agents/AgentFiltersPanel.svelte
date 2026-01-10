<script lang="ts">
	/**
	 * Agent Filters Panel Component
	 * GAP-3.3.1: Visual Agent Catalog
	 *
	 * Filter controls for the agent catalog.
	 */
	import { cn } from '$lib/utils';
	import * as Icons from 'lucide-svelte';
	import type { AgentCatalogFilters, AgentCategory, AgentComplexity, CategoryConfig } from '$lib/types/agents';
	import { DEFAULT_AGENT_FILTERS } from '$lib/types/agents';
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		filters: AgentCatalogFilters;
		categories: (CategoryConfig & { count: number })[];
		totalAgents: number;
		filteredCount: number;
		onchange: (filters: AgentCatalogFilters) => void;
		class?: string;
	}

	let { filters, categories, totalAgents, filteredCount, onchange, class: className = '' }: Props = $props();

	// Local state for debounced search
	let searchInput = $state(filters.searchQuery);
	let searchTimeout: ReturnType<typeof setTimeout>;

	// Handle search input with debounce
	function handleSearchInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		searchInput = value;

		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			onchange({ ...filters, searchQuery: value });
		}, 300);
	}

	// Toggle category filter
	function toggleCategory(category: AgentCategory) {
		const newCategories = filters.categories.includes(category)
			? filters.categories.filter(c => c !== category)
			: [...filters.categories, category];
		onchange({ ...filters, categories: newCategories });
	}

	// Toggle complexity filter
	function toggleComplexity(complexity: AgentComplexity) {
		const newComplexity = filters.complexity.includes(complexity)
			? filters.complexity.filter(c => c !== complexity)
			: [...filters.complexity, complexity];
		onchange({ ...filters, complexity: newComplexity });
	}

	// Update sort
	function updateSort(e: Event) {
		const value = (e.target as HTMLSelectElement).value;
		const [sortBy, sortDirection] = value.split('-') as [AgentCatalogFilters['sortBy'], 'asc' | 'desc'];
		onchange({ ...filters, sortBy, sortDirection });
	}

	// Toggle view mode
	function setViewMode(mode: 'grid' | 'list') {
		onchange({ ...filters, viewMode: mode });
	}

	// Reset filters
	function resetFilters() {
		searchInput = '';
		onchange({ ...DEFAULT_AGENT_FILTERS });
	}

	// Check if any filters are active
	const hasActiveFilters = $derived(
		filters.searchQuery !== '' ||
		filters.categories.length > 0 ||
		filters.complexity.length > 0 ||
		filters.minSuccessRate > 0 ||
		filters.maxSuccessRate < 100
	);

	const complexityOptions: AgentComplexity[] = ['basic', 'intermediate', 'advanced'];
</script>

<div class={cn('bg-white rounded-lg border p-4', className)}>
	<!-- Search and view toggle -->
	<div class="flex items-center gap-3 mb-4">
		<!-- Search input -->
		<div class="relative flex-1">
			<Icons.Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
			<input
				type="text"
				placeholder="Search agents..."
				value={searchInput}
				oninput={handleSearchInput}
				class="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300"
			/>
			{#if searchInput}
				<button
					type="button"
					class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
					onclick={() => {
						searchInput = '';
						onchange({ ...filters, searchQuery: '' });
					}}
				>
					<Icons.X class="w-4 h-4" />
				</button>
			{/if}
		</div>

		<!-- View toggle -->
		<div class="flex items-center border rounded-lg p-1">
			<button
				type="button"
				class={cn(
					'p-1.5 rounded',
					filters.viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'
				)}
				onclick={() => setViewMode('grid')}
			>
				<Icons.LayoutGrid class="w-4 h-4" />
			</button>
			<button
				type="button"
				class={cn(
					'p-1.5 rounded',
					filters.viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'
				)}
				onclick={() => setViewMode('list')}
			>
				<Icons.List class="w-4 h-4" />
			</button>
		</div>
	</div>

	<!-- Category filters -->
	<div class="mb-4">
		<p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Categories</p>
		<div class="flex flex-wrap gap-2">
			{#each categories as cat}
				<button
					type="button"
					class={cn(
						'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
						filters.categories.includes(cat.category)
							? 'text-white'
							: 'bg-gray-100 text-gray-600 hover:bg-gray-200'
					)}
					style={filters.categories.includes(cat.category) ? `background-color: ${cat.color}` : ''}
					onclick={() => toggleCategory(cat.category)}
				>
					<span
						class="w-2 h-2 rounded-full"
						style="background-color: {filters.categories.includes(cat.category) ? 'white' : cat.color}"
					></span>
					{cat.label}
					<span class="opacity-60">({cat.count})</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Complexity filters -->
	<div class="mb-4">
		<p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Complexity</p>
		<div class="flex gap-2">
			{#each complexityOptions as complexity}
				<button
					type="button"
					class={cn(
						'px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize',
						filters.complexity.includes(complexity)
							? complexity === 'basic'
								? 'bg-green-100 text-green-700 ring-1 ring-green-500'
								: complexity === 'intermediate'
									? 'bg-blue-100 text-blue-700 ring-1 ring-blue-500'
									: 'bg-orange-100 text-orange-700 ring-1 ring-orange-500'
							: 'bg-gray-100 text-gray-600 hover:bg-gray-200'
					)}
					onclick={() => toggleComplexity(complexity)}
				>
					{complexity}
				</button>
			{/each}
		</div>
	</div>

	<!-- Sort and results -->
	<div class="flex items-center justify-between pt-3 border-t">
		<div class="flex items-center gap-2">
			<label for="sort" class="text-xs text-gray-500">Sort by</label>
			<select
				id="sort"
				class="text-xs border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
				value={`${filters.sortBy}-${filters.sortDirection}`}
				onchange={updateSort}
			>
				<option value="name-asc">Name (A-Z)</option>
				<option value="name-desc">Name (Z-A)</option>
				<option value="successRate-desc">Success Rate ↓</option>
				<option value="successRate-asc">Success Rate ↑</option>
				<option value="usageCount-desc">Most Used</option>
				<option value="usageCount-asc">Least Used</option>
				<option value="avgCompletionTime-asc">Fastest</option>
				<option value="avgCompletionTime-desc">Slowest</option>
			</select>
		</div>

		<div class="flex items-center gap-3">
			<span class="text-xs text-gray-500">
				{filteredCount} of {totalAgents} agents
			</span>
			{#if hasActiveFilters}
				<Button variant="ghost" size="sm" onclick={resetFilters}>
					<Icons.RotateCcw class="w-3 h-3 mr-1" />
					Reset
				</Button>
			{/if}
		</div>
	</div>
</div>
