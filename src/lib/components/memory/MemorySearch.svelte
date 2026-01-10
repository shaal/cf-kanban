<script lang="ts">
	/**
	 * TASK-082: Memory Search Component
	 * GAP-3.4.2: Memory Browser Semantic Search
	 *
	 * Semantic search for memory entries with:
	 * - Real-time search with 300ms debounce
	 * - Similarity score display (0-1)
	 * - Term highlighting in results
	 * - Namespace filtering
	 * - Toggle between keyword and vector (HNSW) search modes
	 */
	import { createEventDispatcher } from 'svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { Search, Loader2, X, Key, AlertCircle, Zap, Type } from 'lucide-svelte';

	interface MemoryEntry {
		key: string;
		value: string;
		namespace: string;
		similarity?: number;
		tags?: string[];
	}

	interface Props {
		namespace?: string;
		placeholder?: string;
		minQueryLength?: number;
		debounceMs?: number;
		defaultSearchMode?: 'keyword' | 'vector';
	}

	let {
		namespace = undefined,
		placeholder = 'Search memory entries...',
		minQueryLength = 2,
		debounceMs = 300,
		defaultSearchMode = 'vector'
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		select: MemoryEntry;
		search: { query: string; results: MemoryEntry[]; mode: 'keyword' | 'vector' };
	}>();

	let query = $state('');
	let results = $state<MemoryEntry[]>([]);
	let isSearching = $state(false);
	let error = $state<string | null>(null);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let searchMode = $state<'keyword' | 'vector'>(defaultSearchMode);
	let isVectorSearch = $state(false); // Tracks if last search used vector similarity

	// Debounced search
	$effect(() => {
		if (debounceTimer) clearTimeout(debounceTimer);

		const trimmedQuery = query.trim();
		if (trimmedQuery.length < minQueryLength) {
			results = [];
			error = null;
			return;
		}

		debounceTimer = setTimeout(async () => {
			await performSearch(trimmedQuery);
		}, debounceMs);

		return () => {
			if (debounceTimer) clearTimeout(debounceTimer);
		};
	});

	async function performSearch(searchQuery: string) {
		isSearching = true;
		error = null;

		try {
			const params = new URLSearchParams({ query: searchQuery });
			if (namespace) params.set('namespace', namespace);

			// Use vector search endpoint when in vector mode
			const endpoint = searchMode === 'vector'
				? '/api/memory/vector-search'
				: '/api/memory/search';

			const response = await fetch(`${endpoint}?${params}`);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Search failed');
			}

			const data = await response.json();
			results = data.entries || [];
			isVectorSearch = data.isVectorSearch ?? (searchMode === 'vector');
			dispatch('search', { query: searchQuery, results, mode: searchMode });
		} catch (err) {
			error = err instanceof Error ? err.message : 'Search failed';
			results = [];
			isVectorSearch = false;
		} finally {
			isSearching = false;
		}
	}

	function toggleSearchMode() {
		searchMode = searchMode === 'vector' ? 'keyword' : 'vector';
		// Re-run search if we have a query
		if (query.trim().length >= minQueryLength) {
			performSearch(query.trim());
		}
	}

	function clearSearch() {
		query = '';
		results = [];
		error = null;
	}

	function handleSelect(entry: MemoryEntry) {
		dispatch('select', entry);
	}

	function highlightTerms(text: string, searchQuery: string): Array<{ text: string; highlight: boolean }> {
		const terms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
		if (terms.length === 0) return [{ text, highlight: false }];

		const regex = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
		const parts = text.split(regex);

		return parts.map(part => ({
			text: part,
			highlight: terms.some(t => part.toLowerCase() === t.toLowerCase())
		}));
	}

	function formatSimilarity(score?: number): string {
		if (score === undefined) return '';
		return `${Math.round(score * 100)}%`;
	}

	function getSimilarityClass(score?: number): string {
		if (score === undefined) return 'text-gray-400';
		if (score >= 0.8) return 'text-green-600 bg-green-50';
		if (score >= 0.6) return 'text-yellow-600 bg-yellow-50';
		if (score >= 0.4) return 'text-orange-600 bg-orange-50';
		return 'text-red-600 bg-red-50';
	}

	function getSimilarityBarColor(score?: number): string {
		if (score === undefined) return 'bg-gray-300';
		if (score >= 0.8) return 'bg-green-500';
		if (score >= 0.6) return 'bg-yellow-500';
		if (score >= 0.4) return 'bg-orange-500';
		return 'bg-red-500';
	}

	function truncateValue(value: string, maxLength = 150): string {
		if (value.length <= maxLength) return value;
		return value.substring(0, maxLength) + '...';
	}
</script>

