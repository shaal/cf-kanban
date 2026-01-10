<script lang="ts">
	/**
	 * TASK-076: Neural Training Dashboard Page
	 *
	 * Main page for neural training management including:
	 * - SONA adaptation speed metrics
	 * - MoE expert utilization
	 * - EWC forgetting prevention status
	 * - Training configuration and history
	 * - Pattern viewer and prediction
	 */
	import type { PageData, ActionData } from './$types';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import TrainingLossChart from '$lib/components/neural/TrainingLossChart.svelte';
	import ExpertUtilization from '$lib/components/neural/ExpertUtilization.svelte';
	import EWCStatus from '$lib/components/neural/EWCStatus.svelte';
	import TrainingConfig from '$lib/components/neural/TrainingConfig.svelte';
	import PatternViewer from '$lib/components/neural/PatternViewer.svelte';
	import { Brain, Zap, Shield, Activity, RefreshCw } from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let isRefreshing = $state(false);

	async function refreshData() {
		isRefreshing = true;
		await invalidateAll();
		isRefreshing = false;
	}

	// Calculate SONA performance indicator
	const sonaPerformance = $derived(() => {
		const speed = data.sonaMetrics.adaptationSpeed;
		if (speed <= 0.05) return { status: 'excellent', color: 'text-green-600', bg: 'bg-green-50' };
		if (speed <= 0.1) return { status: 'good', color: 'text-blue-600', bg: 'bg-blue-50' };
		if (speed <= 0.2) return { status: 'moderate', color: 'text-yellow-600', bg: 'bg-yellow-50' };
		return { status: 'slow', color: 'text-red-600', bg: 'bg-red-50' };
	});

	// Format time for display
	function formatTime(ms: number): string {
		if (ms < 1) return `${(ms * 1000).toFixed(1)}us`;
		if (ms < 1000) return `${ms.toFixed(2)}ms`;
		return `${(ms / 1000).toFixed(2)}s`;
	}

	// Format relative time
	function timeAgo(timestamp: number): string {
		const seconds = Math.floor((Date.now() - timestamp) / 1000);
		if (seconds < 60) return `${seconds}s ago`;
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}
</script>

<svelte:head>
	<title>Neural Training | CF Kanban</title>
	<meta name="description" content="Neural network training dashboard for Claude Flow intelligence system" />
</svelte:head>

