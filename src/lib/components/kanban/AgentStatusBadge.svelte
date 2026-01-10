<script lang="ts">
	/**
	 * Agent Status Badge Component
	 * GAP-3.3.3: Agent Status on Ticket Cards
	 *
	 * Compact badge showing an agent's type and status with color coding.
	 */
	import { cn } from '$lib/utils';
	import * as Icons from 'lucide-svelte';
	import { STATUS_COLORS } from '$lib/components/swarm/types';
	import type { AgentStatus } from '$lib/components/swarm/types';
	import { getAgentIcon, AGENT_TYPE_ICONS } from '$lib/types/ticket-agents';

	interface Props {
		agentType: string;
		status: AgentStatus;
		size?: 'xs' | 'sm' | 'md';
		showLabel?: boolean;
		class?: string;
	}

	let { agentType, status, size = 'sm', showLabel = false, class: className = '' }: Props = $props();

	// Size configurations
	const sizeConfig = {
		xs: { badge: 'w-4 h-4', icon: 'w-2.5 h-2.5', dot: 'w-1.5 h-1.5', text: 'text-[10px]' },
		sm: { badge: 'w-5 h-5', icon: 'w-3 h-3', dot: 'w-2 h-2', text: 'text-xs' },
		md: { badge: 'w-6 h-6', icon: 'w-3.5 h-3.5', dot: 'w-2.5 h-2.5', text: 'text-sm' }
	};

	const sizes = $derived(sizeConfig[size]);
	const statusColor = $derived(STATUS_COLORS[status]);
	const iconName = $derived(getAgentIcon(agentType));

	// Status label for accessibility
	const statusLabel = $derived(status.charAt(0).toUpperCase() + status.slice(1));

	// Determine if status is pulsing (working = active)
	const isPulsing = $derived(status === 'working');
</script>

<div
	class={cn('inline-flex items-center gap-1', className)}
	title="{agentType} - {statusLabel}"
	role="status"
	aria-label="{agentType} agent: {statusLabel}"
>
	<!-- Agent icon with status indicator -->
	<div class="relative flex-shrink-0">
		<!-- Background circle with agent icon -->
		<div
			class={cn(
				'rounded-full flex items-center justify-center bg-gray-100 border border-gray-200',
				sizes.badge
			)}
		>
			{#if iconName === 'Code'}
				<Icons.Code class={cn('text-gray-600', sizes.icon)} />
			{:else if iconName === 'TestTube'}
				<Icons.TestTube class={cn('text-gray-600', sizes.icon)} />
			{:else if iconName === 'Eye'}
				<Icons.Eye class={cn('text-gray-600', sizes.icon)} />
			{:else if iconName === 'Search'}
				<Icons.Search class={cn('text-gray-600', sizes.icon)} />
			{:else if iconName === 'Network'}
				<Icons.Network class={cn('text-gray-600', sizes.icon)} />
			{:else if iconName === 'Calendar'}
				<Icons.Calendar class={cn('text-gray-600', sizes.icon)} />
			{:else if iconName === 'Building2'}
				<Icons.Building2 class={cn('text-gray-600', sizes.icon)} />
			{:else if iconName === 'Shield'}
				<Icons.Shield class={cn('text-gray-600', sizes.icon)} />
			{:else if iconName === 'Gauge'}
				<Icons.Gauge class={cn('text-gray-600', sizes.icon)} />
			{:else if iconName === 'Brain'}
				<Icons.Brain class={cn('text-gray-600', sizes.icon)} />
			{:else}
				<Icons.Bot class={cn('text-gray-600', sizes.icon)} />
			{/if}
		</div>

		<!-- Status dot (bottom-right corner) -->
		<span
			class={cn(
				'absolute -bottom-0.5 -right-0.5 rounded-full border border-white',
				sizes.dot,
				isPulsing && 'animate-pulse'
			)}
			style="background-color: {statusColor}"
			aria-hidden="true"
		></span>
	</div>

	<!-- Optional label -->
	{#if showLabel}
		<span class={cn('capitalize text-gray-600', sizes.text)}>
			{agentType}
		</span>
	{/if}
</div>

<style>
	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.animate-pulse {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
</style>
