<script lang="ts">
	/**
	 * GAP-8.4: Hooks Catalog Page
	 *
	 * Displays all 27 Claude Flow V3 hooks organized by category.
	 */
	import type { PageData } from './$types';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { Anchor, Terminal, Copy, Check } from 'lucide-svelte';
	import { HOOK_CATEGORIES, type HookCategory } from '$lib/types/capabilities';

	let { data }: { data: PageData } = $props();

	let copiedId = $state<string | null>(null);

	async function copyCommand(hookId: string) {
		const command = `npx @claude-flow/cli@latest hooks ${hookId}`;
		await navigator.clipboard.writeText(command);
		copiedId = hookId;
		setTimeout(() => {
			copiedId = null;
		}, 2000);
	}
</script>

<svelte:head>
	<title>Hooks Catalog | CF Kanban</title>
</svelte:head>

<div class="p-6 md:p-8">
	<!-- Header -->
	<header class="max-w-5xl mx-auto mb-8">
		<div class="flex items-center gap-3 mb-2">
			<div class="p-2 bg-blue-100 rounded-lg">
				<Anchor class="w-6 h-6 text-blue-600" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-gray-900">Hooks Catalog</h1>
				<p class="text-gray-600">{data.totalHooks} hooks available in Claude Flow V3</p>
			</div>
		</div>
	</header>

	<!-- Hooks by Category -->
	<div class="max-w-5xl mx-auto space-y-8">
		{#each Object.entries(HOOK_CATEGORIES) as [categoryId, categoryConfig]}
			{@const hooks = data.hooksByCategory[categoryId] || []}
			{#if hooks.length > 0}
				<section>
					<div class="flex items-center gap-2 mb-4">
						<div
							class="w-3 h-3 rounded-full"
							style="background-color: {categoryConfig.color}"
						></div>
						<h2 class="text-lg font-semibold text-gray-900">{categoryConfig.label}</h2>
						<Badge variant="secondary" class="ml-2">{hooks.length}</Badge>
					</div>

					<div class="grid gap-4 sm:grid-cols-2">
						{#each hooks as hook}
							<Card class="p-4">
								<div class="flex items-start justify-between mb-2">
									<div class="flex items-center gap-2">
										<Terminal class="w-4 h-4 text-gray-400" />
										<h3 class="font-medium text-gray-900">{hook.name}</h3>
									</div>
									<button
										type="button"
										class="p-1.5 rounded hover:bg-gray-100 transition-colors"
										onclick={() => copyCommand(hook.id)}
										title="Copy CLI command"
									>
										{#if copiedId === hook.id}
											<Check class="w-4 h-4 text-green-600" />
										{:else}
											<Copy class="w-4 h-4 text-gray-400" />
										{/if}
									</button>
								</div>
								<p class="text-sm text-gray-600 mb-3">{hook.description}</p>
								<div class="flex flex-wrap gap-1">
									{#each hook.keyOptions as option}
										<code class="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">
											{option}
										</code>
									{/each}
								</div>
							</Card>
						{/each}
					</div>
				</section>
			{/if}
		{/each}
	</div>
</div>