<div class="space-y-4">
	<!-- Search Input with Mode Toggle -->
	<div class="flex gap-2">
		<div class="relative flex-1">
			<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
				{#if isSearching}
					<Loader2 class="w-5 h-5 text-gray-400 animate-spin" />
				{:else}
					<Search class="w-5 h-5 text-gray-400" />
				{/if}
			</div>
			<Input
				type="search"
				bind:value={query}
				{placeholder}
				class="pl-10 pr-10"
			/>
			{#if query}
				<button
					class="absolute inset-y-0 right-0 pr-3 flex items-center"
					onclick={clearSearch}
					aria-label="Clear search"
				>
					<X class="w-5 h-5 text-gray-400 hover:text-gray-600" />
				</button>
			{/if}
		</div>
		<!-- Search Mode Toggle -->
		<div title={searchMode === 'vector' ? 'Using vector similarity (HNSW)' : 'Using keyword search'}>
			<Button
				variant="outline"
				size="sm"
				onclick={toggleSearchMode}
				class="shrink-0"
			>
				{#if searchMode === 'vector'}
					<Zap class="w-4 h-4 mr-1 text-yellow-500" />
					Vector
				{:else}
					<Type class="w-4 h-4 mr-1" />
					Keyword
				{/if}
			</Button>
		</div>
	</div>

	<!-- Search Mode Info and Namespace Filter -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			{#if namespace}
				<span class="text-sm text-gray-500">Searching in:</span>
				<Badge variant="secondary">{namespace}</Badge>
			{/if}
		</div>
		{#if results.length > 0 && isVectorSearch}
			<Badge variant="outline" class="text-xs flex items-center gap-1">
				<Zap class="w-3 h-3 text-yellow-500" />
				HNSW Indexed
			</Badge>
		{/if}
	</div>

	<!-- Error Message -->
	{#if error}
		<Card class="p-4 border-red-200 bg-red-50">
			<div class="flex items-center gap-2 text-red-700">
				<AlertCircle class="w-4 h-4" />
				<span class="text-sm">{error}</span>
			</div>
		</Card>
	{/if}

	<!-- Results -->
	{#if results.length > 0}
		<div class="space-y-2">
			<p class="text-sm text-gray-500">
				Found {results.length} result{results.length !== 1 ? 's' : ''}
			</p>

			<div class="space-y-2">
				{#each results as entry (entry.key)}
					<button
						class="w-full text-left"
						onclick={() => handleSelect(entry)}
					>
						<Card class="p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
							<div class="flex items-start gap-3">
								<div class="p-2 bg-blue-50 rounded-lg shrink-0">
									<Key class="w-4 h-4 text-blue-600" />
								</div>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 flex-wrap">
										<h4 class="font-mono font-medium text-gray-900">
											{#each highlightTerms(entry.key, query) as part}
												{#if part.highlight}
													<mark class="bg-yellow-200 rounded px-0.5">{part.text}</mark>
												{:else}
													{part.text}
												{/if}
											{/each}
										</h4>
										{#if entry.similarity !== undefined}
											<span class={`text-xs font-medium px-1.5 py-0.5 rounded ${getSimilarityClass(entry.similarity)}`}>
												{formatSimilarity(entry.similarity)} match
											</span>
										{/if}
									</div>
									<p class="text-sm text-gray-600 mt-1">
										{#each highlightTerms(truncateValue(entry.value), query) as part}
											{#if part.highlight}
												<mark class="bg-yellow-200 rounded px-0.5">{part.text}</mark>
											{:else}
												{part.text}
											{/if}
										{/each}
									</p>
									{#if entry.tags && entry.tags.length > 0}
										<div class="flex gap-1 mt-2">
											{#each entry.tags.slice(0, 4) as tag}
												<Badge variant="outline" class="text-xs">{tag}</Badge>
											{/each}
										</div>
									{/if}
									<!-- Similarity bar visualization -->
									{#if entry.similarity !== undefined && isVectorSearch}
										<div class="mt-2 flex items-center gap-2">
											<div class="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
												<div
													class={`h-full ${getSimilarityBarColor(entry.similarity)} transition-all`}
													style="width: {entry.similarity * 100}%"
												></div>
											</div>
											<span class="text-xs text-gray-400 shrink-0">similarity</span>
										</div>
									{/if}
								</div>
							</div>
						</Card>
					</button>
				{/each}
			</div>
		</div>
	{:else if query.trim().length >= minQueryLength && !isSearching && !error}
		<Card class="p-8 text-center">
			<Search class="w-12 h-12 text-gray-300 mx-auto mb-3" />
			<p class="text-gray-500">No results found for "{query}"</p>
			<p class="text-sm text-gray-400 mt-1">Try different keywords</p>
		</Card>
	{:else if query.trim().length > 0 && query.trim().length < minQueryLength}
		<p class="text-sm text-gray-500 text-center">
			Type at least {minQueryLength} characters to search
		</p>
	{/if}
</div>
