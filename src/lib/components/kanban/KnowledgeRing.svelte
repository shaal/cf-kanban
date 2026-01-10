<script lang="ts">
	/**
	 * Knowledge Ring Component
	 * GAP-UX.1: KanbanCard AI Status Indicators
	 *
	 * Circular progress ring showing pattern familiarity / knowledge level.
	 * Uses SVG for smooth circular progress visualization.
	 */
	import { cn } from '$lib/utils';

	interface Props {
		/** Knowledge/familiarity value from 0 to 100 */
		knowledge: number;
		/** Size of the ring */
		size?: 'xs' | 'sm' | 'md' | 'lg';
		/** Ring thickness */
		thickness?: 'thin' | 'normal' | 'thick';
		/** Whether to show the center value */
		showValue?: boolean;
		/** Whether to animate on mount */
		animate?: boolean;
		/** Additional CSS classes */
		class?: string;
	}

	let {
		knowledge,
		size = 'sm',
		thickness = 'normal',
		showValue = false,
		animate = true,
		class: className = ''
	}: Props = $props();

	// Clamp knowledge to 0-100
	const clampedKnowledge = $derived(Math.max(0, Math.min(100, knowledge)));

	// Size configurations (in pixels)
	const sizeConfig = {
		xs: { dimension: 16, fontSize: 6, labelSize: 'text-[6px]' },
		sm: { dimension: 24, fontSize: 8, labelSize: 'text-[8px]' },
		md: { dimension: 32, fontSize: 10, labelSize: 'text-[10px]' },
		lg: { dimension: 48, fontSize: 14, labelSize: 'text-xs' }
	};

	// Thickness configurations (stroke width as percentage of dimension)
	const thicknessConfig = {
		thin: 0.1,
		normal: 0.15,
		thick: 0.2
	};

	const dimensions = $derived(sizeConfig[size]);
	const strokeWidth = $derived(dimensions.dimension * thicknessConfig[thickness]);
	const radius = $derived((dimensions.dimension - strokeWidth) / 2);
	const circumference = $derived(2 * Math.PI * radius);
	const offset = $derived(circumference - (clampedKnowledge / 100) * circumference);

	// Get gradient colors based on knowledge level
	const getGradientId = (value: number): string => {
		if (value >= 80) return 'knowledge-high';
		if (value >= 60) return 'knowledge-good';
		if (value >= 40) return 'knowledge-medium';
		if (value >= 20) return 'knowledge-low';
		return 'knowledge-minimal';
	};

	const gradientId = $derived(getGradientId(clampedKnowledge));

	// Solid color fallback
	const getColor = (value: number): string => {
		if (value >= 80) return '#8b5cf6'; // violet-500
		if (value >= 60) return '#3b82f6'; // blue-500
		if (value >= 40) return '#10b981'; // emerald-500
		if (value >= 20) return '#f59e0b'; // amber-500
		return '#ef4444'; // red-500
	};

	const color = $derived(getColor(clampedKnowledge));
</script>

<div
	class={cn('inline-flex items-center justify-center relative', className)}
	role="meter"
	aria-valuenow={clampedKnowledge}
	aria-valuemin={0}
	aria-valuemax={100}
	aria-label="Knowledge: {clampedKnowledge}%"
	title="Pattern familiarity: {clampedKnowledge}%"
>
	<svg
		width={dimensions.dimension}
		height={dimensions.dimension}
		viewBox="0 0 {dimensions.dimension} {dimensions.dimension}"
		class={animate ? 'transition-all duration-500' : ''}
	>
		<!-- Gradient definitions -->
		<defs>
			<linearGradient id="knowledge-high" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="#8b5cf6" />
				<stop offset="100%" stop-color="#a78bfa" />
			</linearGradient>
			<linearGradient id="knowledge-good" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="#3b82f6" />
				<stop offset="100%" stop-color="#60a5fa" />
			</linearGradient>
			<linearGradient id="knowledge-medium" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="#10b981" />
				<stop offset="100%" stop-color="#34d399" />
			</linearGradient>
			<linearGradient id="knowledge-low" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="#f59e0b" />
				<stop offset="100%" stop-color="#fbbf24" />
			</linearGradient>
			<linearGradient id="knowledge-minimal" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="#ef4444" />
				<stop offset="100%" stop-color="#f87171" />
			</linearGradient>
		</defs>

		<!-- Background ring -->
		<circle
			cx={dimensions.dimension / 2}
			cy={dimensions.dimension / 2}
			r={radius}
			fill="none"
			stroke="#e5e7eb"
			stroke-width={strokeWidth}
		/>

		<!-- Progress ring -->
		<circle
			cx={dimensions.dimension / 2}
			cy={dimensions.dimension / 2}
			r={radius}
			fill="none"
			stroke="url(#{gradientId})"
			stroke-width={strokeWidth}
			stroke-linecap="round"
			stroke-dasharray={circumference}
			stroke-dashoffset={offset}
			transform="rotate(-90 {dimensions.dimension / 2} {dimensions.dimension / 2})"
			class={animate ? 'transition-all duration-700 ease-out' : ''}
		/>

		<!-- Center value (optional) -->
		{#if showValue}
			<text
				x={dimensions.dimension / 2}
				y={dimensions.dimension / 2}
				text-anchor="middle"
				dominant-baseline="central"
				fill={color}
				font-size={dimensions.fontSize}
				font-weight="600"
				class="tabular-nums"
			>
				{clampedKnowledge}
			</text>
		{/if}
	</svg>
</div>
