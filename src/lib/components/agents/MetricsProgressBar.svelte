<script lang="ts">
	/**
	 * Metrics Progress Bar Component
	 * GAP-3.3.4: Agent Success Metrics
	 *
	 * Circular or linear progress bar for success rate display.
	 */
	import { cn } from '$lib/utils';

	interface Props {
		value: number;
		max?: number;
		size?: 'sm' | 'md' | 'lg';
		showLabel?: boolean;
		variant?: 'linear' | 'circular';
		class?: string;
	}

	let {
		value,
		max = 100,
		size = 'md',
		showLabel = true,
		variant = 'linear',
		class: className = ''
	}: Props = $props();

	// Calculate percentage
	const percentage = $derived(Math.min(Math.max((value / max) * 100, 0), 100));

	// Get color based on percentage
	const progressColor = $derived(() => {
		if (percentage < 60) return { stroke: '#ef4444', bg: '#fef2f2', text: 'text-red-600' }; // red
		if (percentage < 80) return { stroke: '#eab308', bg: '#fefce8', text: 'text-yellow-600' }; // yellow
		return { stroke: '#22c55e', bg: '#f0fdf4', text: 'text-green-600' }; // green
	});

	// Size configurations
	const sizeConfig = $derived(() => {
		switch (size) {
			case 'sm':
				return { height: 'h-1.5', circular: 24, strokeWidth: 3, textSize: 'text-xs' };
			case 'lg':
				return { height: 'h-3', circular: 48, strokeWidth: 4, textSize: 'text-lg' };
			default:
				return { height: 'h-2', circular: 36, strokeWidth: 3.5, textSize: 'text-sm' };
		}
	});

	// Circular progress calculations
	const circularConfig = $derived(() => {
		const config = sizeConfig();
		const radius = (config.circular - config.strokeWidth) / 2;
		const circumference = 2 * Math.PI * radius;
		const offset = circumference - (percentage / 100) * circumference;
		return { radius, circumference, offset, size: config.circular };
	});
</script>

{#if variant === 'circular'}
	<div class={cn('relative inline-flex items-center justify-center', className)}>
		<svg
			width={circularConfig().size}
			height={circularConfig().size}
			class="transform -rotate-90"
			role="progressbar"
			aria-valuenow={value}
			aria-valuemin={0}
			aria-valuemax={max}
		>
			<!-- Background circle -->
			<circle
				cx={circularConfig().size / 2}
				cy={circularConfig().size / 2}
				r={circularConfig().radius}
				fill="none"
				stroke="#e5e7eb"
				stroke-width={sizeConfig().strokeWidth}
			/>
			<!-- Progress circle -->
			<circle
				cx={circularConfig().size / 2}
				cy={circularConfig().size / 2}
				r={circularConfig().radius}
				fill="none"
				stroke={progressColor().stroke}
				stroke-width={sizeConfig().strokeWidth}
				stroke-linecap="round"
				stroke-dasharray={circularConfig().circumference}
				stroke-dashoffset={circularConfig().offset}
				class="transition-all duration-300 ease-out"
			/>
		</svg>
		{#if showLabel}
			<span
				class={cn(
					'absolute font-semibold',
					progressColor().text,
					size === 'sm' ? 'text-[8px]' : size === 'lg' ? 'text-sm' : 'text-[10px]'
				)}
			>
				{Math.round(percentage)}%
			</span>
		{/if}
	</div>
{:else}
	<!-- Linear progress bar -->
	<div class={cn('w-full', className)}>
		{#if showLabel}
			<div class="flex justify-between items-center mb-1">
				<span class={cn('font-medium', progressColor().text, sizeConfig().textSize)}>
					{Math.round(percentage)}%
				</span>
			</div>
		{/if}
		<div
			class={cn('w-full rounded-full overflow-hidden bg-gray-200', sizeConfig().height)}
			role="progressbar"
			aria-valuenow={value}
			aria-valuemin={0}
			aria-valuemax={max}
		>
			<div
				class={cn('h-full rounded-full transition-all duration-300 ease-out')}
				style="width: {percentage}%; background-color: {progressColor().stroke}"
			></div>
		</div>
	</div>
{/if}
