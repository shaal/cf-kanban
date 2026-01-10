<script lang="ts">
	/**
	 * Area Chart Component
	 *
	 * TASK-067: Create Base Chart Components
	 *
	 * A reusable area chart component using D3.js with gradient fills.
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
		showLine?: boolean;
		curved?: boolean;
		stacked?: boolean;
		animate?: boolean;
		gradientOpacity?: number;
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
		showLine = true,
		curved = true,
		stacked = false,
		animate = true,
		gradientOpacity = 0.3,
		ariaLabel = 'Area chart'
	}: Props = $props();

	let svgRef: SVGSVGElement | null = $state(null);
	let mounted = $state(false);

	// Computed dimensions
	const innerWidth = $derived(width - marginLeft - marginRight);
	const innerHeight = $derived(height - marginTop - marginBottom);

	// Generate unique ID for gradients
	const chartId = $derived(`area-chart-${Math.random().toString(36).substr(2, 9)}`);

	// Normalize data
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
			.domain([0, yMax * 1.1])
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

	// Area generator
	const areaGenerator = $derived(() => {
		const generator = d3.area<ChartDataPoint>()
			.x(d => xScale(d.x as Date))
			.y0(innerHeight)
			.y1(d => yScale(d.y));

		if (curved) {
			generator.curve(d3.curveMonotoneX);
		}
		return generator;
	});

	onMount(() => {
		mounted = true;
	});

	function renderChart() {
		if (!svgRef || !mounted || chartSeries.length === 0) return;

		const svg = d3.select(svgRef);
		const defs = svg.select('defs');
		const g = svg.select('.chart-content');

		// Clear previous content
		defs.selectAll('*').remove();
		g.selectAll('*').remove();

		// Create gradients
		chartSeries.forEach((s, i) => {
			const color = s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
			const gradient = defs.append('linearGradient')
				.attr('id', `${chartId}-gradient-${i}`)
				.attr('x1', '0%')
				.attr('y1', '0%')
				.attr('x2', '0%')
				.attr('y2', '100%');

			gradient.append('stop')
				.attr('offset', '0%')
				.attr('stop-color', color)
				.attr('stop-opacity', gradientOpacity);

			gradient.append('stop')
				.attr('offset', '100%')
				.attr('stop-color', color)
				.attr('stop-opacity', 0.05);
		});

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

		// Add areas and lines
		chartSeries.forEach((s, i) => {
			const color = s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];

			// Add area
			const area = g.append('path')
				.datum(s.data)
				.attr('class', 'area')
				.attr('fill', `url(#${chartId}-gradient-${i})`)
				.attr('d', areaGenerator);

			// Animate area appearance
			if (animate) {
				area
					.attr('opacity', 0)
					.transition()
					.duration(750)
					.attr('opacity', 1);
			}

			// Add line
			if (showLine) {
				const line = g.append('path')
					.datum(s.data)
					.attr('class', 'line')
					.attr('fill', 'none')
					.attr('stroke', color)
					.attr('stroke-width', 2)
					.attr('d', lineGenerator);

				// Animate line drawing
				if (animate) {
					const totalLength = (line.node() as SVGPathElement)?.getTotalLength() ?? 0;
					line
						.attr('stroke-dasharray', `${totalLength} ${totalLength}`)
						.attr('stroke-dashoffset', totalLength)
						.transition()
						.duration(1000)
						.ease(d3.easeLinear)
						.attr('stroke-dashoffset', 0);
				}
			}
		});
	}

	$effect(() => {
		if (browser && mounted && chartSeries.length > 0) {
			renderChart();
		}
	});
</script>

<div class={cn('area-chart', className)}>
	{#if browser}
		<svg
			bind:this={svgRef}
			{width}
			{height}
			role="img"
			aria-label={ariaLabel}
		>
			<defs></defs>
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
	.area-chart :global(.grid line) {
		stroke: #e5e7eb;
		stroke-opacity: 0.7;
	}

	.area-chart :global(.grid path) {
		stroke-width: 0;
	}

	.area-chart :global(.axis path),
	.area-chart :global(.axis line) {
		stroke: #9ca3af;
	}

	.area-chart :global(.axis text) {
		fill: #6b7280;
		font-size: 12px;
	}

	.area-chart :global(.area) {
		transition: opacity 0.2s ease;
	}

	.area-chart :global(.line) {
		pointer-events: none;
	}
</style>
