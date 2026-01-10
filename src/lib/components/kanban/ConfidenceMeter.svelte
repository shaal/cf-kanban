<script lang="ts">
	/**
	 * Confidence Meter Component
	 * GAP-UX.1: KanbanCard AI Status Indicators
	 *
	 * Displays AI confidence level as a percentage with visual meter.
	 * Colors range from red (low) to green (high) confidence.
	 */
	import { cn } from '$lib/utils';

	interface Props {
		/** Confidence value from 0 to 100 */
		confidence: number;
		/** Display variant */
		variant?: 'bar' | 'badge' | 'compact';
		/** Size of the component */
		size?: 'xs' | 'sm' | 'md';
		/** Whether to show the percentage label */
		showLabel?: boolean;
		/** Additional CSS classes */
		class?: string;
	}

	let {
		confidence,
		variant = 'bar',
		size = 'sm',
		showLabel = true,
		class: className = ''
	}: Props = $props();

	// Clamp confidence to 0-100
	const clampedConfidence = $derived(Math.max(0, Math.min(100, confidence)));

	// Get color based on confidence level
	const getColor = (value: number): string => {
		if (value >= 80) return 'bg-green-500';
		if (value >= 60) return 'bg-emerald-500';
		if (value >= 40) return 'bg-amber-500';
		if (value >= 20) return 'bg-orange-500';
		return 'bg-red-500';
	};

	const getTextColor = (value: number): string => {
		if (value >= 80) return 'text-green-700';
		if (value >= 60) return 'text-emerald-700';
		if (value >= 40) return 'text-amber-700';
		if (value >= 20) return 'text-orange-700';
		return 'text-red-700';
	};

	const getBgColor = (value: number): string => {
		if (value >= 80) return 'bg-green-100';
		if (value >= 60) return 'bg-emerald-100';
		if (value >= 40) return 'bg-amber-100';
		if (value >= 20) return 'bg-orange-100';
		return 'bg-red-100';
	};

	const color = $derived(getColor(clampedConfidence));
	const textColor = $derived(getTextColor(clampedConfidence));
	const bgColor = $derived(getBgColor(clampedConfidence));

	// Size configurations
	const sizeConfig = {
		xs: {
			bar: 'h-1',
			barWidth: 'w-12',
			badge: 'px-1 py-0.5 text-[9px]',
			text: 'text-[9px]',
			compact: 'text-[10px] gap-0.5'
		},
		sm: {
			bar: 'h-1.5',
			barWidth: 'w-16',
			badge: 'px-1.5 py-0.5 text-[10px]',
			text: 'text-[10px]',
			compact: 'text-xs gap-1'
		},
		md: {
			bar: 'h-2',
			barWidth: 'w-20',
			badge: 'px-2 py-1 text-xs',
			text: 'text-xs',
			compact: 'text-sm gap-1'
		}
	};

	const sizes = $derived(sizeConfig[size]);
</script>

{#if variant === 'bar'}
	<div
		class={cn('flex items-center gap-1.5', className)}
		role="meter"
		aria-valuenow={clampedConfidence}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-label="Confidence: {clampedConfidence}%"
	>
		<!-- Progress bar container -->
		<div class={cn('rounded-full bg-gray-200 overflow-hidden', sizes.bar, sizes.barWidth)}>
			<div
				class={cn('h-full rounded-full transition-all duration-300', color)}
				style="width: {clampedConfidence}%"
			></div>
		</div>

		<!-- Percentage label -->
		{#if showLabel}
			<span class={cn('font-medium tabular-nums', textColor, sizes.text)}>
				{clampedConfidence}%
			</span>
		{/if}
	</div>
{:else if variant === 'badge'}
	<div
		class={cn('inline-flex items-center rounded-full font-medium', bgColor, sizes.badge, className)}
		role="meter"
		aria-valuenow={clampedConfidence}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-label="Confidence: {clampedConfidence}%"
	>
		<span class={textColor}>{clampedConfidence}%</span>
	</div>
{:else}
	<!-- Compact variant - just the number with a dot indicator -->
	<div
		class={cn('inline-flex items-center', sizes.compact, className)}
		role="meter"
		aria-valuenow={clampedConfidence}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-label="Confidence: {clampedConfidence}%"
	>
		<div class={cn('w-1.5 h-1.5 rounded-full', color)}></div>
		{#if showLabel}
			<span class={cn('font-medium tabular-nums', textColor)}>{clampedConfidence}%</span>
		{/if}
	</div>
{/if}
