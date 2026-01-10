<script lang="ts">
	/**
	 * TASK-084: Cross-Project Transfer Page
	 * GAP-3.4.3: Added Cross-Project Insights Dashboard
	 *
	 * Page for managing cross-project pattern transfers.
	 * Lists patterns available for transfer with project origin and creation date.
	 * Includes insights dashboard showing transfer success rates and opt-in controls.
	 */
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import TransferPreview from '$lib/components/transfer/TransferPreview.svelte';
	import TransferHistory from '$lib/components/transfer/TransferHistory.svelte';
	import InsightsDashboard from '$lib/components/transfer/InsightsDashboard.svelte';
	import { ArrowLeftRight, Calendar, FolderGit2, Percent, Search, BarChart3, List } from 'lucide-svelte';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	let selectedPatternId = $state<string | null>(null);
	let targetProjectId = $state('');
	let showPreview = $state(false);
	let isSubmitting = $state(false);
	let searchQuery = $state('');
	let showHistory = $state(false);
	let activeTab: 'patterns' | 'insights' = $state('insights');
	let optInStatus = $state<Record<string, boolean>>({ ...data.optInStatus });
	let isRefreshing = $state(false);

	// Handle opt-in toggle
	async function handleOptInToggle(patternId: string, optIn: boolean) {
		// Optimistically update the UI
		optInStatus[patternId] = optIn;

		// Submit the form
		const formData = new FormData();
		formData.set('patternId', patternId);
		formData.set('optIn', String(optIn));

		try {
			const response = await fetch('?/toggleOptIn', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				// Revert on failure
				optInStatus[patternId] = !optIn;
			}
		} catch {
			// Revert on error
			optInStatus[patternId] = !optIn;
		}
	}

	// Handle refresh
	function handleRefresh() {
		isRefreshing = true;
		// Reload the page
		window.location.reload();
	}

	// Filter patterns based on search
	let filteredPatterns = $derived(data.patterns.filter((pattern) => {
		if (!searchQuery) return true;
		const query = searchQuery.toLowerCase();
		return (
			pattern.name.toLowerCase().includes(query) ||
			pattern.description.toLowerCase().includes(query) ||
			pattern.keywords.some((k) => k.toLowerCase().includes(query)) ||
			pattern.projectName.toLowerCase().includes(query)
		);
	}));

	function handleTransferClick(patternId: string) {
		selectedPatternId = patternId;
		showPreview = true;
	}

	function closePreview() {
		showPreview = false;
		selectedPatternId = null;
		targetProjectId = '';
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function getSuccessRateVariant(rate: number): 'default' | 'secondary' | 'destructive' | 'warning' {
		if (rate >= 0.8) return 'default';
		if (rate >= 0.6) return 'secondary';
		if (rate >= 0.4) return 'warning';
		return 'destructive';
	}
</script>

<svelte:head>
	<title>Pattern Transfer | CF Kanban</title>
	<meta name="description" content="Transfer patterns between projects" />
</svelte:head>

<main class="min-h-screen bg-gray-50 p-6 md:p-8">
	<!-- Header -->
	<header class="max-w-6xl mx-auto mb-8">
		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
			<div>
				<h1 class="text-3xl font-bold text-gray-900">Pattern Transfer</h1>
				<p class="mt-1 text-gray-600">Transfer patterns between projects and track insights</p>
			</div>
			<div class="flex gap-2">
				<Button variant="outline" onclick={() => (showHistory = !showHistory)}>
					{showHistory ? 'Hide History' : 'View History'}
				</Button>
			</div>
		</div>

		<!-- GAP-3.4.3: Tab Navigation for Patterns and Insights -->
		<div class="mt-6 border-b border-gray-200">
			<nav class="-mb-px flex gap-6" aria-label="Tabs">
				<button
					type="button"
					class="flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors
						{activeTab === 'insights'
							? 'border-purple-500 text-purple-600'
							: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
					onclick={() => (activeTab = 'insights')}
				>
					<BarChart3 class="w-4 h-4" />
					Cross-Project Insights
				</button>
				<button
					type="button"
					class="flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors
						{activeTab === 'patterns'
							? 'border-purple-500 text-purple-600'
							: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
					onclick={() => (activeTab = 'patterns')}
				>
					<List class="w-4 h-4" />
					Available Patterns
				</button>
			</nav>
		</div>
	</header>

	<!-- Success/Error Messages -->
	{#if form?.success}
		<div class="max-w-6xl mx-auto mb-6">
			<div class="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
				{#if form.rolledBack}
					Transfer {form.rolledBack} has been rolled back successfully.
				{:else}
					Pattern transferred successfully! New pattern ID: {form.targetPatternId}
				{/if}
			</div>
		</div>
	{/if}

	{#if form?.error}
		<div class="max-w-6xl mx-auto mb-6">
			<div class="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
				{form.error}
			</div>
		</div>
	{/if}

	<!-- Transfer History Panel -->
	{#if showHistory}
		<div class="max-w-6xl mx-auto mb-8">
			<TransferHistory history={data.history} />
		</div>
	{/if}

	<!-- GAP-3.4.3: Insights Dashboard Tab -->
	{#if activeTab === 'insights'}
		<div class="max-w-6xl mx-auto">
			<InsightsDashboard
				insights={data.insights}
				originInfo={data.originInfo}
				successMetrics={data.successMetrics}
				patternOptInStatus={optInStatus}
				onToggleOptIn={handleOptInToggle}
				onRefresh={handleRefresh}
				loading={isRefreshing}
			/>
		</div>
	{:else}
	<!-- Search and Filters -->
	<div class="max-w-6xl mx-auto mb-6">
		<Card class="p-4">
			<div class="flex flex-col sm:flex-row gap-4">
				<div class="flex-1 relative">
					<Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
					<input
						type="text"
						placeholder="Search patterns by name, keywords, or project..."
						bind:value={searchQuery}
						class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm
									 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
				</div>
				<div class="flex gap-2">
					<select
						class="px-3 py-2 border border-gray-300 rounded-md text-sm
									 focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="">All Projects</option>
					</select>
					<select
						class="px-3 py-2 border border-gray-300 rounded-md text-sm
									 focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="">Min Success Rate</option>
						<option value="0.5">50%+</option>
						<option value="0.7">70%+</option>
						<option value="0.9">90%+</option>
					</select>
				</div>
			</div>
		</Card>
	</div>

	<!-- Patterns Grid -->
	<div class="max-w-6xl mx-auto">
		{#if filteredPatterns.length > 0}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each filteredPatterns as pattern (pattern.id)}
					<Card class="p-5 hover:shadow-md transition-shadow duration-200">
						<div class="flex flex-col h-full">
							<!-- Header -->
							<div class="flex items-start justify-between mb-3">
								<div class="flex items-center gap-2">
									<div class="p-2 bg-purple-50 rounded-lg text-purple-600">
										<ArrowLeftRight class="w-4 h-4" />
									</div>
									<div>
										<h3 class="font-semibold text-gray-900 truncate">{pattern.name}</h3>
										<p class="text-xs text-gray-500 flex items-center gap-1">
											<FolderGit2 class="w-3 h-3" />
											{pattern.projectName}
										</p>
									</div>
								</div>
								{#if pattern.isPublic}
									<Badge variant="outline">Public</Badge>
								{:else}
									<Badge variant="secondary">Private</Badge>
								{/if}
							</div>

							<!-- Description -->
							{#if pattern.description}
								<p class="text-sm text-gray-600 mb-3 line-clamp-2">
									{pattern.description}
								</p>
							{/if}

							<!-- Keywords -->
							{#if pattern.keywords.length > 0}
								<div class="flex flex-wrap gap-1 mb-3">
									{#each pattern.keywords.slice(0, 4) as keyword}
										<span class="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
											{keyword}
										</span>
									{/each}
									{#if pattern.keywords.length > 4}
										<span class="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
											+{pattern.keywords.length - 4}
										</span>
									{/if}
								</div>
							{/if}

							<!-- Stats -->
							<div class="flex items-center gap-4 text-xs text-gray-500 mb-4">
								<div class="flex items-center gap-1">
									<Calendar class="w-3 h-3" />
									{formatDate(pattern.createdAt)}
								</div>
								<div class="flex items-center gap-1">
									<Percent class="w-3 h-3" />
									<Badge variant={getSuccessRateVariant(pattern.successRate)}>
										{Math.round(pattern.successRate * 100)}%
									</Badge>
								</div>
								<span>{pattern.usageCount} uses</span>
							</div>

							<!-- Actions -->
							<div class="mt-auto pt-3 border-t border-gray-100">
								<Button
									variant="outline"
									size="sm"
									class="w-full"
									onclick={() => handleTransferClick(pattern.id)}
								>
									<ArrowLeftRight class="w-3.5 h-3.5 mr-1.5" />
									Transfer
								</Button>
							</div>
						</div>
					</Card>
				{/each}
			</div>
		{:else}
			<!-- Empty State -->
			<div class="text-center py-16">
				<div class="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
					<ArrowLeftRight class="w-8 h-8 text-gray-400" />
				</div>
				<h2 class="text-xl font-semibold text-gray-900 mb-2">No patterns available</h2>
				<p class="text-gray-600 mb-6">
					{#if searchQuery}
						No patterns match your search. Try different keywords.
					{:else}
						There are no patterns available for transfer yet.
					{/if}
				</p>
			</div>
		{/if}
	</div>
	{/if}

	<!-- Transfer Preview Modal -->
	{#if showPreview && selectedPatternId}
		<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
			<Card class="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
				<div class="p-6">
					<TransferPreview
						patternId={selectedPatternId}
						bind:targetProjectId
						onClose={closePreview}
					/>

					<!-- Transfer Form -->
					<form
						method="POST"
						action="?/transfer"
						use:enhance={() => {
							isSubmitting = true;
							return async ({ update }) => {
								isSubmitting = false;
								await update();
								closePreview();
							};
						}}
						class="mt-6 pt-4 border-t border-gray-200"
					>
						<input type="hidden" name="patternId" value={selectedPatternId} />
						<input type="hidden" name="targetProjectId" value={targetProjectId} />

						<div class="mb-4">
							<label for="target-project" class="block text-sm font-medium text-gray-700 mb-1">
								Target Project <span class="text-red-500">*</span>
							</label>
							<input
								type="text"
								id="target-project"
								bind:value={targetProjectId}
								required
								placeholder="Enter target project ID"
								class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
											 focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>

						<div class="flex gap-2 justify-end">
							<Button type="button" variant="ghost" onclick={closePreview} disabled={isSubmitting}>
								Cancel
							</Button>
							<Button type="submit" disabled={isSubmitting || !targetProjectId}>
								{isSubmitting ? 'Transferring...' : 'Confirm Transfer'}
							</Button>
						</div>
					</form>
				</div>
			</Card>
		</div>
	{/if}
</main>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
