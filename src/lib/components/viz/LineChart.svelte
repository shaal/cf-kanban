<script lang="ts">
	/**
	 * Line Chart Component
	 *
	 * TASK-067: Create Base Chart Components
	 *
	 * A reusable line chart component using D3.js.
	 */
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import { cn } from '$lib/utils';
	import type { ChartDataPoint, ChartSeries } from './types';
	import { DEFAULT_COLORS } from './types';

	interface Props {
		class?: string;
		data?: ChartDataPoint[];
		series?: ChartSeries[];
		width?: number;
		height?: number;
		marginTop?: number;
		marginRight?: number;
		marginBottom?: number;
		marginLeft?: number;
		showGrid?: boolean;
		showDots?: boolean;
		curved?: boolean;
		animate?: boolean;
		ariaLabel?: string;
	}

	let {
		class: className = '',
		data = [],
		series = [],
		width = 600,
		height = 400,
		marginTop = 20,
		marginRight = 20,
		marginBottom = 40,
		marginLeft = 50,
		showGrid = true,
		showDots = true,
		curved = true,
		animate = true,
		ariaLabel = 'Line chart'
	}: Props = $props();

	let svgRef: SVGSVGElement | null = $state(null);
	let mounted = $state(false);

	// Computed dimensions
	const innerWidth = $derived(width - marginLeft - marginRight);
	const innerHeight = $derived(height - marginTop - marginBottom);

	// Normalize data - either single data array or multiple series
	const chartSeries = $derived<ChartSeries[]>(() => {
		if (series.length > 0) return series;
		if (data.length > 0) {
			return [{
				id: 'default',
				name: 'Data',
				color: DEFAULT_COLORS[0],
				data: data
			}];
		}
		return [];
	});

	// Calculate scales
	const xScale = $derived(() => {
		const allData = chartSeries.flatMap(s => s.data);
		const xExtent = d3.extent(allData, d => d.x as Date) as [Date, Date];
		return d3.scaleTime()
			.domain(xExtent)
			.range([0, innerWidth]);
	});

	const yScale = $derived(() => {
		const allData = chartSeries.flatMap(s => s.data);
		const yMax = d3.max(allData, d => d.y) ?? 0;
		return d3.scaleLinear()
			.domain([0, yMax * 1.1]) // Add 10% padding
			.range([innerHeight, 0]);
	});

	// Line generator
	const lineGenerator = $derived(() => {
		const generator = d3.line<ChartDataPoint>()
			.x(d => xScale(d.x as Date))
			.y(d => yScale(d.y));

		if (curved) {
			generator.curve(d3.curveMonotoneX);
		}
		return generator;
	});

	onMount(() => {
		mounted = true;
	});

	function renderChart() {
		if (!svgRef || !mounted) return;

		const svg = d3.select(svgRef);
		const g = svg.select('.chart-content');

		// Clear previous content
		g.selectAll('*').remove();

		// Add grid
		if (showGrid) {
			const xGrid = g.append('g')
				.attr('class', 'grid x-grid')
				.attr('transform', `translate(0, ${innerHeight})`);

			xGrid.call(
				d3.axisBottom(xScale)
					.tickSize(-innerHeight)
					.tickFormat(() => '')
			);

			const yGrid = g.append('g')
				.attr('class', 'grid y-grid');

			yGrid.call(
				d3.axisLeft(yScale)
					.tickSize(-innerWidth)
					.tickFormat(() => '')
			);
		}

		// Add axes
		const xAxis = g.append('g')
			.attr('class', 'axis x-axis')
			.attr('transform', `translate(0, ${innerHeight})`);

		xAxis.call(d3.axisBottom(xScale).tickFormat(d3.timeFormat('%b %d') as any));

		const yAxis = g.append('g')
			.attr('class', 'axis y-axis');

		yAxis.call(d3.axisLeft(yScale));

		// Add lines
		chartSeries.forEach((s, i) => {
			const path = g.append('path')
				.datum(s.data)
				.attr('class', 'line')
				.attr('fill', 'none')
				.attr('stroke', s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length])
				.attr('stroke-width', 2)
				.attr('d', lineGenerator);

			// Animate line drawing
			if (animate) {
				const totalLength = (path.node() as SVGPathElement)?.getTotalLength() ?? 0;
				path
					.attr('stroke-dasharray', `${totalLength} ${totalLength}`)
					.attr('stroke-dashoffset', totalLength)
					.transition()
					.duration(1000)
					.ease(d3.easeLinear)
					.attr('stroke-dashoffset', 0);
			}

			// Add dots
			if (showDots) {
				const dots = g.selectAll(`.dot-${i}`)
					.data(s.data)
					.enter()
					.append('circle')
					.attr('class', `dot dot-${i}`)
					.attr('cx', d => xScale(d.x as Date))
					.attr('cy', d => yScale(d.y))
					.attr('r', 0)
					.attr('fill', s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]);

				if (animate) {
					dots.transition()
						.delay((_, j) => j * 50)
						.duration(200)
						.attr('r', 4);
				} else {
					dots.attr('r', 4);
				}

				// Hover effect
				dots
					.on('mouseenter', function() {
						d3.select(this)
							.transition()
							.duration(100)
							.attr('r', 6);
					})
					.on('mouseleave', function() {
						d3.select(this)
							.transition()
							.duration(100)
							.attr('r', 4);
					});
			}
		});
	}

	$effect(() => {
		if (browser && mounted && chartSeries.length > 0) {
			renderChart();
		}
	});
</script>

<div class={cn('line-chart', className)}>
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
	.line-chart :global(.grid line) {
		stroke: #e5e7eb;
		stroke-opacity: 0.7;
	}

	.line-chart :global(.grid path) {
		stroke-width: 0;
	}

	.line-chart :global(.axis path),
	.line-chart :global(.axis line) {
		stroke: #9ca3af;
	}

	.line-chart :global(.axis text) {
		fill: #6b7280;
		font-size: 12px;
	}

	.line-chart :global(.dot) {
		cursor: pointer;
		transition: filter 0.1s ease;
	}

	.line-chart :global(.dot:hover) {
		filter: brightness(1.1);
	}
</style>
