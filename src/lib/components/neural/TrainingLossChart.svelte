<script lang="ts">
	/**
	 * TASK-077: Training Loss Chart Component
	 *
	 * Displays training loss and accuracy metrics over epochs.
	 * Uses SVG for lightweight charting without D3 dependency.
	 */
	import type { TrainingMetrics } from '$lib/types/neural';
	import { TrendingDown, TrendingUp } from 'lucide-svelte';

	interface Props {
		metrics: TrainingMetrics[];
		height?: number;
	}

	let { metrics, height = 200 }: Props = $props();

	// Chart dimensions
	const padding = { top: 20, right: 40, bottom: 30, left: 50 };
	const width = 500;

	// Calculate chart bounds
	const chartWidth = $derived(width - padding.left - padding.right);
	const chartHeight = $derived(height - padding.top - padding.bottom);

	// Scale functions
	function scaleX(epoch: number): number {
		if (metrics.length <= 1) return padding.left;
		const maxEpoch = Math.max(...metrics.map(m => m.epoch));
		return padding.left + (epoch / maxEpoch) * chartWidth;
	}

	function scaleY(value: number, max: number): number {
		return padding.top + chartHeight - (value / max) * chartHeight;
	}

	// Generate path data for loss line
	const lossPath = $derived(() => {
		if (metrics.length === 0) return '';
		const maxLoss = Math.max(...metrics.map(m => m.loss), 1);
		return metrics
			.map((m, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(m.epoch)} ${scaleY(m.loss, maxLoss)}`)
			.join(' ');
	});

	// Generate path data for accuracy line
	const accuracyPath = $derived(() => {
		if (metrics.length === 0) return '';
		return metrics
			.map((m, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(m.epoch)} ${scaleY(m.accuracy, 1)}`)
			.join(' ');
	});

	// Latest values
	const latestMetrics = $derived(metrics.length > 0 ? metrics[metrics.length - 1] : null);
	const previousMetrics = $derived(metrics.length > 1 ? metrics[metrics.length - 2] : null);

	// Improvement indicators
	const lossImproving = $derived(
		latestMetrics && previousMetrics ? latestMetrics.loss < previousMetrics.loss : false
	);
	const accuracyImproving = $derived(
		latestMetrics && previousMetrics ? latestMetrics.accuracy > previousMetrics.accuracy : false
	);

	// Y-axis labels for loss
	const lossAxisLabels = $derived(() => {
		if (metrics.length === 0) return [0, 0.5, 1];
		const maxLoss = Math.max(...metrics.map(m => m.loss), 1);
		return [0, maxLoss / 2, maxLoss];
	});
</script>

