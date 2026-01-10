<script lang="ts">
	/**
	 * TASK-081: Namespace Viewer Page
	 * GAP-3.4.2: Memory Browser Semantic Search
	 *
	 * Displays entries in a namespace with pagination.
	 * Supports expanding entry details, deletion with confirmation,
	 * and similar patterns panel using vector similarity.
	 */
	import type { PageData } from './$types';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { SimilarPatterns } from '$lib/components/memory';
	import {
		ArrowLeft,
		ChevronLeft,
		ChevronRight,
		Trash2,
		Key,
		FileText,
		Tag,
		Clock,
		AlertCircle,
		ChevronDown,
		ChevronUp
	} from 'lucide-svelte';
	import { invalidateAll, goto } from '$app/navigation';
	import { enhance } from '$app/forms';

	export let data: PageData;

	let expandedEntries = new Set<string>();
	let deleteConfirm: string | null = null;
	let isDeleting = false;

	// Handle navigation to a similar entry
	function handleSimilarSelect(entry: { key: string; namespace: string }) {
		// If the entry is in the same namespace, just expand it
		if (entry.namespace === data.namespace) {
			// Check if entry is on current page
			const entryOnPage = data.entries.find(e => e.key === entry.key);
			if (entryOnPage) {
				// Collapse current expanded entries and expand the selected one
				expandedEntries.clear();
				expandedEntries.add(entry.key);
				expandedEntries = expandedEntries;
				// Scroll to the entry
				setTimeout(() => {
					const element = document.querySelector(`[data-entry-key="${entry.key}"]`);
					element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
				}, 100);
			} else {
				// Navigate to the entry (will need to find correct page)
				goto(`/learning/memory/${encodeURIComponent(entry.namespace)}`);
			}
		} else {
			// Navigate to different namespace
			goto(`/learning/memory/${encodeURIComponent(entry.namespace)}`);
		}
	}

	function toggleExpanded(key: string) {
		if (expandedEntries.has(key)) {
			expandedEntries.delete(key);
		} else {
			expandedEntries.add(key);
		}
		expandedEntries = expandedEntries; // Trigger reactivity
	}

	function navigateToPage(page: number) {
		goto(`?page=${page}`, { replaceState: true });
	}

	function formatDate(dateString?: string): string {
		if (!dateString) return 'Unknown';
		try {
			const date = new Date(dateString);
			return date.toLocaleString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return 'Unknown';
		}
	}

	function truncateValue(value: string, maxLength = 200): string {
		if (value.length <= maxLength) return value;
		return value.substring(0, maxLength) + '...';
	}

	// Calculate visible page numbers
	$: visiblePages = (() => {
		const pages: number[] = [];
		const start = Math.max(0, data.page - 2);
		const end = Math.min(data.totalPages - 1, data.page + 2);
		for (let i = start; i <= end; i++) {
			pages.push(i);
		}
		return pages;
	})();
</script>

<svelte:head>
	<title>{data.namespace} | Memory Browser</title>
</svelte:head>

