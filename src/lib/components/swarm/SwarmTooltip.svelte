<script lang="ts">
	/**
	 * Swarm Tooltip Component
	 * GAP-3.3.2: Swarm Visualization
	 *
	 * Shows detailed information about a hovered agent node.
	 */
	import { cn } from '$lib/utils';
	import * as Icons from 'lucide-svelte';
	import type { SwarmNode } from './types';
	import { STATUS_COLORS, ROLE_COLORS } from './types';

	interface Props {
		node: SwarmNode;
		x: number;
		y: number;
		class?: string;
	}

	let { node, x, y, class: className = '' }: Props = $props();

	// Format health percentage
	const healthPercent = $derived(Math.round(node.health * 100));

	// Status label
	const statusLabel = $derived(
		node.status.charAt(0).toUpperCase() + node.status.slice(1)
	);
</script>

<div
	class={cn(
		'absolute z-50 bg-white rounded-lg shadow-lg border p-3 min-w-[200px] pointer-events-none',
		className
	)}
	style="left: {x + 15}px; top: {y - 10}px; transform: translateY(-50%);"
>
	<!-- Header -->
	<div class="flex items-center gap-2 mb-2">
		<div
			class="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
			style="background-color: {STATUS_COLORS[node.status]}"
		>
			{node.agentType.slice(0, 2).toUpperCase()}
		</div>
		<div>
			<p class="font-medium text-gray-900">{node.label || node.agentType}</p>
			<div class="flex items-center gap-1">
				<span
					class="w-1.5 h-1.5 rounded-full"
					style="background-color: {STATUS_COLORS[node.status]}"
				></span>
				<span class="text-xs text-gray-500">{statusLabel}</span>
				{#if node.role}
					<span class="text-xs text-gray-400">•</span>
					<span
						class="text-xs capitalize"
						style="color: {ROLE_COLORS[node.role]}"
					>
						{node.role}
					</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- Current task -->
	{#if node.currentTask}
		<div class="mb-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
			<div class="flex items-center gap-1 font-medium mb-0.5">
				<Icons.Play class="w-3 h-3" />
				Current Task
			</div>
			<p class="text-blue-600">{node.currentTask}</p>
		</div>
	{/if}

	<!-- Stats -->
	<div class="grid grid-cols-2 gap-2 text-xs">
		<!-- Health -->
		<div class="flex items-center gap-1.5">
			<Icons.Heart class="w-3 h-3 text-gray-400" />
			<span class="text-gray-500">Health:</span>
			<span
				class={cn(
					'font-medium',
					healthPercent >= 80 ? 'text-green-600' :
					healthPercent >= 50 ? 'text-yellow-600' : 'text-red-600'
				)}
			>
				{healthPercent}%
			</span>
		</div>

		<!-- Task count -->
		<div class="flex items-center gap-1.5">
			<Icons.CheckCircle2 class="w-3 h-3 text-gray-400" />
			<span class="text-gray-500">Tasks:</span>
			<span class="font-medium text-gray-700">{node.taskCount}</span>
		</div>
	</div>

	<!-- Consensus vote -->
	{#if node.consensusVote}
		<div class="mt-2 pt-2 border-t flex items-center gap-1.5 text-xs">
			<Icons.Vote class="w-3 h-3 text-gray-400" />
			<span class="text-gray-500">Vote:</span>
			<span
				class={cn(
					'font-medium capitalize',
					node.consensusVote === 'for' ? 'text-green-600' :
					node.consensusVote === 'against' ? 'text-red-600' : 'text-gray-500'
				)}
			>
				{node.consensusVote}
			</span>
		</div>
	{/if}
</div>
