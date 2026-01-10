<script lang="ts">
	/**
	 * TASK-078: Training Configuration Panel Component
	 *
	 * Displays and allows adjustment of neural training configuration.
	 * Includes trigger training button and collapsible history section.
	 */
	import type { TrainingConfig, TrainingHistory } from '$lib/types/neural';
	import Button from '$lib/components/ui/Button.svelte';
	import { Settings, Play, ChevronDown, ChevronUp, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-svelte';
	import { enhance } from '$app/forms';

	interface Props {
		config: TrainingConfig;
		history: TrainingHistory[];
		isTraining?: boolean;
		historyExpanded?: boolean;
		onTriggerTraining?: (config: TrainingConfig) => void;
	}

	let {
		config,
		history,
		isTraining = false,
		historyExpanded = false,
		onTriggerTraining
	}: Props = $props();

	// Local state for form values (initialized via $effect to respond to config changes)
	let epochs = $state(10);
	let learningRate = $state(0.001);
	let batchSize = $state(32);
	let modelType = $state<TrainingConfig['modelType']>('moe');
	let patternType = $state<TrainingConfig['patternType']>('coordination');
	let optimizerType = $state<TrainingConfig['optimizerType']>('adam');

	// Sync from props on mount/change
	$effect(() => {
		epochs = config.epochs;
		learningRate = config.learningRate;
		batchSize = config.batchSize;
		modelType = config.modelType;
		patternType = config.patternType;
		optimizerType = config.optimizerType;
	});

	// History toggle
	let showHistory = $state(false);

	$effect(() => {
		showHistory = historyExpanded;
	});

	// Validation
	let epochsError = $state('');
	let learningRateError = $state('');
	let batchSizeError = $state('');

	function validateEpochs(value: number) {
		if (value < 1 || value > 100) {
			epochsError = 'Epochs must be between 1 and 100';
		} else {
			epochsError = '';
		}
	}

	function validateLearningRate(value: number) {
		if (value <= 0 || value > 1) {
			learningRateError = 'Learning rate must be between 0 and 1';
		} else {
			learningRateError = '';
		}
	}

	function validateBatchSize(value: number) {
		if (value < 1 || value > 256) {
			batchSizeError = 'Batch size must be between 1 and 256';
		} else {
			batchSizeError = '';
		}
	}

	$effect(() => {
		validateEpochs(epochs);
	});

	$effect(() => {
		validateLearningRate(learningRate);
	});

	$effect(() => {
		validateBatchSize(batchSize);
	});

	const hasErrors = $derived(!!epochsError || !!learningRateError || !!batchSizeError);

	// Format duration
	function formatDuration(start: number, end?: number): string {
		const duration = (end ?? Date.now()) - start;
		const seconds = Math.floor(duration / 1000);
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
		const hours = Math.floor(minutes / 60);
		return `${hours}h ${minutes % 60}m`;
	}

	// Format timestamp
	function formatTime(timestamp: number): string {
		return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	// Get status icon
	function getStatusIcon(status: TrainingHistory['status']) {
		switch (status) {
			case 'completed': return CheckCircle2;
			case 'failed': return XCircle;
			case 'running': return Loader2;
			default: return Clock;
		}
	}

	function getStatusColor(status: TrainingHistory['status']): string {
		switch (status) {
			case 'completed': return 'text-green-600';
			case 'failed': return 'text-red-600';
			case 'running': return 'text-amber-600';
			default: return 'text-gray-600';
		}
	}

	function handleTriggerClick() {
		if (onTriggerTraining) {
			onTriggerTraining({
				epochs,
				learningRate,
				batchSize,
				modelType,
				patternType,
				optimizerType
			});
		}
	}
</script>

<div data-testid="training-config">
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-2">
			<Settings class="w-5 h-5 text-gray-600" />
			<h3 class="text-lg font-semibold text-gray-900">Training Configuration</h3>
		</div>
	</div>

	<form method="POST" action="?/triggerTraining" use:enhance class="space-y-4">
		<!-- Configuration Grid -->
		<div class="grid grid-cols-2 gap-4">
			<!-- Epochs -->
			<div>
				<label for="epochs" class="block text-sm font-medium text-gray-700 mb-1">
					Epochs
				</label>
				<input
					type="number"
					id="epochs"
					name="epochs"
					bind:value={epochs}
					min="1"
					max="100"
					class="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500
						{epochsError ? 'border-red-300' : 'border-gray-300'}"
					disabled={isTraining}
				/>
				{#if epochsError}
					<p data-testid="epochs-error" class="mt-1 text-xs text-red-600">{epochsError}</p>
				{/if}
			</div>

			<!-- Learning Rate -->
			<div>
				<label for="learningRate" class="block text-sm font-medium text-gray-700 mb-1">
					Learning Rate
				</label>
				<input
					type="number"
					id="learningRate"
					name="learningRate"
					bind:value={learningRate}
					step="0.0001"
					min="0.0001"
					max="1"
					class="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500
						{learningRateError ? 'border-red-300' : 'border-gray-300'}"
					disabled={isTraining}
				/>
				{#if learningRateError}
					<p class="mt-1 text-xs text-red-600">{learningRateError}</p>
				{/if}
			</div>

			<!-- Batch Size -->
			<div>
				<label for="batchSize" class="block text-sm font-medium text-gray-700 mb-1">
					Batch Size
				</label>
				<input
					type="number"
					id="batchSize"
					name="batchSize"
					bind:value={batchSize}
					min="1"
					max="256"
					class="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500
						{batchSizeError ? 'border-red-300' : 'border-gray-300'}"
					disabled={isTraining}
				/>
				{#if batchSizeError}
					<p class="mt-1 text-xs text-red-600">{batchSizeError}</p>
				{/if}
			</div>

			<!-- Model Type -->
			<div>
				<label for="modelType" class="block text-sm font-medium text-gray-700 mb-1">
					Model Type
				</label>
				<select
					id="modelType"
					name="modelType"
					bind:value={modelType}
					class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
					disabled={isTraining}
				>
					<option value="moe">MoE (Mixture of Experts)</option>
					<option value="sona">SONA</option>
					<option value="hybrid">Hybrid</option>
				</select>
			</div>

			<!-- Pattern Type -->
			<div>
				<label for="patternType" class="block text-sm font-medium text-gray-700 mb-1">
					Pattern Type
				</label>
				<select
					id="patternType"
					name="patternType"
					bind:value={patternType}
					class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
					disabled={isTraining}
				>
					<option value="coordination">Coordination</option>
					<option value="routing">Routing</option>
					<option value="memory">Memory</option>
					<option value="all">All Types</option>
				</select>
			</div>

			<!-- Optimizer Type -->
			<div>
				<label for="optimizerType" class="block text-sm font-medium text-gray-700 mb-1">
					Optimizer
				</label>
				<select
					id="optimizerType"
					name="optimizerType"
					bind:value={optimizerType}
					class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
					disabled={isTraining}
				>
					<option value="adam">Adam</option>
					<option value="adamw">AdamW</option>
					<option value="sgd">SGD</option>
				</select>
			</div>
		</div>

		<!-- Trigger Training Button -->
		<div class="pt-2">
			<Button
				type="submit"
				disabled={isTraining || hasErrors}
				class="w-full"
				onclick={handleTriggerClick}
			>
				{#if isTraining}
					<Loader2 class="w-4 h-4 mr-2 animate-spin" />
					Training in Progress...
				{:else}
					<Play class="w-4 h-4 mr-2" />
					Trigger Training
				{/if}
			</Button>
		</div>
	</form>

	<!-- Training History Section -->
	<div class="mt-6 pt-4 border-t border-gray-200">
		<button
			type="button"
			class="flex items-center justify-between w-full text-left"
			onclick={() => showHistory = !showHistory}
			aria-label="Training History"
		>
			<span class="text-sm font-medium text-gray-700">Training History</span>
			<div class="flex items-center gap-2">
				<span class="text-xs text-gray-500">{history.length} sessions</span>
				{#if showHistory}
					<ChevronUp class="w-4 h-4 text-gray-500" />
				{:else}
					<ChevronDown class="w-4 h-4 text-gray-500" />
				{/if}
			</div>
		</button>

		{#if showHistory}
			<div class="mt-3 space-y-2 max-h-48 overflow-y-auto">
				{#if history.length === 0}
					<p class="text-sm text-gray-500 text-center py-4">No training history</p>
				{:else}
					{#each history as entry}
						{@const StatusIcon = getStatusIcon(entry.status)}
						<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
							<div class="flex items-center gap-3">
								<StatusIcon
									class="w-4 h-4 {getStatusColor(entry.status)} {entry.status === 'running' ? 'animate-spin' : ''}"
								/>
								<div>
									<p class="font-medium text-gray-900">{entry.id}</p>
									<p class="text-xs text-gray-500">
										{formatTime(entry.startTime)} - {entry.epochs} epochs
									</p>
								</div>
							</div>
							<div class="text-right">
								{#if entry.finalLoss !== undefined}
									<p class="text-xs text-gray-600">Loss: {entry.finalLoss.toFixed(3)}</p>
								{/if}
								{#if entry.finalAccuracy !== undefined}
									<p class="text-xs text-gray-600">Acc: {(entry.finalAccuracy * 100).toFixed(1)}%</p>
								{/if}
								<p class="text-xs text-gray-400">{formatDuration(entry.startTime, entry.endTime)}</p>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		{/if}
	</div>
</div>
