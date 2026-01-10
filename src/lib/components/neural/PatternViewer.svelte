<script lang="ts">
	/**
	 * TASK-079: Neural Pattern Viewer Component
	 *
	 * Displays trained neural patterns with confidence scores.
	 * Includes 2D scatter plot visualization of pattern embeddings.
	 * Features pattern prediction input.
	 */
	import type { NeuralPattern, PatternPrediction } from '$lib/types/neural';
	import Button from '$lib/components/ui/Button.svelte';
	import { Search, Sparkles, Filter, Eye } from 'lucide-svelte';
	import { enhance } from '$app/forms';

	interface Props {
		patterns: NeuralPattern[];
		prediction?: PatternPrediction | null;
		onPredict?: (taskDescription: string) => Promise<PatternPrediction | null>;
	}

	let { patterns, prediction = null, onPredict }: Props = $props();

	// Local state
	let taskInput = $state('');
	let selectedType = $state('all');
	let isSearching = $state(false);
	let hoveredPattern = $state<string | null>(null);

	// Filter patterns by type
	const filteredPatterns = $derived(
		selectedType === 'all'
			? patterns
			: patterns.filter(p => p.type === selectedType)
	);

	// Get unique pattern types
	const patternTypes = $derived([...new Set(patterns.map(p => p.type))]);

	// Scatter plot dimensions
	const plotSize = 280;
	const plotPadding = 20;
	const plotArea = plotSize - plotPadding * 2;

	// Scale embeddings to plot coordinates
	function scaleEmbedding(embedding: number[], dimension: 0 | 1): number {
		if (patterns.length === 0) return plotPadding + plotArea / 2;

		const values = patterns.map(p => p.embedding[dimension]);
		const min = Math.min(...values);
		const max = Math.max(...values);
		const range = max - min || 1;

		return plotPadding + ((embedding[dimension] - min) / range) * plotArea;
	}

	// Get pattern type color
	function getTypeColor(type: NeuralPattern['type']): { fill: string; text: string; bg: string } {
		const colors: Record<string, { fill: string; text: string; bg: string }> = {
			security: { fill: '#ef4444', text: 'text-red-700', bg: 'bg-red-100' },
			performance: { fill: '#3b82f6', text: 'text-blue-700', bg: 'bg-blue-100' },
			resilience: { fill: '#10b981', text: 'text-emerald-700', bg: 'bg-emerald-100' },
			coordination: { fill: '#8b5cf6', text: 'text-purple-700', bg: 'bg-purple-100' },
			routing: { fill: '#f59e0b', text: 'text-amber-700', bg: 'bg-amber-100' },
			memory: { fill: '#06b6d4', text: 'text-cyan-700', bg: 'bg-cyan-100' }
		};
		return colors[type] ?? { fill: '#6b7280', text: 'text-gray-700', bg: 'bg-gray-100' };
	}

	// Get point size based on confidence
	function getPointSize(confidence: number): number {
		return 4 + confidence * 8;
	}

	async function handlePredict() {
		if (!taskInput.trim() || !onPredict) return;

		isSearching = true;
		try {
			await onPredict(taskInput);
		} finally {
			isSearching = false;
		}
	}
</script>

