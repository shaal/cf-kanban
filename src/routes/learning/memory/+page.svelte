<script lang="ts">
	/**
	 * TASK-080: Memory Browser Page
	 *
	 * Displays memory namespaces with entry counts.
	 * Click on a namespace card to view its entries.
	 * Includes search (TASK-082) and add entry (TASK-083) functionality.
	 */
	import type { PageData } from './$types';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { MemorySearch, AddEntryForm } from '$lib/components/memory';
	import { Database, FolderOpen, ArrowLeft, RefreshCw, AlertCircle, Plus, Search } from 'lucide-svelte';
	import { invalidateAll, goto } from '$app/navigation';

	export let data: PageData;

	let isRefreshing = false;
	let showSearch = $state(false);
	let showAddForm = $state(false);

	async function handleRefresh() {
		isRefreshing = true;
		try {
			await invalidateAll();
		} finally {
			isRefreshing = false;
		}
	}

	function formatEntryCount(count: number): string {
		if (count === 0) return 'No entries';
		if (count === 1) return '1 entry';
		return `${count} entries`;
	}

	function formatDate(dateString?: string): string {
		if (!dateString) return '';
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return '';
		}
	}

	// Calculate total entries across all namespaces
	$: totalEntries = data.namespaces.reduce((sum, ns) => sum + ns.entryCount, 0);
	$: namespaceNames = data.namespaces.map(ns => ns.name);

	function handleSearchSelect(event: CustomEvent<{ key: string; namespace: string }>) {
		const entry = event.detail;
		goto(`/learning/memory/${encodeURIComponent(entry.namespace)}`);
	}

	async function handleEntryAdded() {
		showAddForm = false;
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>Memory Browser | CF Kanban</title>
</svelte:head>

<main class="min-h-screen bg-gray-50">
	<header class="bg-white border-b px-6 py-4">
		<div class="max-w-6xl mx-auto flex items-center gap-4">
			<a href="/learning" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
				<ArrowLeft class="w-5 h-5" />
			</a>
			<div class="flex-1">
				<div class="flex items-center gap-3">
					<Database class="w-6 h-6 text-blue-600" />
					<h1 class="text-2xl font-bold">Memory Browser</h1>
				</div>
				<p class="text-gray-600 mt-1">
					Browse and manage Claude Flow memory entries
				</p>
			</div>
			<div class="flex items-center gap-4">
				<span class="text-sm text-gray-500">
					{data.namespaces.length} namespace{data.namespaces.length !== 1 ? 's' : ''}
					| {totalEntries} total entries
				</span>
				<Button
					variant="outline"
					size="sm"
					onclick={() => showSearch = !showSearch}
				>
					<Search class="w-4 h-4 mr-2" />
					Search
				</Button>
				<Button
					variant="outline"
					size="sm"
					onclick={() => showAddForm = !showAddForm}
				>
					<Plus class="w-4 h-4 mr-2" />
					Add Entry
				</Button>
				<Button
					variant="outline"
					size="sm"
					onclick={handleRefresh}
					disabled={isRefreshing}
				>
					<RefreshCw class="w-4 h-4 mr-2 {isRefreshing ? 'animate-spin' : ''}" />
					Refresh
				</Button>
			</div>
		</div>
	</header>

	<div class="max-w-6xl mx-auto p-6">
		<!-- Search Panel -->
		{#if showSearch}
			<Card class="p-6 mb-6">
				<h3 class="text-lg font-semibold mb-4">Search Memory</h3>
				<MemorySearch on:select={handleSearchSelect} />
			</Card>
		{/if}

		<!-- Add Entry Form -->
		{#if showAddForm}
			<div class="mb-6">
				<AddEntryForm
					namespaces={namespaceNames.length > 0 ? namespaceNames : undefined}
					on:submit={handleEntryAdded}
					on:cancel={() => showAddForm = false}
				/>
			</div>
		{/if}

		{#if data.error}
			<Card class="p-6 border-red-200 bg-red-50">
				<div class="flex items-center gap-3 text-red-700">
					<AlertCircle class="w-5 h-5" />
					<div>
						<p class="font-medium">Failed to load memory</p>
						<p class="text-sm">{data.error}</p>
					</div>
				</div>
			</Card>
		{:else if data.namespaces.length === 0}
			<Card class="p-12 text-center">
				<Database class="w-16 h-16 text-gray-300 mx-auto mb-4" />
				<h2 class="text-xl font-semibold text-gray-700 mb-2">No Memory Entries</h2>
				<p class="text-gray-500 mb-6">
					Memory is empty. Claude Flow will automatically store patterns and learnings as you work.
				</p>
				<Button variant="outline" onclick={handleRefresh}>
					<RefreshCw class="w-4 h-4 mr-2" />
					Check Again
				</Button>
			</Card>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each data.namespaces as namespace}
					<a
						href="/learning/memory/{encodeURIComponent(namespace.name)}"
						class="block group"
					>
						<Card class="p-6 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
							<div class="flex items-start gap-4">
								<div class="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
									<FolderOpen class="w-6 h-6 text-blue-600" />
								</div>
								<div class="flex-1 min-w-0">
									<h3 class="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
										{namespace.name}
									</h3>
									<p class="text-sm text-gray-500 mt-1">
										{formatEntryCount(namespace.entryCount)}
									</p>
									{#if namespace.lastUpdated}
										<p class="text-xs text-gray-400 mt-2">
											Last updated: {formatDate(namespace.lastUpdated)}
										</p>
									{/if}
								</div>
								<div class="text-2xl font-bold text-gray-200 group-hover:text-blue-200 transition-colors">
									{namespace.entryCount}
								</div>
							</div>
						</Card>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</main>