<main class="min-h-screen bg-gray-50">
	<header class="bg-white border-b px-6 py-4">
		<div class="max-w-6xl mx-auto flex items-center gap-4">
			<a href="/learning/memory" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
				<ArrowLeft class="w-5 h-5" />
			</a>
			<div class="flex-1">
				<div class="flex items-center gap-3">
					<h1 class="text-2xl font-bold">{data.namespace}</h1>
					<Badge variant="secondary">{data.totalEntries} entries</Badge>
				</div>
				<p class="text-gray-600 mt-1">
					Viewing entries in namespace
				</p>
			</div>
		</div>
	</header>

	<div class="max-w-6xl mx-auto p-6">
		{#if data.error}
			<Card class="p-6 border-red-200 bg-red-50">
				<div class="flex items-center gap-3 text-red-700">
					<AlertCircle class="w-5 h-5" />
					<div>
						<p class="font-medium">Failed to load entries</p>
						<p class="text-sm">{data.error}</p>
					</div>
				</div>
			</Card>
		{:else if data.entries.length === 0}
			<Card class="p-12 text-center">
				<FileText class="w-16 h-16 text-gray-300 mx-auto mb-4" />
				<h2 class="text-xl font-semibold text-gray-700 mb-2">No Entries</h2>
				<p class="text-gray-500">
					This namespace is empty.
				</p>
			</Card>
		{:else}
			<!-- Entry List -->
			<div class="space-y-3">
				{#each data.entries as entry (entry.key)}
					<Card class="overflow-hidden" data-entry-key={entry.key}>
						<button
							class="w-full p-4 text-left hover:bg-gray-50 transition-colors"
							onclick={() => toggleExpanded(entry.key)}
						>
							<div class="flex items-start gap-4">
								<div class="p-2 bg-blue-50 rounded-lg">
									<Key class="w-4 h-4 text-blue-600" />
								</div>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2">
										<h3 class="font-mono font-medium text-gray-900 truncate">
											{entry.key}
										</h3>
										{#if entry.tags && entry.tags.length > 0}
											<div class="flex gap-1">
												{#each entry.tags.slice(0, 3) as tag}
													<Badge variant="outline" class="text-xs">{tag}</Badge>
												{/each}
												{#if entry.tags.length > 3}
													<Badge variant="outline" class="text-xs">+{entry.tags.length - 3}</Badge>
												{/if}
											</div>
										{/if}
									</div>
									<p class="text-sm text-gray-600 mt-1 line-clamp-2">
										{truncateValue(entry.value)}
									</p>
								</div>
								<div class="flex items-center gap-2">
									{#if expandedEntries.has(entry.key)}
										<ChevronUp class="w-5 h-5 text-gray-400" />
									{:else}
										<ChevronDown class="w-5 h-5 text-gray-400" />
									{/if}
								</div>
							</div>
						</button>

						<!-- Expanded Details -->
						{#if expandedEntries.has(entry.key)}
							<div class="border-t bg-gray-50 p-4 space-y-4">
								<div>
									<label class="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
										<FileText class="w-3 h-3" />
										Value
									</label>
									<pre class="mt-1 p-3 bg-white border rounded-lg text-sm whitespace-pre-wrap font-mono overflow-x-auto">{entry.value}</pre>
								</div>

								{#if entry.tags && entry.tags.length > 0}
									<div>
										<label class="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
											<Tag class="w-3 h-3" />
											Tags
										</label>
										<div class="mt-1 flex flex-wrap gap-1">
											{#each entry.tags as tag}
												<Badge>{tag}</Badge>
											{/each}
										</div>
									</div>
								{/if}

								{#if entry.createdAt || entry.updatedAt}
									<div class="flex gap-6">
										{#if entry.createdAt}
											<div>
												<label class="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
													<Clock class="w-3 h-3" />
													Created
												</label>
												<p class="mt-1 text-sm">{formatDate(entry.createdAt)}</p>
											</div>
										{/if}
										{#if entry.updatedAt}
											<div>
												<label class="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
													<Clock class="w-3 h-3" />
													Updated
												</label>
												<p class="mt-1 text-sm">{formatDate(entry.updatedAt)}</p>
											</div>
										{/if}
									</div>
								{/if}

								<!-- Similar Patterns (GAP-3.4.2) -->
								<SimilarPatterns
									entryKey={entry.key}
									namespace={data.namespace}
									limit={5}
									minConfidence={0.3}
									onSelect={handleSimilarSelect}
								/>

								<!-- Actions -->
								<div class="flex justify-end gap-2 pt-2 border-t">
									{#if deleteConfirm === entry.key}
										<span class="text-sm text-red-600 mr-2">Delete this entry?</span>
										<form
											method="POST"
											action="?/delete"
											use:enhance={() => {
												isDeleting = true;
												return async ({ update }) => {
													await update();
													isDeleting = false;
													deleteConfirm = null;
												};
											}}
										>
											<input type="hidden" name="key" value={entry.key} />
											<Button
												type="submit"
												variant="destructive"
												size="sm"
												disabled={isDeleting}
											>
												Confirm Delete
											</Button>
										</form>
										<Button
											variant="outline"
											size="sm"
											onclick={() => deleteConfirm = null}
											disabled={isDeleting}
										>
											Cancel
										</Button>
									{:else}
										<Button
											variant="ghost"
											size="sm"
											onclick={() => deleteConfirm = entry.key}
										>
											<Trash2 class="w-4 h-4 mr-1" />
											Delete
										</Button>
									{/if}
								</div>
							</div>
						{/if}
					</Card>
				{/each}
			</div>

			<!-- Pagination -->
			{#if data.totalPages > 1}
				<div class="mt-6 flex items-center justify-center gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={data.page === 0}
						onclick={() => navigateToPage(data.page - 1)}
					>
						<ChevronLeft class="w-4 h-4" />
						Previous
					</Button>

					<div class="flex gap-1">
						{#if visiblePages[0] > 0}
							<Button variant="ghost" size="sm" onclick={() => navigateToPage(0)}>
								1
							</Button>
							{#if visiblePages[0] > 1}
								<span class="px-2 text-gray-400">...</span>
							{/if}
						{/if}

						{#each visiblePages as pageNum}
							<Button
								variant={pageNum === data.page ? 'default' : 'ghost'}
								size="sm"
								onclick={() => navigateToPage(pageNum)}
							>
								{pageNum + 1}
							</Button>
						{/each}

						{#if visiblePages[visiblePages.length - 1] < data.totalPages - 1}
							{#if visiblePages[visiblePages.length - 1] < data.totalPages - 2}
								<span class="px-2 text-gray-400">...</span>
							{/if}
							<Button variant="ghost" size="sm" onclick={() => navigateToPage(data.totalPages - 1)}>
								{data.totalPages}
							</Button>
						{/if}
					</div>

					<Button
						variant="outline"
						size="sm"
						disabled={data.page >= data.totalPages - 1}
						onclick={() => navigateToPage(data.page + 1)}
					>
						Next
						<ChevronRight class="w-4 h-4" />
					</Button>
				</div>

				<p class="text-center text-sm text-gray-500 mt-2">
					Showing {data.page * data.pageSize + 1} - {Math.min((data.page + 1) * data.pageSize, data.totalEntries)} of {data.totalEntries}
				</p>
			{/if}
		{/if}
	</div>
</main>
