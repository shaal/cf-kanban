<script lang="ts">
	/**
	 * Metrics Trend Badge Component
	 * GAP-3.3.4: Agent Success Metrics
	 *
	 * Badge showing trend direction with appropriate color coding.
	 */
	import { cn } from '$lib/utils';
	import * as Icons from 'lucide-svelte';
	import type { MetricsTrend } from '$lib/types/agents';
	import { getTrendColor, getTrendIcon } from '$lib/types/agents';

	interface Props {
		trend: MetricsTrend;
		metric: 'success' | 'time';
		size?: 'sm' | 'md';
		class?: string;
	}

	let { trend, metric, size = 'sm', class: className = '' }: Props = $props();

	// Get the appropriate icon component
	const iconName = $derived(getTrendIcon(trend));
	const colorClass = $derived(getTrendColor(trend, metric));

	// Size classes
	const sizeClasses = $derived(
		size === 'sm'
			? 'px-1.5 py-0.5 text-xs gap-0.5'
			: 'px-2 py-1 text-sm gap-1'
	);

	const iconSize = $derived(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4');

	// Background color based on trend
	const bgClass = $derived(() => {
		if (trend === 'stable') return 'bg-gray-100';
		// For success rate, improving is green, declining is red
		// For time, improving (faster) is green, declining (slower) is red
		return trend === 'improving' ? 'bg-green-50' : 'bg-red-50';
	});

	// Label text
	const label = $derived(() => {
		switch (trend) {
			case 'improving':
				return metric === 'time' ? 'Faster' : 'Improving';
			case 'declining':
				return metric === 'time' ? 'Slower' : 'Declining';
			default:
				return 'Stable';
		}
	});
</script>

<span
	class={cn(
		'inline-flex items-center rounded-full font-medium',
		sizeClasses,
		bgClass(),
		colorClass,
		className
	)}
>
	{#if iconName === 'TrendingUp'}
		<Icons.TrendingUp class={iconSize} />
	{:else if iconName === 'TrendingDown'}
		<Icons.TrendingDown class={iconSize} />
	{:else}
		<Icons.Minus class={iconSize} />
	{/if}
	<span>{label()}</span>
</span>
