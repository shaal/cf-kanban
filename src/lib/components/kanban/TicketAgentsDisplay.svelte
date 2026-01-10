<script lang="ts">
	/**
	 * Ticket Agents Display Component
	 * GAP-3.3.3: Agent Status on Ticket Cards
	 *
	 * Shows all agents assigned to a ticket with status indicators.
	 * Designed to be compact for display on kanban cards.
	 */
	import { cn } from '$lib/utils';
	import { createTicketSummaryStore } from '$lib/stores/ticket-agents';
	import AgentStatusBadge from './AgentStatusBadge.svelte';
	import { STATUS_COLORS } from '$lib/components/swarm/types';
	import type { TicketAgentSummary } from '$lib/types/ticket-agents';

	interface Props {
		ticketId: string;
		/** Pre-computed summary (for SSR or when already available) */
		summary?: TicketAgentSummary;
		maxVisible?: number;
		size?: 'xs' | 'sm' | 'md';
		showProgress?: boolean;
		class?: string;
	}

	let {
		ticketId,
		summary: initialSummary,
		maxVisible = 3,
		size = 'xs',
		showProgress = true,
		class: className = ''
	}: Props = $props();

	// Subscribe to reactive summary updates
	const summaryStore = createTicketSummaryStore(ticketId);

	// Use provided summary or reactive store value
	const activeSummary = $derived(initialSummary ?? $summaryStore);

	// Determine if we should show overflow indicator
	const overflowCount = $derived(
		activeSummary && activeSummary.agentCount > maxVisible
			? activeSummary.agentCount - maxVisible
			: 0
	);

	// Size configurations for the container
	const containerHeights = {
		xs: 'h-5',
		sm: 'h-6',
		md: 'h-7'
	};
</script>

{#if activeSummary && activeSummary.agentCount > 0}
	<div
		class={cn(
			'flex items-center gap-1.5 rounded-full bg-gray-50 px-1.5 py-0.5 border border-gray-100',
			containerHeights[size],
			className
		)}
		role="group"
		aria-label="{activeSummary.agentCount} agent{activeSummary.agentCount > 1 ? 's' : ''} assigned"
	>
		<!-- Agent badges (stacked/overlapping style) -->
		<div class="flex -space-x-1">
			{#if activeSummary.primaryAgent}
				<AgentStatusBadge
					agentType={activeSummary.primaryAgent.agentType}
					status={activeSummary.primaryAgent.status}
					{size}
				/>
			{/if}

			<!-- Additional agents indicator -->
			{#if activeSummary.agentCount > 1}
				<div
					class={cn(
						'rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium border border-white',
						size === 'xs' ? 'w-4 h-4 text-[9px]' : size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-6 h-6 text-xs'
					)}
					title="{activeSummary.agentCount} agents assigned"
				>
					+{activeSummary.agentCount - 1}
				</div>
			{/if}
		</div>

		<!-- Progress bar (optional) -->
		{#if showProgress && activeSummary.progress !== undefined}
			<div class="flex-1 min-w-[24px] max-w-[48px]">
				<div class="h-1.5 bg-gray-200 rounded-full overflow-hidden">
					<div
						class="h-full rounded-full transition-all duration-300"
						style="width: {activeSummary.progress}%; background-color: {STATUS_COLORS[activeSummary.overallStatus]}"
					></div>
				</div>
			</div>
		{/if}

		<!-- Blocked indicator -->
		{#if activeSummary.hasBlockedAgent}
			<span
				class={cn(
					'rounded-full',
					size === 'xs' ? 'w-1.5 h-1.5' : size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'
				)}
				style="background-color: {STATUS_COLORS.blocked}"
				title="One or more agents blocked"
				aria-label="Blocked"
			></span>
		{/if}
	</div>
{/if}
