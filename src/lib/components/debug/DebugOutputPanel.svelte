<script lang="ts">
	/**
	 * cf-kanban-jxq: Debug Output Panel
	 *
	 * Collapsible panel showing real-time Claude Code execution output.
	 * Helps users understand what's happening during ticket processing.
	 */
	import { ChevronDown, ChevronUp, Terminal, Circle, Loader2, AlertCircle, CheckCircle, Trash2 } from 'lucide-svelte';
	import { onMount, onDestroy } from 'svelte';

	interface OutputLine {
		timestamp: string;
		text: string;
		isError: boolean;
	}

	interface Props {
		ticketId?: string;
		projectId?: string;
		class?: string;
	}

	let { ticketId, projectId, class: className = '' }: Props = $props();

	// Panel state
	let isExpanded = $state(false);
	let isAutoScroll = $state(true);

	// Execution state
	let status: 'idle' | 'running' | 'completed' | 'failed' = $state('idle');
	let outputLines: OutputLine[] = $state([]);
	let currentJob: { id: string; command: string; startedAt: string } | null = $state(null);

	// Polling interval
	let pollInterval: ReturnType<typeof setInterval> | null = null;
	let outputContainer: HTMLDivElement | null = $state(null);

	// Scroll to bottom when new output arrives
	$effect(() => {
		if (isAutoScroll && outputContainer && outputLines.length > 0) {
			outputContainer.scrollTop = outputContainer.scrollHeight;
		}
	});

	onMount(() => {
		// Poll for execution status
		pollInterval = setInterval(fetchExecutionStatus, 2000);
		fetchExecutionStatus();
	});

	onDestroy(() => {
		if (pollInterval) {
			clearInterval(pollInterval);
		}
	});

	async function fetchExecutionStatus() {
		try {
			const params = new URLSearchParams();
			if (ticketId) params.set('ticketId', ticketId);
			if (projectId) params.set('projectId', projectId);

			const response = await fetch(`/api/executor/status?${params}`);
			if (response.ok) {
				const data = await response.json();
				status = data.status;
				currentJob = data.currentJob;

				// Append new output lines
				if (data.newOutput && data.newOutput.length > 0) {
					outputLines = [...outputLines, ...data.newOutput];
					// Keep only last 500 lines
					if (outputLines.length > 500) {
						outputLines = outputLines.slice(-500);
					}
				}
			}
		} catch {
			// Silently fail - executor might not be running
		}
	}

	function clearOutput() {
		outputLines = [];
	}

	function toggleExpanded() {
		isExpanded = !isExpanded;
	}

	function getStatusColor() {
		switch (status) {
			case 'running': return 'text-blue-500';
			case 'completed': return 'text-green-500';
			case 'failed': return 'text-red-500';
			default: return 'text-gray-400';
		}
	}

	function getStatusIcon() {
		switch (status) {
			case 'running': return Loader2;
			case 'completed': return CheckCircle;
			case 'failed': return AlertCircle;
			default: return Circle;
		}
	}

	function formatTimestamp(ts: string): string {
		try {
			return new Date(ts).toLocaleTimeString();
		} catch {
			return ts;
		}
	}
</script>

<div class="fixed bottom-0 left-0 right-0 z-40 {className}">
	<!-- Collapsed header bar -->
	<button
		onclick={toggleExpanded}
		class="w-full flex items-center justify-between px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 transition-colors border-t border-gray-700"
	>
		<div class="flex items-center gap-3">
			<Terminal class="w-4 h-4 text-gray-400" />
			<span class="text-sm font-medium">Debug Output</span>

			<!-- Status indicator -->
			<div class="flex items-center gap-1.5">
				{#if status === 'running'}
					<Loader2 class="w-3.5 h-3.5 text-blue-500 animate-spin" />
				{:else if status === 'completed'}
					<CheckCircle class="w-3.5 h-3.5 text-green-500" />
				{:else if status === 'failed'}
					<AlertCircle class="w-3.5 h-3.5 text-red-500" />
				{:else}
					<Circle class="w-3.5 h-3.5 text-gray-400" />
				{/if}
				<span class="text-xs {getStatusColor()} capitalize">{status}</span>
			</div>

			{#if currentJob}
				<span class="text-xs text-gray-500 truncate max-w-[200px]">
					{currentJob.command}
				</span>
			{/if}

			{#if outputLines.length > 0}
				<span class="text-xs text-gray-500">
					({outputLines.length} lines)
				</span>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			{#if isExpanded}
				<ChevronDown class="w-4 h-4" />
			{:else}
				<ChevronUp class="w-4 h-4" />
			{/if}
		</div>
	</button>

	<!-- Expanded output panel -->
	{#if isExpanded}
		<div class="bg-gray-950 border-t border-gray-800">
			<!-- Toolbar -->
			<div class="flex items-center justify-between px-4 py-2 border-b border-gray-800">
				<div class="flex items-center gap-4">
					<label class="flex items-center gap-2 text-xs text-gray-400">
						<input
							type="checkbox"
							bind:checked={isAutoScroll}
							class="w-3 h-3 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
						/>
						Auto-scroll
					</label>

					{#if currentJob}
						<span class="text-xs text-gray-500">
							Job: {currentJob.id} | Started: {formatTimestamp(currentJob.startedAt)}
						</span>
					{/if}
				</div>

				<button
					onclick={clearOutput}
					class="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
				>
					<Trash2 class="w-3 h-3" />
					Clear
				</button>
			</div>

			<!-- Output area -->
			<div
				bind:this={outputContainer}
				class="h-48 overflow-y-auto font-mono text-xs p-4 space-y-0.5"
			>
				{#if outputLines.length === 0}
					<div class="text-gray-600 italic">
						No output yet. Execution output will appear here when tickets are processed.
					</div>
				{:else}
					{#each outputLines as line}
						<div class="flex gap-2 {line.isError ? 'text-red-400' : 'text-gray-300'}">
							<span class="text-gray-600 flex-shrink-0">{formatTimestamp(line.timestamp)}</span>
							<span class="whitespace-pre-wrap break-all">{line.text}</span>
						</div>
					{/each}
				{/if}

				{#if status === 'running'}
					<div class="flex items-center gap-2 text-blue-400 mt-2">
						<Loader2 class="w-3 h-3 animate-spin" />
						<span>Processing...</span>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	/* Ensure panel is above other content but below modals */
	:global(body) {
		padding-bottom: 40px; /* Space for collapsed header */
	}
</style>
