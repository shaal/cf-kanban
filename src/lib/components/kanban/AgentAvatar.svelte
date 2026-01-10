<script lang="ts">
	/**
	 * Agent Avatar Component
	 * GAP-UX.1: KanbanCard AI Status Indicators
	 *
	 * Displays an agent's avatar with type icon and optional status indicator.
	 * Supports different agent types with distinct visual representations.
	 */
	import { cn } from '$lib/utils';
	import * as Icons from 'lucide-svelte';
	import { getAgentIcon } from '$lib/types/ticket-agents';
	import { STATUS_COLORS } from '$lib/components/swarm/types';
	import type { AgentStatus } from '$lib/components/swarm/types';

	interface Props {
		/** Agent type (coder, tester, reviewer, etc.) */
		agentType: string;
		/** Optional agent name */
		agentName?: string;
		/** Current status for status dot */
		status?: AgentStatus;
		/** Size of the avatar */
		size?: 'xs' | 'sm' | 'md' | 'lg';
		/** Whether to show the status indicator */
		showStatus?: boolean;
		/** Whether to show a tooltip on hover */
		showTooltip?: boolean;
		/** Additional CSS classes */
		class?: string;
	}

	let {
		agentType,
		agentName,
		status = 'idle',
		size = 'sm',
		showStatus = true,
		showTooltip = true,
		class: className = ''
	}: Props = $props();

	// Size configurations
	const sizeConfig = {
		xs: {
			container: 'w-5 h-5',
			icon: 'w-3 h-3',
			statusDot: 'w-1.5 h-1.5 -bottom-0.5 -right-0.5',
			borderWidth: 'border'
		},
		sm: {
			container: 'w-6 h-6',
			icon: 'w-3.5 h-3.5',
			statusDot: 'w-2 h-2 -bottom-0.5 -right-0.5',
			borderWidth: 'border'
		},
		md: {
			container: 'w-8 h-8',
			icon: 'w-4 h-4',
			statusDot: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5',
			borderWidth: 'border-2'
		},
		lg: {
			container: 'w-10 h-10',
			icon: 'w-5 h-5',
			statusDot: 'w-3 h-3 -bottom-1 -right-1',
			borderWidth: 'border-2'
		}
	};

	// Agent type color configurations
	const agentTypeColors: Record<string, { bg: string; text: string; border: string }> = {
		coder: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
		tester: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
		reviewer: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
		researcher: { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200' },
		coordinator: { bg: 'bg-cyan-100', text: 'text-cyan-600', border: 'border-cyan-200' },
		planner: { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' },
		architect: { bg: 'bg-rose-100', text: 'text-rose-600', border: 'border-rose-200' },
		'security-auditor': { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200' },
		'performance-engineer': {
			bg: 'bg-orange-100',
			text: 'text-orange-600',
			border: 'border-orange-200'
		},
		'memory-specialist': { bg: 'bg-violet-100', text: 'text-violet-600', border: 'border-violet-200' },
		default: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' }
	};

	const sizes = $derived(sizeConfig[size]);
	const colors = $derived(agentTypeColors[agentType] || agentTypeColors.default);
	const iconName = $derived(getAgentIcon(agentType));
	const statusColor = $derived(STATUS_COLORS[status]);
	const displayName = $derived(agentName || agentType.charAt(0).toUpperCase() + agentType.slice(1));

	// Determine if status should pulse
	const shouldPulse = $derived(status === 'working' || status === 'learning');
</script>

<div
	class={cn('relative inline-flex', className)}
	title={showTooltip ? `${displayName} (${status})` : undefined}
	role="img"
	aria-label="{displayName} agent, status: {status}"
>
	<!-- Avatar container -->
	<div
		class={cn(
			'rounded-full flex items-center justify-center',
			colors.bg,
			colors.border,
			sizes.container,
			sizes.borderWidth
		)}
	>
		<!-- Agent type icon -->
		{#if iconName === 'Code'}
			<Icons.Code class={cn(colors.text, sizes.icon)} />
		{:else if iconName === 'TestTube'}
			<Icons.TestTube class={cn(colors.text, sizes.icon)} />
		{:else if iconName === 'Eye'}
			<Icons.Eye class={cn(colors.text, sizes.icon)} />
		{:else if iconName === 'Search'}
			<Icons.Search class={cn(colors.text, sizes.icon)} />
		{:else if iconName === 'Network'}
			<Icons.Network class={cn(colors.text, sizes.icon)} />
		{:else if iconName === 'Calendar'}
			<Icons.Calendar class={cn(colors.text, sizes.icon)} />
		{:else if iconName === 'Building2'}
			<Icons.Building2 class={cn(colors.text, sizes.icon)} />
		{:else if iconName === 'Shield'}
			<Icons.Shield class={cn(colors.text, sizes.icon)} />
		{:else if iconName === 'Gauge'}
			<Icons.Gauge class={cn(colors.text, sizes.icon)} />
		{:else if iconName === 'Brain'}
			<Icons.Brain class={cn(colors.text, sizes.icon)} />
		{:else}
			<Icons.Bot class={cn(colors.text, sizes.icon)} />
		{/if}
	</div>

	<!-- Status indicator dot -->
	{#if showStatus}
		<span
			class={cn(
				'absolute rounded-full border-2 border-white',
				sizes.statusDot,
				shouldPulse && 'animate-pulse'
			)}
			style="background-color: {statusColor}"
			aria-hidden="true"
		></span>
	{/if}
</div>

<style>
	@keyframes pulse {
		0%,
		100% {
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