<main class="min-h-screen bg-gray-50 p-6 md:p-8">
	<!-- Header -->
	<header class="max-w-7xl mx-auto mb-8">
		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
			<div class="flex items-center gap-3">
				<div class="p-2 bg-purple-100 rounded-lg">
					<Brain class="w-6 h-6 text-purple-600" />
				</div>
				<div>
					<h1 class="text-2xl font-bold text-gray-900">Neural Training</h1>
					<p class="text-gray-600">Claude Flow V3 Intelligence System</p>
				</div>
			</div>
			<div class="flex items-center gap-3">
				<span class="text-sm text-gray-500">
					Last updated: {timeAgo(data.lastUpdate)}
				</span>
				<Button variant="outline" size="sm" onclick={refreshData} disabled={isRefreshing}>
					<RefreshCw class="w-4 h-4 mr-2 {isRefreshing ? 'animate-spin' : ''}" />
					Refresh
				</Button>
			</div>
		</div>

		{#if form?.error}
			<div class="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
				{form.error}
			</div>
		{/if}

		{#if form?.success && form?.message}
			<div class="mt-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
				{form.message}
			</div>
		{/if}
	</header>

	<!-- Key Metrics Row -->
	<section class="max-w-7xl mx-auto mb-8">
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<!-- SONA Adaptation Speed -->
			<Card class="p-5">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600">SONA Adaptation</p>
						<p class="text-2xl font-bold {sonaPerformance().color}">
							{formatTime(data.sonaMetrics.adaptationSpeed)}
						</p>
						<p class="text-xs text-gray-500 mt-1">Target: &lt;0.05ms</p>
					</div>
					<div class="p-2 {sonaPerformance().bg} rounded-lg">
						<Zap class="w-5 h-5 {sonaPerformance().color}" />
					</div>
				</div>
				<div class="mt-3 flex items-center gap-2">
					<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
						{sonaPerformance().status === 'excellent' ? 'bg-green-100 text-green-800' :
						sonaPerformance().status === 'good' ? 'bg-blue-100 text-blue-800' :
						sonaPerformance().status === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
						'bg-red-100 text-red-800'}">
						{sonaPerformance().status}
					</span>
					<span class="text-xs text-gray-500">
						{data.sonaMetrics.adaptationCount} adaptations
					</span>
				</div>
			</Card>

			<!-- MoE Expert Count -->
			<Card class="p-5">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600">Active Experts</p>
						<p class="text-2xl font-bold text-blue-600">{data.expertStats.length}</p>
						<p class="text-xs text-gray-500 mt-1">MoE Routing</p>
					</div>
					<div class="p-2 bg-blue-50 rounded-lg">
						<Activity class="w-5 h-5 text-blue-600" />
					</div>
				</div>
				<div class="mt-3">
					<div class="flex items-center gap-1">
						{#each data.expertStats.slice(0, 3) as expert}
							<div class="h-2 flex-1 rounded-full bg-gray-200 overflow-hidden">
								<div
									class="h-full bg-blue-500 rounded-full"
									style="width: {expert.utilization * 100}%"
								></div>
							</div>
						{/each}
					</div>
				</div>
			</Card>

			<!-- EWC Protection -->
			<Card class="p-5">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600">EWC Protection</p>
						<p class="text-2xl font-bold text-emerald-600">
							{(data.ewcMetrics.consolidationStrength * 100).toFixed(0)}%
						</p>
						<p class="text-xs text-gray-500 mt-1">Forgetting prevention</p>
					</div>
					<div class="p-2 bg-emerald-50 rounded-lg">
						<Shield class="w-5 h-5 text-emerald-600" />
					</div>
				</div>
				<div class="mt-3 flex items-center gap-2">
					<span class="text-xs text-gray-500">
						{data.ewcMetrics.protectedPatterns} patterns protected
					</span>
				</div>
			</Card>

			<!-- Training Status -->
			<Card class="p-5">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600">Training Status</p>
						<p class="text-2xl font-bold {data.isTraining ? 'text-amber-600' : 'text-gray-600'}">
							{data.isTraining ? 'Active' : 'Idle'}
						</p>
						<p class="text-xs text-gray-500 mt-1">
							{data.trainingHistory.length} sessions completed
						</p>
					</div>
					<div class="p-2 {data.isTraining ? 'bg-amber-50' : 'bg-gray-100'} rounded-lg">
						<Brain class="w-5 h-5 {data.isTraining ? 'text-amber-600 animate-pulse' : 'text-gray-500'}" />
					</div>
				</div>
				{#if data.isTraining}
					<div class="mt-3">
						<div class="h-2 bg-gray-200 rounded-full overflow-hidden">
							<div class="h-full bg-amber-500 rounded-full animate-pulse" style="width: 45%"></div>
						</div>
					</div>
				{/if}
			</Card>
		</div>
	</section>

	<!-- Charts Row -->
	<section class="max-w-7xl mx-auto mb-8">
		<div class="grid gap-6 lg:grid-cols-2">
			<!-- Training Loss Chart -->
			<Card class="p-6">
				<TrainingLossChart metrics={data.trainingMetrics} height={250} />
			</Card>

			<!-- Expert Utilization -->
			<Card class="p-6">
				<ExpertUtilization experts={data.expertStats} />
			</Card>
		</div>
	</section>

	<!-- EWC Status and Config Row -->
	<section class="max-w-7xl mx-auto mb-8">
		<div class="grid gap-6 lg:grid-cols-2">
			<!-- EWC Status -->
			<Card class="p-6">
				<EWCStatus metrics={data.ewcMetrics} />
			</Card>

			<!-- Training Configuration -->
			<Card class="p-6">
				<TrainingConfig
					config={data.currentConfig}
					history={data.trainingHistory}
					isTraining={data.isTraining}
				/>
			</Card>
		</div>
	</section>

	<!-- Pattern Viewer -->
	<section class="max-w-7xl mx-auto">
		<Card class="p-6">
			<PatternViewer
				patterns={data.patterns}
				prediction={form?.prediction}
			/>
		</Card>
	</section>
</main>
