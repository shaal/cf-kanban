<script lang="ts">
	/**
	 * TASK-060: Ticket Progress Component
	 *
	 * Displays real-time progress for ticket execution including:
	 * - Progress bar with percentage
	 * - Current stage indicator
	 * - Estimated time remaining
	 * - Real-time log viewer
	 */
	import { onMount, onDestroy } from 'svelte';
	import {
		getTicketProgress,
		type ProgressStage,
		type ProgressLogEntry
	} from '$lib/stores/progress';
	import { cn } from '$lib/utils';
	import { Activity, Clock, AlertCircle, CheckCircle2, Loader2, ChevronDown, ChevronUp } from 'lucide-svelte';

	interface Props {
		ticketId: string;
		compact?: boolean;
		showLogs?: boolean;
		class?: string;
	}

	let {
		ticketId,
		compact = false,
		showLogs = true,
		class: className = ''
	}: Props = $props();

	// Subscribe to progress for this ticket
	const progress = getTicketProgress(ticketId);

	let logsExpanded = $state(false);
	let logContainer: HTMLDivElement | null = $state(null);

	// Auto-scroll logs to bottom
	$effect(() => {
		if (logContainer && $progress?.logs.length) {
			logContainer.scrollTop = logContainer.scrollHeight;
		}
	});

	/**
	 * Get status icon for a stage
	 */
	function getStageIcon(status: ProgressStage['status']) {
		switch (status) {
			case 'completed':
				return CheckCircle2;
			case 'in-progress':
				return Loader2;
			case 'failed':
				return AlertCircle;
			default:
				return Activity;
		}
	}

	/**
	 * Get status color for a stage
	 */
	function getStageColor(status: ProgressStage['status']): string {
		switch (status) {
			case 'completed':
				return 'text-green-500';
			case 'in-progress':
				return 'text-blue-500';
			case 'failed':
				return 'text-red-500';
			case 'skipped':
				return 'text-gray-400';
			default:
				return 'text-gray-300';
		}
	}

	/**
	 * Get log level color
	 */
	function getLogColor(level: ProgressLogEntry['level']): string {
		switch (level) {
			case 'error':
				return 'text-red-600';
			case 'warn':
				return 'text-yellow-600';
			case 'debug':
				return 'text-gray-400';
			default:
				return 'text-gray-600';
		}
	}

	/**
	 * Format duration in human readable format
	 */
	function formatDuration(ms: number): string {
		if (ms < 1000) return `${ms}ms`;
		if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
		return `${(ms / 60000).toFixed(1)}m`;
	}

	/**
	 * Format estimated remaining time
	 */
	function formatEstimated(minutes: number | null): string {
		if (minutes === null) return 'Calculating...';
		if (minutes === 0) return 'Almost done';
		if (minutes < 1) return 'Less than a minute';
		if (minutes === 1) return '~1 minute';
		return `~${minutes} minutes`;
	}

	/**
	 * Format timestamp
	 */
	function formatTime(timestamp: string): string {
		return new Date(timestamp).toLocaleTimeString();
	}
</script>

{#if $progress}
	<div class={cn('bg-white rounded-lg border shadow-sm', className)}>
		<!-- Header with progress bar -->
		<div class="p-3 border-b">
			<div class="flex items-center justify-between mb-2">
				<div class="flex items-center gap-2">
					{#if $progress.isActive}
						<Loader2 class="w-4 h-4 text-blue-500 animate-spin" />
						<span class="text-sm font-medium text-blue-700">In Progress</span>
					{:else if $progress.hasError}
						<AlertCircle class="w-4 h-4 text-red-500" />
						<span class="text-sm font-medium text-red-700">Failed</span>
					{:else}
						<CheckCircle2 class="w-4 h-4 text-green-500" />
						<span class="text-sm font-medium text-green-700">Completed</span>
					{/if}
				</div>
				<div class="flex items-center gap-2 text-sm text-gray-500">
					<Clock class="w-4 h-4" />
					<span>{formatEstimated($progress.estimatedRemaining)}</span>
				</div>
			</div>

			<!-- Progress bar -->
			<div class="w-full bg-gray-200 rounded-full h-2">
				<div
					class={cn(
						'h-2 rounded-full transition-all duration-500',
						$progress.hasError ? 'bg-red-500' : 'bg-blue-500'
					)}
					style="width: {$progress.percentComplete}%"
				></div>
			</div>
			<div class="flex justify-between mt-1">
				<span class="text-xs text-gray-500">{$progress.currentStage}</span>
				<span class="text-xs font-medium text-gray-700">{$progress.percentComplete}%</span>
			</div>
		</div>

		{#if !compact}
			<!-- Stages list -->
			<div class="p-3 border-b">
				<h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Stages</h4>
				<div class="space-y-1">
					{#each $progress.stages as stage (stage.id)}
						{@const Icon = getStageIcon(stage.status)}
						<div class="flex items-center gap-2 text-sm">
							<Icon
								class={cn(
									'w-4 h-4',
									getStageColor(stage.status),
									stage.status === 'in-progress' && 'animate-spin'
								)}
							/>
							<span
								class={cn(
									'flex-1',
									stage.status === 'in-progress' && 'font-medium',
									stage.status === 'completed' && 'text-gray-500',
									stage.status === 'pending' && 'text-gray-400',
									stage.status === 'failed' && 'text-red-600'
								)}
							>
								{stage.name}
							</span>
							{#if stage.duration}
								<span class="text-xs text-gray-400">{formatDuration(stage.duration)}</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}

		{#if showLogs && $progress.logs.length > 0}
			<!-- Logs section -->
			<div class="p-3">
				<button
					class="flex items-center justify-between w-full text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2"
					onclick={() => (logsExpanded = !logsExpanded)}
				>
					<span>Logs ({$progress.logs.length})</span>
					{#if logsExpanded}
						<ChevronUp class="w-4 h-4" />
					{:else}
						<ChevronDown class="w-4 h-4" />
					{/if}
				</button>

				{#if logsExpanded}
					<div
						bind:this={logContainer}
						class="max-h-48 overflow-y-auto bg-gray-50 rounded p-2 font-mono text-xs space-y-1"
					>
						{#each $progress.logs as log (log.timestamp)}
							<div class={cn('flex gap-2', getLogColor(log.level))}>
								<span class="text-gray-400 flex-shrink-0">{formatTime(log.timestamp)}</span>
								{#if log.stage}
									<span class="text-gray-500 flex-shrink-0">[{log.stage}]</span>
								{/if}
								<span class="break-all">{log.message}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>
{:else}
	<!-- No progress data -->
	<div class={cn('bg-gray-50 rounded-lg border border-dashed p-4 text-center', className)}>
		<Activity class="w-6 h-6 text-gray-400 mx-auto mb-2" />
		<p class="text-sm text-gray-500">No progress data available</p>
	</div>
{/if}
