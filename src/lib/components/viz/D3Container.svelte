<script lang="ts">
	/**
	 * D3 Container Component
	 *
	 * TASK-066: Set Up D3.js in SvelteKit
	 *
	 * A wrapper component for D3 visualizations that handles:
	 * - SSR (client-only rendering with browser check)
	 * - Responsive container with ResizeObserver
	 * - Proper margins and dimensions
	 */
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import { cn } from '$lib/utils';

	interface Props {
		class?: string;
		width?: number;
		height?: number;
		marginTop?: number;
		marginRight?: number;
		marginBottom?: number;
		marginLeft?: number;
		responsive?: boolean;
		ariaLabel?: string;
		children?: import('svelte').Snippet<[{ width: number; height: number; innerWidth: number; innerHeight: number }]>;
	}

	let {
		class: className = '',
		width = 600,
		height = 400,
		marginTop = 20,
		marginRight = 20,
		marginBottom = 30,
		marginLeft = 40,
		responsive = false,
		ariaLabel = 'D3 visualization',
		children
	}: Props = $props();

	let containerEl: HTMLDivElement | null = $state(null);
	let containerWidth = $state(600);
	let containerHeight = $state(400);
	let resizeObserver: ResizeObserver | null = null;

	// Sync container dimensions with props when not responsive
	$effect(() => {
		if (!responsive) {
			containerWidth = width;
			containerHeight = height;
		}
	});

	// Computed inner dimensions (accounting for margins)
	const innerWidth = $derived(containerWidth - marginLeft - marginRight);
	const innerHeight = $derived(containerHeight - marginTop - marginBottom);

	onMount(() => {
		if (browser && responsive && containerEl) {
			resizeObserver = new ResizeObserver((entries) => {
				for (const entry of entries) {
					const { width: w, height: h } = entry.contentRect;
					if (w > 0) containerWidth = w;
					if (h > 0) containerHeight = h;
				}
			});
			resizeObserver.observe(containerEl);
		}
	});

	onDestroy(() => {
		if (resizeObserver) {
			resizeObserver.disconnect();
			resizeObserver = null;
		}
	});
</script>

<div
	bind:this={containerEl}
	class={cn(
		'd3-container relative',
		responsive && 'd3-container--responsive w-full h-full',
		className
	)}
>
	{#if browser}
		<svg
			width={containerWidth}
			height={containerHeight}
			role="img"
			aria-label={ariaLabel}
			class="d3-svg"
		>
			<g transform="translate({marginLeft}, {marginTop})">
				{#if children}
					{@render children({
						width: containerWidth,
						height: containerHeight,
						innerWidth,
						innerHeight
					})}
				{/if}
			</g>
		</svg>
	{:else}
		<!-- SSR placeholder -->
		<div
			class="d3-placeholder bg-gray-100 animate-pulse rounded"
			style="width: {width}px; height: {height}px;"
		></div>
	{/if}
</div>

<style>
	.d3-container--responsive {
		min-height: 200px;
	}

	.d3-svg {
		display: block;
	}
</style>
