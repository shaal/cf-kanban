<script lang="ts">
	/**
	 * GAP-3.4.2: Similar Patterns Component
	 *
	 * Displays similar memory entries based on vector similarity search.
	 * Features:
	 * - Visual similarity scores with progress bars
	 * - Search method indicator (HNSW vs fallback)
	 * - Clickable entries for navigation
	 */
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { Link2, Loader2, AlertCircle, Zap, Search, Key } from 'lucide-svelte';

	interface SimilarEntry {
		entry: {
			key: string;
			value: string;
			namespace: string;
			tags?: string[];
		};
		similarity: number;
	}

	interface Props {
		entryKey: string;
		namespace?: string;
		limit?: number;
		minConfidence?: number;
		onSelect?: (entry: SimilarEntry['entry']) => void;
	}

	let {
		entryKey,
		namespace = undefined,
		limit = 5,
		minConfidence = 0.3,
		onSelect
	}: Props = $props();

	let similarEntries = $state<SimilarEntry[]>([]);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let searchMethod = $state<'hnsw' | 'linear' | 'fallback'>('fallback');

	// Fetch similar entries when entryKey changes
	$effect(() => {
		if (entryKey) {
			fetchSimilarEntries();
		}
	});

	async function fetchSimilarEntries() {
		isLoading = true;
		error = null;

		try {
			const params = new URLSearchParams({
				key: entryKey,
				limit: String(limit),
				minConfidence: String(minConfidence)
			});
			if (namespace) params.set('namespace', namespace);

			const response = await fetch(`/api/memory/similar?${params}`);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to fetch similar entries');
			}

			const data = await response.json();
			similarEntries = data.entries || [];
			searchMethod = data.searchMethod || 'fallback';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to fetch similar entries';
			similarEntries = [];
		} finally {
			isLoading = false;
		}
	}

	function formatSimilarity(score: number): string {
		return `${Math.round(score * 100)}%`;
	}

	function getSimilarityColor(score: number): string {
		if (score >= 0.8) return 'bg-green-500';
		if (score >= 0.6) return 'bg-yellow-500';
		if (score >= 0.4) return 'bg-orange-500';
		return 'bg-red-500';
	}

	function getSimilarityTextColor(score: number): string {
		if (score >= 0.8) return 'text-green-700';
		if (score >= 0.6) return 'text-yellow-700';
		if (score >= 0.4) return 'text-orange-700';
		return 'text-red-700';
	}

	function truncateValue(value: string, maxLength = 100): string {
		if (value.length <= maxLength) return value;
		return value.substring(0, maxLength) + '...';
	}

	function handleSelect(entry: SimilarEntry['entry']) {
		if (onSelect) {
			onSelect(entry);
		}
	}

	function getSearchMethodInfo(): { label: string; description: string; icon: typeof Zap } {
		switch (searchMethod) {
			case 'hnsw':
				return {
					label: 'HNSW',
					description: 'Using fast vector index',
					icon: Zap
				};
			case 'linear':
				return {
					label: 'Linear',
					description: 'Using linear scan',
					icon: Search
				};
			default:
				return {
					label: 'Fallback',
					description: 'Using text similarity',
					icon: Search
				};
		}
	}
</script>

<Card class="p-4">
	<div class="flex items-center justify-between mb-4">
		<h4 class="text-sm font-semibold text-gray-700 flex items-center gap-2">
			<Link2 class="w-4 h-4" />
			Similar Patterns
		</h4>
		{#if !isLoading && similarEntries.length > 0}
			{@const methodInfo = getSearchMethodInfo()}
			<span title={methodInfo.description}>
				<Badge
					variant="outline"
					class="text-xs flex items-center gap-1"
				>
					<svelte:component this={methodInfo.icon} class="w-3 h-3" />
					{methodInfo.label}
				</Badge>
			</span>
		{/if}
	</div>

	{#if isLoading}
		<div class="flex items-center justify-center py-6">
			<Loader2 class="w-6 h-6 text-gray-400 animate-spin" />
			<span class="ml-2 text-sm text-gray-500">Finding similar patterns...</span>
		</div>
	{:else if error}
		<div class="flex items-center gap-2 text-red-600 py-4">
			<AlertCircle class="w-4 h-4" />
			<span class="text-sm">{error}</span>
		</div>
	{:else if similarEntries.length === 0}
		<div class="text-center py-6">
			<Link2 class="w-8 h-8 text-gray-300 mx-auto mb-2" />
			<p class="text-sm text-gray-500">No similar patterns found</p>
			<p class="text-xs text-gray-400 mt-1">
				Try entries with more content for better matching
			</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each similarEntries as { entry, similarity } (entry.key)}
				<button
					class="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
					onclick={() => handleSelect(entry)}
				>
					<div class="flex items-start gap-3">
						<div class="p-1.5 bg-blue-50 rounded group-hover:bg-blue-100 transition-colors shrink-0">
							<Key class="w-3 h-3 text-blue-600" />
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-1">
								<span class="font-mono text-sm font-medium text-gray-900 truncate">
									{entry.key}
								</span>
								<span class={`text-xs font-medium ${getSimilarityTextColor(similarity)}`}>
									{formatSimilarity(similarity)}
								</span>
							</div>
							<p class="text-xs text-gray-600 line-clamp-2">
								{truncateValue(entry.value)}
							</p>
							<!-- Similarity bar -->
							<div class="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
								<div
									class={`h-full ${getSimilarityColor(similarity)} transition-all`}
									style="width: {similarity * 100}%"
								></div>
							</div>
						</div>
					</div>
				</button>
			{/each}
		</div>
	{/if}
</Card>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
