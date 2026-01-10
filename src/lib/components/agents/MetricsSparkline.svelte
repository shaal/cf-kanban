<script lang="ts">
	/**
	 * Metrics Sparkline Component
	 * GAP-3.3.4: Agent Success Metrics
	 *
	 * A compact sparkline chart for inline display of metric trends.
	 */
	import { cn } from '$lib/utils';
	import * as Icons from 'lucide-svelte';

	interface DataPoint {
		value: number;
		timestamp: Date;
	}

	interface Props {
		data: DataPoint[];
		width?: number;
		height?: number;
		color?: string;
		showTrend?: boolean;
		class?: string;
	}

	let {
		data,
		width = 60,
		height = 20,
		color = '#3b82f6',
		showTrend = false,
		class: className = ''
	}: Props = $props();

	// Calculate trend from data points
	const trend = $derived(() => {
		if (data.length < 2) return 'stable';
		const midpoint = Math.floor(data.length / 2);
		const recentAvg = data.slice(midpoint).reduce((sum, p) => sum + p.value, 0) / (data.length - midpoint);
		const olderAvg = data.slice(0, midpoint).reduce((sum, p) => sum + p.value, 0) / midpoint;
		const threshold = 0.05;
		const change = olderAvg !== 0 ? (recentAvg - olderAvg) / olderAvg : 0;
		if (Math.abs(change) < threshold) return 'stable';
		return change > 0 ? 'up' : 'down';
	});

	// Calculate SVG path points
	const pathPoints = $derived(() => {
		if (data.length === 0) return '';

		const padding = 2;
		const usableWidth = width - padding * 2;
		const usableHeight = height - padding * 2;

		const values = data.map((d) => d.value);
		const minVal = Math.min(...values);
		const maxVal = Math.max(...values);
		const range = maxVal - minVal || 1;

		const points = data.map((d, i) => {
			const x = padding + (i / Math.max(data.length - 1, 1)) * usableWidth;
			const y = padding + usableHeight - ((d.value - minVal) / range) * usableHeight;
			return `${x},${y}`;
		});

		return points.join(' ');
	});

	// Get trend color
	const trendColor = $derived(
		trend() === 'up' ? 'text-green-500' : trend() === 'down' ? 'text-red-500' : 'text-gray-400'
	);
</script>

<div class={cn('inline-flex items-center gap-1', className)}>
	<svg
		{width}
		{height}
		class="overflow-visible"
		role="img"
		aria-label="Sparkline chart showing metric trend"
	>
		{#if data.length > 1}
			<polyline
				points={pathPoints()}
				fill="none"
				stroke={color}
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		{:else if data.length === 1}
			<!-- Single point: show as a dot -->
			<circle cx={width / 2} cy={height / 2} r="2" fill={color} />
		{:else}
			<!-- No data: show placeholder line -->
			<line x1="2" y1={height / 2} x2={width - 2} y2={height / 2} stroke="#e5e7eb" stroke-width="1" stroke-dasharray="2,2" />
		{/if}
	</svg>

	{#if showTrend && data.length >= 2}
		<span class={cn('flex-shrink-0', trendColor)}>
			{#if trend() === 'up'}
				<Icons.TrendingUp class="w-3 h-3" />
			{:else if trend() === 'down'}
				<Icons.TrendingDown class="w-3 h-3" />
			{:else}
				<Icons.Minus class="w-3 h-3" />
			{/if}
		</span>
	{/if}
</div>
