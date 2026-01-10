<script lang="ts">
	/**
	 * Graph Legend Component
	 *
	 * TASK-070: Create Graph Legend and Controls
	 *
	 * A legend component for force graphs showing color-coded groups
	 * with toggle functionality.
	 */
	import { cn } from '$lib/utils';
	import type { LegendItem } from './types';

	interface Props {
		items: LegendItem[];
		title?: string;
		collapsible?: boolean;
		onToggle?: (item: LegendItem) => void;
		onShowAll?: () => void;
		onHideAll?: () => void;
		class?: string;
	}

	let {
		items,
		title = 'Legend',
		collapsible = true,
		onToggle,
		onShowAll,
		onHideAll,
		class: className = ''
	}: Props = $props();

	let collapsed = $state(false);

	const visibleCount = $derived(items.filter(i => i.visible).length);
	const allVisible = $derived(visibleCount === items.length);
	const noneVisible = $derived(visibleCount === 0);

	function handleItemClick(item: LegendItem) {
		onToggle?.(item);
	}

	function handleKeyDown(event: KeyboardEvent, item: LegendItem) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onToggle?.(item);
		}
	}

	function toggleCollapse() {
		if (collapsible) {
			collapsed = !collapsed;
		}
	}
</script>

<div class={cn('graph-legend bg-white rounded-lg border border-gray-200 shadow-sm', className)}>
	<!-- Header -->
	<div
		class="legend-header flex items-center justify-between px-3 py-2 border-b border-gray-100"
		class:cursor-pointer={collapsible}
		onclick={toggleCollapse}
		onkeydown={(e) => e.key === 'Enter' && toggleCollapse()}
		role={collapsible ? 'button' : undefined}
		tabindex={collapsible ? 0 : undefined}
		aria-expanded={!collapsed}
	>
		<h3 class="text-sm font-medium text-gray-700">{title}</h3>
		<div class="flex items-center gap-2">
			<span class="text-xs text-gray-500">
				{visibleCount}/{items.length}
			</span>
			{#if collapsible}
				<svg
					class="w-4 h-4 text-gray-400 transition-transform"
					class:rotate-180={!collapsed}
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			{/if}
		</div>
	</div>

	<!-- Content -->
	{#if !collapsed}
		<div class="legend-content p-2">
			<!-- Quick actions -->
			{#if items.length > 1}
				<div class="flex gap-1 mb-2 pb-2 border-b border-gray-100">
					<button
						class="text-xs px-2 py-1 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={allVisible}
						onclick={() => onShowAll?.()}
					>
						Show all
					</button>
					<button
						class="text-xs px-2 py-1 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={noneVisible}
						onclick={() => onHideAll?.()}
					>
						Hide all
					</button>
				</div>
			{/if}

			<!-- Legend items -->
			<ul class="legend-items space-y-1" role="list" aria-label="Graph legend items">
				{#each items as item}
					<li
						class="legend-item flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors"
						class:opacity-50={!item.visible}
						class:hover:bg-gray-50={item.visible}
						class:hover:bg-gray-100={!item.visible}
						role="checkbox"
						aria-checked={item.visible}
						tabindex="0"
						onclick={() => handleItemClick(item)}
						onkeydown={(e) => handleKeyDown(e, item)}
					>
						<!-- Color indicator -->
						<span
							class="w-3 h-3 rounded-full flex-shrink-0 transition-opacity"
							style="background-color: {item.color};"
							class:opacity-40={!item.visible}
						></span>

						<!-- Label -->
						<span
							class="text-sm text-gray-700 flex-1 truncate"
							class:line-through={!item.visible}
						>
							{item.label}
						</span>

						<!-- Visibility icon -->
						<svg
							class="w-4 h-4 flex-shrink-0 transition-colors"
							class:text-gray-400={!item.visible}
							class:text-blue-500={item.visible}
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							{#if item.visible}
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
							{:else}
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
							{/if}
						</svg>
					</li>
				{/each}
			</ul>

			{#if items.length === 0}
				<p class="text-sm text-gray-500 text-center py-2">
					No groups to display
				</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.graph-legend {
		min-width: 160px;
		max-width: 250px;
	}

	.legend-item {
		user-select: none;
	}

	.legend-item:focus {
		outline: 2px solid #3b82f6;
		outline-offset: -2px;
	}
</style>
