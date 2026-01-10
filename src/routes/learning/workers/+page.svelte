<script lang="ts">
	/**
	 * GAP-8.4: Workers Catalog Page
	 *
	 * Displays all 12 Claude Flow V3 background workers organized by priority.
	 */
	import type { PageData } from './$types';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { Cog, Terminal, Copy, Check, AlertTriangle, ArrowUp, Minus, ArrowDown } from 'lucide-svelte';
	import { WORKER_PRIORITIES, type WorkerPriority } from '$lib/types/capabilities';

	let { data }: { data: PageData } = $props();

	let copiedId = $state<string | null>(null);

	async function copyCommand(workerId: string) {
		const command = `npx @claude-flow/cli@latest hooks worker dispatch --trigger ${workerId}`;
		await navigator.clipboard.writeText(command);
		copiedId = workerId;
		setTimeout(() => {
			copiedId = null;
		}, 2000);
	}

	// Priority order for display
	const priorityOrder: WorkerPriority[] = ['critical', 'high', 'normal', 'low'];

	// Priority icons
	const priorityIcons = {
		critical: AlertTriangle,
		high: ArrowUp,
		normal: Minus,
		low: ArrowDown
	};
</script>

<svelte:head>
	<title>Workers Catalog | CF Kanban</title>
</svelte:head>

<div class="p-6 md:p-8">
	<!-- Header -->
	<header class="max-w-5xl mx-auto mb-8">
		<div class="flex items-center gap-3 mb-2">
			<div class="p-2 bg-orange-100 rounded-lg">
				<Cog class="w-6 h-6 text-orange-600" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-gray-900">Background Workers</h1>
				<p class="text-gray-600">{data.totalWorkers} workers available in Claude Flow V3</p>
			</div>
		</div>
		<p class="text-sm text-gray-500 mt-4 max-w-2xl">
			Background workers run asynchronously to perform maintenance tasks, optimizations,
			and automated analysis. They can be triggered manually or run on schedules.
		</p>
	</header>

	<!-- Workers by Priority -->
	<div class="max-w-5xl mx-auto space-y-8">
		{#each priorityOrder as priority}
			{@const workers = data.workersByPriority[priority] || []}
			{@const config = WORKER_PRIORITIES[priority]}
			{@const Icon = priorityIcons[priority]}
			{#if workers.length > 0}
				<section>
					<div class="flex items-center gap-2 mb-4">
						<div
							class="w-3 h-3 rounded-full"
							style="background-color: {config.color}"
						></div>
						<Icon class="w-4 h-4" style="color: {config.color}" />
						<h2 class="text-lg font-semibold text-gray-900">{config.label} Priority</h2>
						<Badge variant="secondary" class="ml-2">{workers.length}</Badge>
					</div>

					<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{#each workers as worker}
							<Card class="p-4">
								<div class="flex items-start justify-between mb-2">
									<div class="flex items-center gap-2">
										<Cog class="w-4 h-4" style="color: {config.color}" />
										<h3 class="font-medium text-gray-900 capitalize">{worker.name}</h3>
									</div>
									<button
										type="button"
										class="p-1.5 rounded hover:bg-gray-100 transition-colors"
										onclick={() => copyCommand(worker.id)}
										title="Copy CLI command"
									>
										{#if copiedId === worker.id}
											<Check class="w-4 h-4 text-green-600" />
										{:else}
											<Copy class="w-4 h-4 text-gray-400" />
										{/if}
									</button>
								</div>
								<p class="text-sm text-gray-600">{worker.description}</p>
							</Card>
						{/each}
					</div>
				</section>
			{/if}
		{/each}
	</div>

	<!-- CLI Usage -->
	<div class="max-w-5xl mx-auto mt-12">
		<Card class="p-6 bg-gray-900 text-gray-100">
			<h3 class="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
				<Terminal class="w-4 h-4" />
				CLI Commands
			</h3>
			<div class="space-y-3 font-mono text-sm">
				<div>
					<span class="text-gray-400"># List all workers</span>
					<br />
					<span class="text-green-400">npx @claude-flow/cli@latest hooks worker list</span>
				</div>
				<div>
					<span class="text-gray-400"># Dispatch a specific worker</span>
					<br />
					<span class="text-green-400">npx @claude-flow/cli@latest hooks worker dispatch --trigger audit</span>
				</div>
				<div>
					<span class="text-gray-400"># Check worker status</span>
					<br />
					<span class="text-green-400">npx @claude-flow/cli@latest hooks worker status</span>
				</div>
			</div>
		</Card>
	</div>
</div>
