<script lang="ts">
	/**
	 * Swarm Legend Component
	 * GAP-3.3.2: Swarm Visualization
	 *
	 * Shows legend for agent status colors.
	 */
	import { cn } from '$lib/utils';
	import { STATUS_COLORS } from './types';

	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();

	const statusItems = [
		{ status: 'idle', label: 'Idle', color: STATUS_COLORS.idle },
		{ status: 'working', label: 'Working', color: STATUS_COLORS.working },
		{ status: 'blocked', label: 'Blocked', color: STATUS_COLORS.blocked },
		{ status: 'learning', label: 'Learning', color: STATUS_COLORS.learning }
	];
</script>

<div class={cn('bg-white/90 backdrop-blur rounded-lg px-3 py-2 shadow border', className)}>
	<p class="text-xs font-medium text-gray-500 mb-2">Agent Status</p>
	<div class="flex flex-wrap gap-3">
		{#each statusItems as item}
			<div class="flex items-center gap-1.5">
				<span
					class="w-3 h-3 rounded-full"
					style="background-color: {item.color}"
				></span>
				<span class="text-xs text-gray-600">{item.label}</span>
			</div>
		{/each}
	</div>
</div>