<div data-testid="pattern-viewer">
	<div class="flex items-center justify-between mb-6">
		<div class="flex items-center gap-2">
			<Sparkles class="w-5 h-5 text-purple-600" />
			<h3 class="text-lg font-semibold text-gray-900">Neural Patterns</h3>
		</div>
		<span class="text-sm text-gray-500">{patterns.length} patterns</span>
	</div>

	{#if patterns.length === 0}
		<div class="flex items-center justify-center h-48 bg-gray-50 rounded-lg border border-dashed border-gray-300">
			<p class="text-gray-500">No patterns available</p>
		</div>
	{:else}
		<div class="grid lg:grid-cols-2 gap-6">
			<!-- Left: Pattern List -->
			<div class="space-y-4">
				<!-- Filter -->
				<div class="flex items-center gap-2">
					<Filter class="w-4 h-4 text-gray-500" />
					<label for="typeFilter" class="sr-only">Filter by type</label>
					<select
						id="typeFilter"
						aria-label="Filter by type"
						bind:value={selectedType}
						class="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500"
					>
						<option value="all">All Types</option>
						{#each patternTypes as type}
							<option value={type}>{type}</option>
						{/each}
					</select>
				</div>

				<!-- Pattern list -->
				<div class="space-y-2 max-h-80 overflow-y-auto">
					{#each filteredPatterns as pattern}
						{@const colors = getTypeColor(pattern.type)}
						<div
							data-testid="pattern-item-{pattern.id}"
							class="p-3 bg-white border rounded-lg transition-colors hover:border-blue-300
								{hoveredPattern === pattern.id ? 'border-blue-400 shadow-sm' : 'border-gray-200'}"
							role="button"
							tabindex="0"
							onmouseenter={() => hoveredPattern = pattern.id}
							onmouseleave={() => hoveredPattern = null}
							onkeydown={(e) => e.key === 'Enter' && (hoveredPattern = pattern.id)}
						>
							<div class="flex items-start justify-between">
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2">
										<h4 class="font-medium text-gray-900 truncate">{pattern.name}</h4>
										<span
											data-testid="pattern-type-{pattern.type}"
											class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium {colors.bg} {colors.text}"
										>
											{pattern.type}
										</span>
									</div>
									<div class="flex items-center gap-3 mt-1 text-xs text-gray-500">
										<span>{pattern.usageCount} uses</span>
										<span>Confidence: <strong class="text-gray-700">{(pattern.confidence * 100).toFixed(0)}%</strong></span>
									</div>
								</div>
								<Eye class="w-4 h-4 text-gray-400 flex-shrink-0" />
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Right: Scatter Plot & Prediction -->
			<div class="space-y-6">
				<!-- 2D Embedding Scatter Plot -->
				<div class="bg-gray-50 rounded-lg p-4">
					<h4 class="text-sm font-medium text-gray-700 mb-3">Pattern Embeddings (2D Projection)</h4>
					<div data-testid="embedding-scatter" class="flex justify-center">
						<svg width={plotSize} height={plotSize} class="bg-white rounded border border-gray-200">
							<!-- Grid -->
							<line x1={plotPadding} y1={plotSize/2} x2={plotSize-plotPadding} y2={plotSize/2} stroke="#e5e7eb" stroke-dasharray="4,4" />
							<line x1={plotSize/2} y1={plotPadding} x2={plotSize/2} y2={plotSize-plotPadding} stroke="#e5e7eb" stroke-dasharray="4,4" />

							<!-- Points -->
							{#each filteredPatterns as pattern}
								{@const colors = getTypeColor(pattern.type)}
								{@const x = scaleEmbedding(pattern.embedding, 0)}
								{@const y = plotSize - scaleEmbedding(pattern.embedding, 1)}
								{@const size = getPointSize(pattern.confidence)}
								<circle
									data-testid="pattern-point-{pattern.id}"
									cx={x}
									cy={y}
									r={hoveredPattern === pattern.id ? size * 1.5 : size}
									fill={colors.fill}
									fill-opacity={hoveredPattern === pattern.id ? 1 : 0.7}
									stroke={hoveredPattern === pattern.id ? '#1f2937' : 'none'}
									stroke-width="2"
									class="transition-all duration-150 cursor-pointer"
									role="button"
									tabindex="0"
									onmouseenter={() => hoveredPattern = pattern.id}
									onmouseleave={() => hoveredPattern = null}
									onfocus={() => hoveredPattern = pattern.id}
									onblur={() => hoveredPattern = null}
								>
									<title>{pattern.name} ({(pattern.confidence * 100).toFixed(0)}%)</title>
								</circle>
							{/each}

							<!-- Axes labels -->
							<text x={plotSize/2} y={plotSize - 4} text-anchor="middle" class="text-xs fill-gray-400">Dimension 1</text>
							<text x={8} y={plotSize/2} text-anchor="middle" transform="rotate(-90, 8, {plotSize/2})" class="text-xs fill-gray-400">Dimension 2</text>
						</svg>
					</div>

					<!-- Legend -->
					<div class="flex flex-wrap justify-center gap-3 mt-3">
						{#each patternTypes as type}
							{@const colors = getTypeColor(type)}
							<div class="flex items-center gap-1">
								<div class="w-3 h-3 rounded-full" style="background-color: {colors.fill}"></div>
								<span class="text-xs text-gray-600">{type}</span>
							</div>
						{/each}
					</div>
				</div>

				<!-- Pattern Prediction -->
				<div class="bg-purple-50 rounded-lg p-4">
					<h4 class="text-sm font-medium text-purple-900 mb-3">Predict Pattern</h4>
					<form method="POST" action="?/predictPattern" use:enhance class="space-y-3">
						<div class="flex gap-2">
							<input
								type="text"
								name="taskDescription"
								bind:value={taskInput}
								placeholder="Enter task description..."
								class="flex-1 px-3 py-2 border border-purple-200 rounded-md text-sm focus:ring-2 focus:ring-purple-500 bg-white"
							/>
							<Button
								type="submit"
								variant="default"
								size="sm"
								disabled={isSearching || !taskInput.trim()}
								onclick={handlePredict}
							>
								{#if isSearching}
									<span class="animate-spin">...</span>
								{:else}
									<Search class="w-4 h-4" />
								{/if}
								Predict
							</Button>
						</div>
					</form>

					{#if prediction}
						<div class="mt-4 p-3 bg-white rounded-lg border border-purple-200">
							<p class="text-xs text-purple-600 font-medium mb-2">Predicted Pattern</p>
							{@const colors = getTypeColor(prediction.pattern.type)}
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<span class="font-medium text-gray-900">{prediction.pattern.name}</span>
									<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium {colors.bg} {colors.text}">
										{prediction.pattern.type}
									</span>
								</div>
								<span class="text-sm font-bold text-purple-600">
									{(prediction.confidence * 100).toFixed(0)}%
								</span>
							</div>
							{#if prediction.alternatives.length > 0}
								<p class="text-xs text-gray-500 mt-2">
									Alternatives: {prediction.alternatives.map(a => a.name).join(', ')}
								</p>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
