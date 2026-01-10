<script lang="ts">
	/**
	 * Graph Controls Component
	 *
	 * TASK-070: Create Graph Legend and Controls
	 *
	 * Control panel for force graphs with search, zoom, and filter options.
	 */
	import { cn } from '$lib/utils';
	import type { ForceNode, GraphFilter } from './types';

	interface Props {
		searchQuery?: string;
		searchPlaceholder?: string;
		showZoomControls?: boolean;
		showDisplayOptions?: boolean;
		showLabels?: boolean;
		showLinks?: boolean;
		animationsEnabled?: boolean;
		zoomLevel?: number;
		minZoom?: number;
		maxZoom?: number;
		onSearchChange?: (query: string) => void;
		onZoomIn?: () => void;
		onZoomOut?: () => void;
		onResetZoom?: () => void;
		onFitToScreen?: () => void;
		onToggleLabels?: () => void;
		onToggleLinks?: () => void;
		onToggleAnimations?: () => void;
		onClearSearch?: () => void;
		class?: string;
	}

	let {
		searchQuery = '',
		searchPlaceholder = 'Search nodes...',
		showZoomControls = true,
		showDisplayOptions = true,
		showLabels = true,
		showLinks = true,
		animationsEnabled = true,
		zoomLevel = 1,
		minZoom = 0.1,
		maxZoom = 4,
		onSearchChange,
		onZoomIn,
		onZoomOut,
		onResetZoom,
		onFitToScreen,
		onToggleLabels,
		onToggleLinks,
		onToggleAnimations,
		onClearSearch,
		class: className = ''
	}: Props = $props();

	let searchInput: HTMLInputElement | null = $state(null);

	const zoomPercentage = $derived(Math.round(zoomLevel * 100));
	const canZoomIn = $derived(zoomLevel < maxZoom);
	const canZoomOut = $derived(zoomLevel > minZoom);

	function handleSearchInput(event: Event) {
		const target = event.target as HTMLInputElement;
		onSearchChange?.(target.value);
	}

	function handleClearSearch() {
		if (searchInput) {
			searchInput.value = '';
		}
		onClearSearch?.();
		onSearchChange?.('');
	}

	function handleSearchKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleClearSearch();
		}
	}
</script>

<div class={cn('graph-controls bg-white rounded-lg border border-gray-200 shadow-sm', className)}>
	<!-- Search Section -->
	<div class="search-section p-3 border-b border-gray-100">
		<label for="graph-search" class="sr-only">Search nodes</label>
		<div class="relative">
			<svg
				class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
			<input
				bind:this={searchInput}
				id="graph-search"
				type="text"
				class="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
				placeholder={searchPlaceholder}
				value={searchQuery}
				oninput={handleSearchInput}
				onkeydown={handleSearchKeyDown}
				aria-label="Search nodes in graph"
			/>
			{#if searchQuery}
				<button
					class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
					onclick={handleClearSearch}
					aria-label="Clear search"
				>
					<svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			{/if}
		</div>
		{#if searchQuery}
			<p class="text-xs text-gray-500 mt-1">
				Matching nodes are highlighted
			</p>
		{/if}
	</div>

	<!-- Zoom Controls -->
	{#if showZoomControls}
		<div class="zoom-section p-3 border-b border-gray-100">
			<div class="flex items-center justify-between mb-2">
				<span class="text-xs font-medium text-gray-600">Zoom</span>
				<span class="text-xs text-gray-500">{zoomPercentage}%</span>
			</div>
			<div class="flex items-center gap-1">
				<button
					class="zoom-btn flex-1 flex items-center justify-center p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
					onclick={() => onZoomOut?.()}
					disabled={!canZoomOut}
					aria-label="Zoom out"
					title="Zoom out"
				>
					<svg class="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
					</svg>
				</button>

				<button
					class="zoom-btn flex-1 flex items-center justify-center p-2 rounded hover:bg-gray-100"
					onclick={() => onResetZoom?.()}
					aria-label="Reset zoom"
					title="Reset zoom to 100%"
				>
					<span class="text-xs font-medium text-gray-600">1:1</span>
				</button>

				<button
					class="zoom-btn flex-1 flex items-center justify-center p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
					onclick={() => onZoomIn?.()}
					disabled={!canZoomIn}
					aria-label="Zoom in"
					title="Zoom in"
				>
					<svg class="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
				</button>

				<button
					class="zoom-btn flex-1 flex items-center justify-center p-2 rounded hover:bg-gray-100"
					onclick={() => onFitToScreen?.()}
					aria-label="Fit graph to screen"
					title="Fit to screen"
				>
					<svg class="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
					</svg>
				</button>
			</div>
		</div>
	{/if}

	<!-- Display Options -->
	{#if showDisplayOptions}
		<div class="display-section p-3">
			<span class="text-xs font-medium text-gray-600 block mb-2">Display</span>
			<div class="space-y-2">
				<!-- Show Labels Toggle -->
				<label class="flex items-center justify-between cursor-pointer group">
					<span class="text-sm text-gray-700 group-hover:text-gray-900">Labels</span>
					<button
						role="switch"
						aria-checked={showLabels}
						class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
						class:bg-blue-500={showLabels}
						class:bg-gray-200={!showLabels}
						onclick={() => onToggleLabels?.()}
					>
						<span
							class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
							class:translate-x-4={showLabels}
							class:translate-x-0.5={!showLabels}
						></span>
					</button>
				</label>

				<!-- Show Links Toggle -->
				<label class="flex items-center justify-between cursor-pointer group">
					<span class="text-sm text-gray-700 group-hover:text-gray-900">Links</span>
					<button
						role="switch"
						aria-checked={showLinks}
						class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
						class:bg-blue-500={showLinks}
						class:bg-gray-200={!showLinks}
						onclick={() => onToggleLinks?.()}
					>
						<span
							class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
							class:translate-x-4={showLinks}
							class:translate-x-0.5={!showLinks}
						></span>
					</button>
				</label>

				<!-- Animations Toggle -->
				<label class="flex items-center justify-between cursor-pointer group">
					<span class="text-sm text-gray-700 group-hover:text-gray-900">Animations</span>
					<button
						role="switch"
						aria-checked={animationsEnabled}
						class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
						class:bg-blue-500={animationsEnabled}
						class:bg-gray-200={!animationsEnabled}
						onclick={() => onToggleAnimations?.()}
					>
						<span
							class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
							class:translate-x-4={animationsEnabled}
							class:translate-x-0.5={!animationsEnabled}
						></span>
					</button>
				</label>
			</div>
		</div>
	{/if}
</div>

<style>
	.graph-controls {
		min-width: 200px;
		max-width: 280px;
	}

	.zoom-btn {
		border: 1px solid #e5e7eb;
	}

	.zoom-btn:hover:not(:disabled) {
		border-color: #d1d5db;
	}

	.zoom-btn:focus {
		outline: 2px solid #3b82f6;
		outline-offset: -2px;
	}
</style>
