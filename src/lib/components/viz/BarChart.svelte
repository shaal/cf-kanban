<script lang="ts">
	/**
	 * Bar Chart Component
	 *
	 * TASK-067: Create Base Chart Components
	 *
	 * A reusable bar chart component using D3.js.
	 */
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import { cn } from '$lib/utils';
	import type { BarDataItem } from './types';
	import { DEFAULT_COLORS } from './types';

	interface Props {
		class?: string;
		data?: BarDataItem[];
		width?: number;
		height?: number;
		marginTop?: number;
		marginRight?: number;
		marginBottom?: number;
		marginLeft?: number;
		horizontal?: boolean;
		showValues?: boolean;
		showGrid?: boolean;
		animate?: boolean;
		barPadding?: number;
		ariaLabel?: string;
	}

	let {
		class: className = '',
		data = [],
		width = 600,
		height = 400,
		marginTop = 20,
		marginRight = 20,
		marginBottom = 60,
		marginLeft = 50,
		horizontal = false,
		showValues = true,
		showGrid = true,
		animate = true,
		barPadding = 0.2,
		ariaLabel = 'Bar chart'
	}: Props = $props();

	let svgRef: SVGSVGElement | null = $state(null);
	let mounted = $state(false);

	// Computed dimensions
	const innerWidth = $derived(width - marginLeft - marginRight);
	const innerHeight = $derived(height - marginTop - marginBottom);

	// Create scales
	const xScale = $derived(() => {
		if (horizontal) {
			const maxValue = d3.max(data, d => d.value) ?? 0;
			return d3.scaleLinear()
				.domain([0, maxValue * 1.1])
				.range([0, innerWidth]);
		}
		return d3.scaleBand<string>()
			.domain(data.map(d => d.label))
			.range([0, innerWidth])
			.padding(barPadding);
	});

	const yScale = $derived(() => {
		if (horizontal) {
			return d3.scaleBand<string>()
				.domain(data.map(d => d.label))
				.range([0, innerHeight])
				.padding(barPadding);
		}
		const maxValue = d3.max(data, d => d.value) ?? 0;
		return d3.scaleLinear()
			.domain([0, maxValue * 1.1])
			.range([innerHeight, 0]);
	});

	onMount(() => {
		mounted = true;
	});

	function renderChart() {
		if (!svgRef || !mounted || data.length === 0) return;

		const svg = d3.select(svgRef);
		const g = svg.select('.chart-content');

		// Clear previous content
		g.selectAll('*').remove();

		// Add grid
		if (showGrid) {
			if (horizontal) {
				const xGrid = g.append('g')
					.attr('class', 'grid x-grid');

				xGrid.call(
					d3.axisBottom(xScale as d3.ScaleLinear<number, number>)
						.tickSize(innerHeight)
						.tickFormat(() => '')
				);
			} else {
				const yGrid = g.append('g')
					.attr('class', 'grid y-grid');

				yGrid.call(
					d3.axisLeft(yScale as d3.ScaleLinear<number, number>)
						.tickSize(-innerWidth)
						.tickFormat(() => '')
				);
			}
		}

		// Add axes
		if (horizontal) {
			const xAxis = g.append('g')
				.attr('class', 'axis x-axis')
				.attr('transform', `translate(0, ${innerHeight})`);

			xAxis.call(d3.axisBottom(xScale as d3.ScaleLinear<number, number>));

			const yAxis = g.append('g')
				.attr('class', 'axis y-axis');

			yAxis.call(d3.axisLeft(yScale as d3.ScaleBand<string>));
		} else {
			const xAxis = g.append('g')
				.attr('class', 'axis x-axis')
				.attr('transform', `translate(0, ${innerHeight})`);

			xAxis.call(d3.axisBottom(xScale as d3.ScaleBand<string>))
				.selectAll('text')
				.attr('transform', 'rotate(-45)')
				.style('text-anchor', 'end');

			const yAxis = g.append('g')
				.attr('class', 'axis y-axis');

			yAxis.call(d3.axisLeft(yScale as d3.ScaleLinear<number, number>));
		}

		// Add bars
		const bars = g.selectAll('.bar')
			.data(data)
			.enter()
			.append('rect')
			.attr('class', 'bar')
			.attr('fill', (d, i) => d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]);

		if (horizontal) {
			bars
				.attr('x', 0)
				.attr('y', d => (yScale as d3.ScaleBand<string>)(d.label) ?? 0)
				.attr('height', (yScale as d3.ScaleBand<string>).bandwidth())
				.attr('width', animate ? 0 : d => (xScale as d3.ScaleLinear<number, number>)(d.value));

			if (animate) {
				bars.transition()
					.duration(750)
					.delay((_, i) => i * 50)
					.attr('width', d => (xScale as d3.ScaleLinear<number, number>)(d.value));
			}
		} else {
			bars
				.attr('x', d => (xScale as d3.ScaleBand<string>)(d.label) ?? 0)
				.attr('width', (xScale as d3.ScaleBand<string>).bandwidth())
				.attr('y', animate ? innerHeight : d => (yScale as d3.ScaleLinear<number, number>)(d.value))
				.attr('height', animate ? 0 : d => innerHeight - (yScale as d3.ScaleLinear<number, number>)(d.value));

			if (animate) {
				bars.transition()
					.duration(750)
					.delay((_, i) => i * 50)
					.attr('y', d => (yScale as d3.ScaleLinear<number, number>)(d.value))
					.attr('height', d => innerHeight - (yScale as d3.ScaleLinear<number, number>)(d.value));
			}
		}

		// Hover effects
		bars
			.on('mouseenter', function() {
				d3.select(this)
					.transition()
					.duration(100)
					.attr('opacity', 0.8);
			})
			.on('mouseleave', function() {
				d3.select(this)
					.transition()
					.duration(100)
					.attr('opacity', 1);
			});

		// Add value labels
		if (showValues) {
			const labels = g.selectAll('.bar-label')
				.data(data)
				.enter()
				.append('text')
				.attr('class', 'bar-label')
				.attr('fill', '#374151')
				.attr('font-size', '12px')
				.attr('text-anchor', 'middle')
				.text(d => d.value);

			if (horizontal) {
				labels
					.attr('x', d => (xScale as d3.ScaleLinear<number, number>)(d.value) + 5)
					.attr('y', d => ((yScale as d3.ScaleBand<string>)(d.label) ?? 0) + (yScale as d3.ScaleBand<string>).bandwidth() / 2)
					.attr('dy', '0.35em')
					.attr('text-anchor', 'start')
					.attr('opacity', animate ? 0 : 1);
			} else {
				labels
					.attr('x', d => ((xScale as d3.ScaleBand<string>)(d.label) ?? 0) + (xScale as d3.ScaleBand<string>).bandwidth() / 2)
					.attr('y', d => (yScale as d3.ScaleLinear<number, number>)(d.value) - 5)
					.attr('opacity', animate ? 0 : 1);
			}

			if (animate) {
				labels.transition()
					.delay(750)
					.duration(200)
					.attr('opacity', 1);
			}
		}
	}

	$effect(() => {
		if (browser && mounted && data.length > 0) {
			renderChart();
		}
	});
</script>

<div class={cn('bar-chart', className)}>
	{#if browser}
		<svg
			bind:this={svgRef}
			{width}
			{height}
			role="img"
			aria-label={ariaLabel}
		>
			<g class="chart-content" transform="translate({marginLeft}, {marginTop})">
				<!-- Content rendered by D3 -->
			</g>
		</svg>
	{:else}
		<div
			class="chart-placeholder bg-gray-100 animate-pulse rounded"
			style="width: {width}px; height: {height}px;"
		></div>
	{/if}
</div>

<style>
	.bar-chart :global(.grid line) {
		stroke: #e5e7eb;
		stroke-opacity: 0.7;
	}

	.bar-chart :global(.grid path) {
		stroke-width: 0;
	}

	.bar-chart :global(.axis path),
	.bar-chart :global(.axis line) {
		stroke: #9ca3af;
	}

	.bar-chart :global(.axis text) {
		fill: #6b7280;
		font-size: 12px;
	}

	.bar-chart :global(.bar) {
		cursor: pointer;
		transition: opacity 0.1s ease;
	}
</style>
