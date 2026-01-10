<script lang="ts">
	/**
	 * GAP-3.1.2: Compact Resource Usage Bar
	 *
	 * A compact horizontal bar showing resource usage at a glance.
	 * Suitable for embedding in headers or sidebars.
	 */
	import { type ResourceHealthStatus, getResourceHealthStatus } from '$lib/types/resources';
	import { Cpu, MemoryStick, Bot, AlertTriangle } from 'lucide-svelte';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';

	interface Props {
		cpuPercent?: number;
		memoryPercent?: number;
		agentsPercent?: number;
		showLabels?: boolean;
		size?: 'sm' | 'md';
		class?: string;
	}

	let {
		cpuPercent = 0,
		memoryPercent = 0,
		agentsPercent = 0,
		showLabels = false,
		size = 'sm',
		class: className = ''
	}: Props = $props();

	function getStatusColor(status: ResourceHealthStatus): string {
		switch (status) {
			case 'critical':
				return 'bg-red-500';
			case 'warning':
				return 'bg-amber-500';
			default:
				return 'bg-green-500';
		}
	}

	function getStatusBgColor(status: ResourceHealthStatus): string {
		switch (status) {
			case 'critical':
				return 'bg-red-100';
			case 'warning':
				return 'bg-amber-100';
			default:
				return 'bg-gray-200';
		}
	}

	let cpuStatus = $derived(getResourceHealthStatus(cpuPercent));
	let memoryStatus = $derived(getResourceHealthStatus(memoryPercent));
	let agentsStatus = $derived(getResourceHealthStatus(agentsPercent));

	let overallStatus = $derived(
		getResourceHealthStatus(Math.max(cpuPercent, memoryPercent, agentsPercent))
	);

	let hasWarning = $derived(overallStatus !== 'healthy');

	let barHeight = $derived(size === 'sm' ? 'h-1.5' : 'h-2');
	let iconSize = $derived(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4');
</script>

<div class="flex items-center gap-3 {className}">
	{#if hasWarning}
		<Tooltip content="Resource usage is high">
			<AlertTriangle class="{iconSize} text-amber-500" />
		</Tooltip>
	{/if}

	<!-- CPU -->
	<div class="flex items-center gap-1.5">
		<Tooltip content="CPU: {cpuPercent.toFixed(0)}%">
			<Cpu class="{iconSize} text-blue-600" />
		</Tooltip>
		<div class="w-12 {barHeight} {getStatusBgColor(cpuStatus)} rounded-full overflow-hidden">
			<div
				class="{barHeight} {getStatusColor(cpuStatus)} transition-all duration-300"
				style="width: {Math.min(100, cpuPercent)}%"
			></div>
		</div>
		{#if showLabels}
			<span class="text-xs text-gray-500">{cpuPercent.toFixed(0)}%</span>
		{/if}
	</div>

	<!-- Memory -->
	<div class="flex items-center gap-1.5">
		<Tooltip content="Memory: {memoryPercent.toFixed(0)}%">
			<MemoryStick class="{iconSize} text-purple-600" />
		</Tooltip>
		<div class="w-12 {barHeight} {getStatusBgColor(memoryStatus)} rounded-full overflow-hidden">
			<div
				class="{barHeight} {getStatusColor(memoryStatus)} transition-all duration-300"
				style="width: {Math.min(100, memoryPercent)}%"
			></div>
		</div>
		{#if showLabels}
			<span class="text-xs text-gray-500">{memoryPercent.toFixed(0)}%</span>
		{/if}
	</div>

	<!-- Agents -->
	<div class="flex items-center gap-1.5">
		<Tooltip content="Agents: {agentsPercent.toFixed(0)}%">
			<Bot class="{iconSize} text-green-600" />
		</Tooltip>
		<div class="w-12 {barHeight} {getStatusBgColor(agentsStatus)} rounded-full overflow-hidden">
			<div
				class="{barHeight} {getStatusColor(agentsStatus)} transition-all duration-300"
				style="width: {Math.min(100, agentsPercent)}%"
			></div>
		</div>
		{#if showLabels}
			<span class="text-xs text-gray-500">{agentsPercent.toFixed(0)}%</span>
		{/if}
	</div>
</div>
