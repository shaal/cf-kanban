<script lang="ts">
	/**
	 * GAP-3.4.3: Cross-Project Insights Dashboard
	 *
	 * Track pattern origin (project, timestamp)
	 * Track transfer history
	 * Measure success rate post-transfer
	 * UI: Transfer success dashboard
	 * Opt-in/out controls per pattern
	 */
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import {
		BarChart3,
		TrendingUp,
		TrendingDown,
		Minus,
		ArrowRight,
		Calendar,
		FolderGit2,
		CheckCircle,
		XCircle,
		Clock,
		ToggleLeft,
		ToggleRight,
		Filter,
		Download,
		RefreshCw,
		Eye,
		EyeOff,
		ArrowUpDown
	} from 'lucide-svelte';
	import type {
		TransferHistoryEntry,
		TransferPerformanceMetrics,
		PatternSharingSettings
	} from '$lib/types/transfer';
	import type { CrossProjectInsight, PatternOriginInfo, TransferSuccessMetrics } from '$lib/types/transfer';

	interface Props {
		insights: CrossProjectInsight[];
		originInfo: PatternOriginInfo[];
		successMetrics: TransferSuccessMetrics;
		patternOptInStatus: Record<string, boolean>;
		onToggleOptIn?: (patternId: string, optIn: boolean) => void;
		onRefresh?: () => void;
		loading?: boolean;
	}

	let {
		insights = [],
		originInfo = [],
		successMetrics = {
			totalTransfers: 0,
			successfulTransfers: 0,
			failedTransfers: 0,
			rolledBackTransfers: 0,
			averageSuccessRate: 0,
			averageImprovementRate: 0,
			topPerformingPatterns: [],
			recentTrend: 'stable'
		},
		patternOptInStatus = {},
		onToggleOptIn,
		onRefresh,
		loading = false
	}: Props = $props();

	// Local state
	let sortBy = $state<'date' | 'successRate' | 'project'>('date');
	let sortOrder = $state<'asc' | 'desc'>('desc');
	let filterProject = $state<string>('');
	let showOnlyOptedIn = $state(false);
	let expandedInsight = $state<string | null>(null);

	// Get unique projects for filter
	let uniqueProjects = $derived.by(() => {
		const projects = new Set<string>();
		insights.forEach(i => {
			projects.add(i.sourceProjectName);
			projects.add(i.targetProjectName);
		});
		return Array.from(projects).sort();
	});

	// Sorted and filtered insights
	let filteredInsights = $derived.by(() => {
		let result = [...insights];

		// Apply project filter
		if (filterProject) {
			result = result.filter(i =>
				i.sourceProjectName === filterProject ||
				i.targetProjectName === filterProject
			);
		}

		// Apply opt-in filter
		if (showOnlyOptedIn) {
			result = result.filter(i => patternOptInStatus[i.patternId] !== false);
		}

		// Sort
		result.sort((a, b) => {
			let comparison = 0;
			switch (sortBy) {
				case 'date':
					comparison = new Date(b.transferredAt).getTime() - new Date(a.transferredAt).getTime();
					break;
				case 'successRate':
					comparison = b.postTransferSuccessRate - a.postTransferSuccessRate;
					break;
				case 'project':
					comparison = a.sourceProjectName.localeCompare(b.sourceProjectName);
					break;
			}
			return sortOrder === 'desc' ? comparison : -comparison;
		});

		return result;
	});

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function formatRelativeTime(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffDays === 0) return 'Today';
		if (diffDays === 1) return 'Yesterday';
		if (diffDays < 7) return `${diffDays} days ago`;
		if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
		return formatDate(dateString);
	}

	function getSuccessRateColor(rate: number): string {
		if (rate >= 0.8) return 'text-green-600';
		if (rate >= 0.6) return 'text-yellow-600';
		return 'text-red-600';
	}

	function getSuccessRateBadgeVariant(rate: number): 'default' | 'warning' | 'destructive' {
		if (rate >= 0.8) return 'default';
		if (rate >= 0.6) return 'warning';
		return 'destructive';
	}

	function getTrendIcon(trend: 'improving' | 'declining' | 'stable') {
		switch (trend) {
			case 'improving':
				return TrendingUp;
			case 'declining':
				return TrendingDown;
			default:
				return Minus;
		}
	}

	function getTrendColor(trend: 'improving' | 'declining' | 'stable'): string {
		switch (trend) {
			case 'improving':
				return 'text-green-600';
			case 'declining':
				return 'text-red-600';
			default:
				return 'text-gray-600';
		}
	}

	function toggleSort(field: typeof sortBy) {
		if (sortBy === field) {
			sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
		} else {
			sortBy = field;
			sortOrder = 'desc';
		}
	}

	function handleOptInToggle(patternId: string) {
		const currentStatus = patternOptInStatus[patternId] !== false;
		onToggleOptIn?.(patternId, !currentStatus);
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<h2 class="text-xl font-bold text-gray-900 flex items-center gap-2">
				<BarChart3 class="w-6 h-6 text-purple-600" />
				Cross-Project Insights
			</h2>
			<p class="text-sm text-gray-500 mt-1">
				Track pattern transfers and measure success rates across projects
			</p>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" size="sm" onclick={onRefresh} disabled={loading}>
				<RefreshCw class={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
				Refresh
			</Button>
			<Button variant="outline" size="sm">
				<Download class="w-4 h-4 mr-1" />
				Export
			</Button>
		</div>
	</div>

	<!-- Success Metrics Overview -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
		<!-- Total Transfers -->
		<Card class="p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-gray-500">Total Transfers</p>
					<p class="text-2xl font-bold text-gray-900">{successMetrics.totalTransfers}</p>
				</div>
				<div class="p-3 bg-purple-100 rounded-lg">
					<ArrowRight class="w-5 h-5 text-purple-600" />
				</div>
			</div>
		</Card>

		<!-- Success Rate -->
		<Card class="p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-gray-500">Success Rate</p>
					<p class={`text-2xl font-bold ${getSuccessRateColor(successMetrics.averageSuccessRate)}`}>
						{Math.round(successMetrics.averageSuccessRate * 100)}%
					</p>
				</div>
				<div class="p-3 bg-green-100 rounded-lg">
					<CheckCircle class="w-5 h-5 text-green-600" />
				</div>
			</div>
		</Card>

		<!-- Average Improvement -->
		<Card class="p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-gray-500">Avg Improvement</p>
					<p class={`text-2xl font-bold ${successMetrics.averageImprovementRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
						{successMetrics.averageImprovementRate >= 0 ? '+' : ''}{successMetrics.averageImprovementRate.toFixed(1)}%
					</p>
				</div>
				<div class={`p-3 rounded-lg ${successMetrics.averageImprovementRate >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
					<svelte:component
						this={successMetrics.averageImprovementRate >= 0 ? TrendingUp : TrendingDown}
						class={`w-5 h-5 ${successMetrics.averageImprovementRate >= 0 ? 'text-green-600' : 'text-red-600'}`}
					/>
				</div>
			</div>
		</Card>

		<!-- Recent Trend -->
		<Card class="p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-gray-500">Recent Trend</p>
					<p class={`text-lg font-bold capitalize ${getTrendColor(successMetrics.recentTrend)}`}>
						{successMetrics.recentTrend}
					</p>
				</div>
				<div class={`p-3 rounded-lg ${
					successMetrics.recentTrend === 'improving' ? 'bg-green-100' :
					successMetrics.recentTrend === 'declining' ? 'bg-red-100' : 'bg-gray-100'
				}`}>
					<svelte:component
						this={getTrendIcon(successMetrics.recentTrend)}
						class={`w-5 h-5 ${getTrendColor(successMetrics.recentTrend)}`}
					/>
				</div>
			</div>
		</Card>
	</div>

	<!-- Status Breakdown -->
	<Card class="p-5">
		<h3 class="text-sm font-semibold text-gray-700 mb-4">Transfer Status Breakdown</h3>
		<div class="flex gap-6 flex-wrap">
			<div class="flex items-center gap-2">
				<div class="w-3 h-3 rounded-full bg-green-500"></div>
				<span class="text-sm text-gray-600">Successful:</span>
				<span class="font-semibold">{successMetrics.successfulTransfers}</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="w-3 h-3 rounded-full bg-red-500"></div>
				<span class="text-sm text-gray-600">Failed:</span>
				<span class="font-semibold">{successMetrics.failedTransfers}</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="w-3 h-3 rounded-full bg-yellow-500"></div>
				<span class="text-sm text-gray-600">Rolled Back:</span>
				<span class="font-semibold">{successMetrics.rolledBackTransfers}</span>
			</div>
		</div>
		<!-- Progress Bar -->
		{#if successMetrics.totalTransfers > 0}
			<div class="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden flex">
				<div
					class="bg-green-500 h-full"
					style="width: {(successMetrics.successfulTransfers / successMetrics.totalTransfers) * 100}%"
				></div>
				<div
					class="bg-red-500 h-full"
					style="width: {(successMetrics.failedTransfers / successMetrics.totalTransfers) * 100}%"
				></div>
				<div
					class="bg-yellow-500 h-full"
					style="width: {(successMetrics.rolledBackTransfers / successMetrics.totalTransfers) * 100}%"
				></div>
			</div>
		{/if}
	</Card>

	<!-- Top Performing Patterns -->
	{#if successMetrics.topPerformingPatterns.length > 0}
		<Card class="p-5">
			<h3 class="text-sm font-semibold text-gray-700 mb-4">Top Performing Patterns</h3>
			<div class="space-y-3">
				{#each successMetrics.topPerformingPatterns.slice(0, 5) as pattern}
					<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
						<div class="flex items-center gap-3">
							<div class="p-2 bg-purple-100 rounded">
								<CheckCircle class="w-4 h-4 text-purple-600" />
							</div>
							<div>
								<p class="font-medium text-gray-900">{pattern.name}</p>
								<p class="text-xs text-gray-500">From {pattern.sourceProject}</p>
							</div>
						</div>
						<div class="text-right">
							<Badge variant={getSuccessRateBadgeVariant(pattern.successRate)}>
								{Math.round(pattern.successRate * 100)}%
							</Badge>
							<p class="text-xs text-gray-500 mt-1">{pattern.transferCount} transfers</p>
						</div>
					</div>
				{/each}
			</div>
		</Card>
	{/if}

	<!-- Filters and Controls -->
	<Card class="p-4">
		<div class="flex flex-col sm:flex-row gap-4">
			<!-- Project Filter -->
			<div class="flex-1">
				<label for="project-filter" class="block text-xs font-medium text-gray-500 mb-1">
					Filter by Project
				</label>
				<select
					id="project-filter"
					bind:value={filterProject}
					class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
								 focus:outline-none focus:ring-2 focus:ring-purple-500"
				>
					<option value="">All Projects</option>
					{#each uniqueProjects as project}
						<option value={project}>{project}</option>
					{/each}
				</select>
			</div>

			<!-- Sort Controls -->
			<div>
				<label class="block text-xs font-medium text-gray-500 mb-1">Sort By</label>
				<div class="flex gap-1">
					<Button
						variant={sortBy === 'date' ? 'default' : 'outline'}
						size="sm"
						onclick={() => toggleSort('date')}
					>
						<Calendar class="w-3 h-3 mr-1" />
						Date
					</Button>
					<Button
						variant={sortBy === 'successRate' ? 'default' : 'outline'}
						size="sm"
						onclick={() => toggleSort('successRate')}
					>
						<TrendingUp class="w-3 h-3 mr-1" />
						Success
					</Button>
					<Button
						variant={sortBy === 'project' ? 'default' : 'outline'}
						size="sm"
						onclick={() => toggleSort('project')}
					>
						<FolderGit2 class="w-3 h-3 mr-1" />
						Project
					</Button>
				</div>
			</div>

			<!-- Opt-in Filter -->
			<div>
				<label class="block text-xs font-medium text-gray-500 mb-1">Show</label>
				<Button
					variant={showOnlyOptedIn ? 'default' : 'outline'}
					size="sm"
					onclick={() => showOnlyOptedIn = !showOnlyOptedIn}
				>
					{#if showOnlyOptedIn}
						<Eye class="w-3 h-3 mr-1" />
						Opted-in Only
					{:else}
						<Filter class="w-3 h-3 mr-1" />
						All Patterns
					{/if}
				</Button>
			</div>
		</div>
	</Card>

	<!-- Pattern Insights List -->
	<Card class="overflow-hidden">
		<div class="p-4 border-b border-gray-200">
			<h3 class="font-semibold text-gray-900">Transfer Insights</h3>
			<p class="text-sm text-gray-500">{filteredInsights.length} pattern transfers</p>
		</div>

		{#if filteredInsights.length > 0}
			<div class="divide-y divide-gray-200">
				{#each filteredInsights as insight (insight.id)}
					<div class="p-4 hover:bg-gray-50 transition-colors">
						<div class="flex items-start gap-4">
							<!-- Status Indicator -->
							<div class="flex-shrink-0">
								{#if insight.status === 'success'}
									<div class="p-2 bg-green-100 rounded-full">
										<CheckCircle class="w-4 h-4 text-green-600" />
									</div>
								{:else if insight.status === 'failed'}
									<div class="p-2 bg-red-100 rounded-full">
										<XCircle class="w-4 h-4 text-red-600" />
									</div>
								{:else}
									<div class="p-2 bg-yellow-100 rounded-full">
										<Clock class="w-4 h-4 text-yellow-600" />
									</div>
								{/if}
							</div>

							<!-- Main Content -->
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-1">
									<span class="font-medium text-gray-900 truncate">{insight.patternName}</span>
									<Badge variant={getSuccessRateBadgeVariant(insight.postTransferSuccessRate)}>
										{Math.round(insight.postTransferSuccessRate * 100)}% success
									</Badge>
								</div>

								<div class="flex items-center gap-2 text-sm text-gray-500 mb-2">
									<FolderGit2 class="w-3 h-3" />
									<span>{insight.sourceProjectName}</span>
									<ArrowRight class="w-3 h-3" />
									<span>{insight.targetProjectName}</span>
								</div>

								<!-- Origin Info -->
								<div class="flex flex-wrap gap-4 text-xs text-gray-500">
									<span class="flex items-center gap-1">
										<Calendar class="w-3 h-3" />
										Transferred: {formatRelativeTime(insight.transferredAt)}
									</span>
									<span class="flex items-center gap-1">
										<Clock class="w-3 h-3" />
										Created: {formatDate(insight.patternCreatedAt)}
									</span>
									{#if insight.improvementRate !== undefined}
										<span class={`flex items-center gap-1 ${insight.improvementRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
											<svelte:component
												this={insight.improvementRate >= 0 ? TrendingUp : TrendingDown}
												class="w-3 h-3"
											/>
											{insight.improvementRate >= 0 ? '+' : ''}{insight.improvementRate.toFixed(1)}% improvement
										</span>
									{/if}
								</div>

								<!-- Expanded Details -->
								{#if expandedInsight === insight.id}
									<div class="mt-3 p-3 bg-gray-50 rounded-lg">
										<div class="grid grid-cols-2 gap-4 text-sm">
											<div>
												<span class="text-gray-500">Pattern ID</span>
												<p class="font-mono text-xs">{insight.patternId}</p>
											</div>
											<div>
												<span class="text-gray-500">Transfer ID</span>
												<p class="font-mono text-xs">{insight.transferId}</p>
											</div>
											<div>
												<span class="text-gray-500">Pre-transfer Success Rate</span>
												<p>{Math.round(insight.preTransferSuccessRate * 100)}%</p>
											</div>
											<div>
												<span class="text-gray-500">Post-transfer Success Rate</span>
												<p>{Math.round(insight.postTransferSuccessRate * 100)}%</p>
											</div>
											<div>
												<span class="text-gray-500">Usage Count (Before)</span>
												<p>{insight.preTransferUsageCount}</p>
											</div>
											<div>
												<span class="text-gray-500">Usage Count (After)</span>
												<p>{insight.postTransferUsageCount}</p>
											</div>
										</div>
									</div>
								{/if}
							</div>

							<!-- Actions -->
							<div class="flex-shrink-0 flex items-center gap-2">
								<!-- Opt-in/out Toggle -->
								<button
									type="button"
									class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
									onclick={() => handleOptInToggle(insight.patternId)}
									title={patternOptInStatus[insight.patternId] !== false ? 'Opt out of this pattern' : 'Opt in to this pattern'}
								>
									{#if patternOptInStatus[insight.patternId] !== false}
										<ToggleRight class="w-5 h-5 text-green-600" />
									{:else}
										<ToggleLeft class="w-5 h-5 text-gray-400" />
									{/if}
								</button>

								<!-- Expand/Collapse -->
								<Button
									variant="ghost"
									size="sm"
									onclick={() => expandedInsight = expandedInsight === insight.id ? null : insight.id}
								>
									{expandedInsight === insight.id ? 'Less' : 'More'}
								</Button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="p-12 text-center">
				<div class="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-4">
					<BarChart3 class="w-6 h-6 text-gray-400" />
				</div>
				<h3 class="text-gray-900 font-medium mb-1">No insights yet</h3>
				<p class="text-sm text-gray-500">
					Transfer patterns between projects to see insights here.
				</p>
			</div>
		{/if}
	</Card>

	<!-- Pattern Origin Table -->
	{#if originInfo.length > 0}
		<Card class="overflow-hidden">
			<div class="p-4 border-b border-gray-200">
				<h3 class="font-semibold text-gray-900">Pattern Origins</h3>
				<p class="text-sm text-gray-500">Track where patterns originated</p>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Pattern
							</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Origin Project
							</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Created
							</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Transfers
							</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Success Rate
							</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Opt-in
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						{#each originInfo as origin (origin.patternId)}
							<tr class="hover:bg-gray-50">
								<td class="px-4 py-3">
									<span class="font-medium text-gray-900">{origin.patternName}</span>
								</td>
								<td class="px-4 py-3 text-sm text-gray-600">
									{origin.originProjectName}
								</td>
								<td class="px-4 py-3 text-sm text-gray-500">
									{formatDate(origin.createdAt)}
								</td>
								<td class="px-4 py-3 text-sm text-gray-600">
									{origin.transferCount}
								</td>
								<td class="px-4 py-3">
									<Badge variant={getSuccessRateBadgeVariant(origin.avgSuccessRate)}>
										{Math.round(origin.avgSuccessRate * 100)}%
									</Badge>
								</td>
								<td class="px-4 py-3">
									<button
										type="button"
										class="p-1 rounded hover:bg-gray-100"
										onclick={() => handleOptInToggle(origin.patternId)}
									>
										{#if patternOptInStatus[origin.patternId] !== false}
											<ToggleRight class="w-5 h-5 text-green-600" />
										{:else}
											<ToggleLeft class="w-5 h-5 text-gray-400" />
										{/if}
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</Card>
	{/if}
</div>
