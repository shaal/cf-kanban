<script lang="ts">
	/**
	 * TASK-061: Execution Timeline Component
	 *
	 * Visual timeline showing execution stages with:
	 * - Vertical timeline layout
	 * - Duration display for each stage
	 * - Click to view stage output details
	 * - Status indicators and animations
	 */
	import { createEventDispatcher } from 'svelte';
	import { getTicketProgress, type ProgressStage } from '$lib/stores/progress';
	import { cn } from '$lib/utils';
	import {
		Circle,
		CheckCircle2,
		XCircle,
		Loader2,
		Clock,
		ChevronRight,
		PlayCircle,
		PauseCircle
	} from 'lucide-svelte';

	interface Props {
		ticketId: string;
		class?: string;
	}

	let { ticketId, class: className = '' }: Props = $props();

	const dispatch = createEventDispatcher<{
		stageClick: { stage: ProgressStage };
	}>();

	// Subscribe to progress for this ticket
	const progress = getTicketProgress(ticketId);

	let selectedStage = $state<ProgressStage | null>(null);

	/**
	 * Handle stage click
	 */
	function handleStageClick(stage: ProgressStage) {
		selectedStage = selectedStage?.id === stage.id ? null : stage;
		dispatch('stageClick', { stage });
	}

	/**
	 * Format duration in human readable format
	 */
	function formatDuration(ms: number | undefined): string {
		if (!ms) return '-';
		if (ms < 1000) return `${ms}ms`;
		if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.round((ms % 60000) / 1000);
		return `${minutes}m ${seconds}s`;
	}

	/**
	 * Format timestamp
	 */
	function formatTime(timestamp: string | undefined): string {
		if (!timestamp) return '-';
		return new Date(timestamp).toLocaleTimeString();
	}

	/**
	 * Get status icon component
	 */
	function getStatusIcon(status: ProgressStage['status']) {
		switch (status) {
			case 'completed':
				return CheckCircle2;
			case 'in-progress':
				return Loader2;
			case 'failed':
				return XCircle;
			case 'skipped':
				return PauseCircle;
			default:
				return Circle;
		}
	}

	/**
	 * Get timeline colors for status
	 */
	function getStatusColors(status: ProgressStage['status']): {
		dot: string;
		line: string;
		text: string;
		bg: string;
	} {
		switch (status) {
			case 'completed':
				return {
					dot: 'bg-green-500 border-green-500',
					line: 'bg-green-500',
					text: 'text-green-700',
					bg: 'bg-green-50'
				};
			case 'in-progress':
				return {
					dot: 'bg-blue-500 border-blue-500',
					line: 'bg-blue-500',
					text: 'text-blue-700',
					bg: 'bg-blue-50'
				};
			case 'failed':
				return {
					dot: 'bg-red-500 border-red-500',
					line: 'bg-red-500',
					text: 'text-red-700',
					bg: 'bg-red-50'
				};
			case 'skipped':
				return {
					dot: 'bg-gray-300 border-gray-300',
					line: 'bg-gray-300',
					text: 'text-gray-500',
					bg: 'bg-gray-50'
				};
			default:
				return {
					dot: 'bg-gray-200 border-gray-300',
					line: 'bg-gray-200',
					text: 'text-gray-400',
					bg: 'bg-white'
				};
		}
	}

	/**
	 * Calculate total elapsed time
	 */
	function getTotalElapsed(): string {
		if (!$progress) return '-';

		const start = new Date($progress.startedAt).getTime();
		const end = $progress.isActive ? Date.now() : new Date($progress.lastUpdatedAt).getTime();

		return formatDuration(end - start);
	}
</script>