<div data-testid="training-loss-chart">
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-semibold text-gray-900">Training Loss & Accuracy</h3>
		{#if latestMetrics}
			<div class="flex items-center gap-4 text-sm">
				<div class="flex items-center gap-1" data-testid="improvement-indicator">
					{#if lossImproving}
						<TrendingDown class="w-4 h-4 text-green-500" />
					{:else}
						<TrendingUp class="w-4 h-4 text-red-500" />
					{/if}
					<span class="text-gray-600">Loss:</span>
					<span class="font-medium text-rose-600">{latestMetrics.loss.toFixed(3)}</span>
				</div>
				<div class="flex items-center gap-1">
					{#if accuracyImproving}
						<TrendingUp class="w-4 h-4 text-green-500" />
					{:else}
						<TrendingDown class="w-4 h-4 text-red-500" />
					{/if}
					<span class="text-gray-600">Accuracy:</span>
					<span class="font-medium text-blue-600">{(latestMetrics.accuracy * 100).toFixed(1)}%</span>
				</div>
			</div>
		{/if}
	</div>

	{#if metrics.length === 0}
		<div class="flex items-center justify-center h-48 bg-gray-50 rounded-lg border border-dashed border-gray-300">
			<p class="text-gray-500">No training data available</p>
		</div>
	{:else}
		<div class="relative">
			<svg
				viewBox="0 0 {width} {height}"
				class="w-full"
				style="max-height: {height}px"
			>
				<!-- Grid lines -->
				{#each [0, 0.25, 0.5, 0.75, 1] as tick}
					<line
						x1={padding.left}
						y1={padding.top + tick * chartHeight}
						x2={padding.left + chartWidth}
						y2={padding.top + tick * chartHeight}
						stroke="#e5e7eb"
						stroke-dasharray="4,4"
					/>
				{/each}

				<!-- Y-axis labels (Loss - left) -->
				{#each lossAxisLabels() as label, i}
					<text
						x={padding.left - 8}
						y={scaleY(label, Math.max(...metrics.map(m => m.loss), 1))}
						text-anchor="end"
						dominant-baseline="middle"
						class="text-xs fill-gray-500"
					>
						{label.toFixed(2)}
					</text>
				{/each}

				<!-- Y-axis labels (Accuracy - right) -->
				{#each [0, 0.5, 1] as label}
					<text
						x={padding.left + chartWidth + 8}
						y={scaleY(label, 1)}
						text-anchor="start"
						dominant-baseline="middle"
						class="text-xs fill-gray-500"
					>
						{(label * 100).toFixed(0)}%
					</text>
				{/each}

				<!-- X-axis labels -->
				{#each metrics.filter((_, i) => i % Math.ceil(metrics.length / 5) === 0 || i === metrics.length - 1) as m}
					<text
						x={scaleX(m.epoch)}
						y={height - 8}
						text-anchor="middle"
						class="text-xs fill-gray-500"
					>
						{m.epoch}
					</text>
				{/each}

				<!-- Loss line -->
				<path
					d={lossPath()}
					fill="none"
					stroke="#f43f5e"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>

				<!-- Accuracy line -->
				<path
					d={accuracyPath()}
					fill="none"
					stroke="#3b82f6"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>

				<!-- Data points for loss -->
				{#each metrics as m}
					<circle
						cx={scaleX(m.epoch)}
						cy={scaleY(m.loss, Math.max(...metrics.map(m => m.loss), 1))}
						r="3"
						fill="#f43f5e"
					/>
				{/each}

				<!-- Data points for accuracy -->
				{#each metrics as m}
					<circle
						cx={scaleX(m.epoch)}
						cy={scaleY(m.accuracy, 1)}
						r="3"
						fill="#3b82f6"
					/>
				{/each}

				<!-- Axis labels -->
				<text
					x={padding.left - 35}
					y={padding.top + chartHeight / 2}
					text-anchor="middle"
					transform="rotate(-90, {padding.left - 35}, {padding.top + chartHeight / 2})"
					class="text-xs fill-rose-600 font-medium"
				>
					Loss
				</text>
				<text
					x={padding.left + chartWidth + 30}
					y={padding.top + chartHeight / 2}
					text-anchor="middle"
					transform="rotate(90, {padding.left + chartWidth + 30}, {padding.top + chartHeight / 2})"
					class="text-xs fill-blue-600 font-medium"
				>
					Accuracy
				</text>
				<text
					x={padding.left + chartWidth / 2}
					y={height - 2}
					text-anchor="middle"
					class="text-xs fill-gray-600"
				>
					Epoch
				</text>
			</svg>

			<!-- Legend -->
			<div class="flex items-center justify-center gap-6 mt-2">
				<div class="flex items-center gap-2">
					<div class="w-3 h-0.5 bg-rose-500 rounded"></div>
					<span class="text-xs text-gray-600">Loss</span>
				</div>
				<div class="flex items-center gap-2">
					<div class="w-3 h-0.5 bg-blue-500 rounded"></div>
					<span class="text-xs text-gray-600">Accuracy</span>
				</div>
			</div>
		</div>
	{/if}
</div>