{#if $progress}
	<div class={cn('bg-white rounded-lg border shadow-sm', className)}>
		<!-- Header -->
		<div class="p-4 border-b flex items-center justify-between">
			<h3 class="font-semibold text-gray-900">Execution Timeline</h3>
			<div class="flex items-center gap-2 text-sm text-gray-500">
				<Clock class="w-4 h-4" />
				<span>Total: {getTotalElapsed()}</span>
			</div>
		</div>

		<!-- Timeline -->
		<div class="p-4">
			<div class="relative">
				{#each $progress.stages as stage, index (stage.id)}
					{@const colors = getStatusColors(stage.status)}
					{@const Icon = getStatusIcon(stage.status)}
					{@const isLast = index === $progress.stages.length - 1}
					{@const isSelected = selectedStage?.id === stage.id}

					<div class="relative flex gap-4 pb-6 last:pb-0">
						<!-- Timeline line -->
						{#if !isLast}
							<div
								class={cn(
									'absolute left-[11px] top-6 w-0.5 h-full',
									stage.status === 'completed' || stage.status === 'in-progress'
										? colors.line
										: 'bg-gray-200'
								)}
							></div>
						{/if}

						<!-- Timeline dot -->
						<div
							class={cn(
								'relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
								stage.status === 'pending'
									? 'bg-white border-2 border-gray-300'
									: colors.dot
							)}
						>
							<Icon
								class={cn(
									'w-4 h-4',
									stage.status === 'pending' ? 'text-gray-400' : 'text-white',
									stage.status === 'in-progress' && 'animate-spin'
								)}
							/>
						</div>

						<!-- Stage content -->
						<div class="flex-1 min-w-0">
							<button
								class={cn(
									'w-full text-left rounded-lg p-3 transition-colors',
									'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500',
									isSelected && colors.bg
								)}
								onclick={() => handleStageClick(stage)}
							>
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-2">
										<span
											class={cn(
												'font-medium',
												stage.status === 'pending' ? 'text-gray-400' : colors.text
											)}
										>
											{stage.name}
										</span>
										{#if stage.status === 'in-progress'}
											<span class="text-xs text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full">
												Running
											</span>
										{/if}
									</div>
									<ChevronRight
										class={cn(
											'w-4 h-4 text-gray-400 transition-transform',
											isSelected && 'rotate-90'
										)}
									/>
								</div>

								<!-- Time info -->
								<div class="flex items-center gap-4 mt-1 text-xs text-gray-500">
									{#if stage.startedAt}
										<span>Started: {formatTime(stage.startedAt)}</span>
									{/if}
									{#if stage.completedAt}
										<span>Ended: {formatTime(stage.completedAt)}</span>
									{/if}
									{#if stage.duration}
										<span class="font-medium text-gray-600">
											Duration: {formatDuration(stage.duration)}
										</span>
									{/if}
								</div>
							</button>

							<!-- Expanded details -->
							{#if isSelected}
								<div class="mt-2 p-3 bg-gray-50 rounded-lg border text-sm">
									{#if stage.output}
										<div class="mb-2">
											<span class="font-medium text-gray-700">Output:</span>
											<pre
												class="mt-1 p-2 bg-white rounded border text-xs overflow-x-auto whitespace-pre-wrap"
											>{stage.output}</pre>
										</div>
									{/if}
									{#if stage.error}
										<div class="text-red-600">
											<span class="font-medium">Error:</span>
											<pre
												class="mt-1 p-2 bg-red-50 rounded border border-red-200 text-xs overflow-x-auto whitespace-pre-wrap"
											>{stage.error}</pre>
										</div>
									{/if}
									{#if !stage.output && !stage.error}
										<span class="text-gray-500 italic">No additional details available</span>
									{/if}
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Footer with summary -->
		{#if !$progress.isActive}
			<div
				class={cn(
					'p-3 border-t text-sm',
					$progress.hasError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
				)}
			>
				{#if $progress.hasError}
					<div class="flex items-center gap-2">
						<XCircle class="w-4 h-4" />
						<span>Execution failed. Check stage details for error information.</span>
					</div>
				{:else}
					<div class="flex items-center gap-2">
						<CheckCircle2 class="w-4 h-4" />
						<span>Execution completed successfully in {getTotalElapsed()}.</span>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{:else}
	<!-- No progress data -->
	<div class={cn('bg-gray-50 rounded-lg border border-dashed p-6 text-center', className)}>
		<PlayCircle class="w-8 h-8 text-gray-400 mx-auto mb-2" />
		<p class="text-sm text-gray-500">No execution timeline available</p>
		<p class="text-xs text-gray-400 mt-1">Timeline will appear when execution starts</p>
	</div>
{/if}
