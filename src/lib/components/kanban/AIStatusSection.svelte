<script lang="ts">
	/**
	 * AI Status Section Component
	 * GAP-UX.1: KanbanCard AI Status Indicators
	 *
	 * Composite component that displays all AI status indicators in a compact layout.
	 * Combines: AIStatusIndicator, ConfidenceMeter, KnowledgeRing, AgentAvatar
	 */
	import { cn } from '$lib/utils';
	import AIStatusIndicator from './AIStatusIndicator.svelte';
	import ConfidenceMeter from './ConfidenceMeter.svelte';
	import KnowledgeRing from './KnowledgeRing.svelte';
	import AgentAvatar from './AgentAvatar.svelte';
	import type { AgentStatus } from '$lib/components/swarm/types';

	interface AIStatusData {
		/** Current AI status */
		status: AgentStatus;
		/** Confidence level (0-100) */
		confidence?: number;
		/** Knowledge/familiarity level (0-100) */
		knowledge?: number;
		/** Assigned agent type */
		agentType?: string;
		/** Agent name (optional) */
		agentName?: string;
		/** Current task being performed */
		currentTask?: string;
	}

	interface Props {
		/** AI status data */
		data: AIStatusData;
		/** Display variant */
		variant?: 'compact' | 'full' | 'minimal';
		/** Size of all indicators */
		size?: 'xs' | 'sm' | 'md';
		/** Additional CSS classes */
		class?: string;
	}

	let { data, variant = 'compact', size = 'xs', class: className = '' }: Props = $props();

	// Determine what to show based on variant
	const showAgent = $derived(variant !== 'minimal' && data.agentType);
	const showConfidence = $derived(variant !== 'minimal' && data.confidence !== undefined);
	const showKnowledge = $derived(variant === 'full' && data.knowledge !== undefined);
	const showTask = $derived(variant === 'full' && data.currentTask);

	// Container size classes
	const containerClasses = {
		minimal: 'gap-1',
		compact: 'gap-1.5',
		full: 'gap-2'
	};
</script>

{#if data.status !== 'idle' || data.agentType}
	<div
		class={cn(
			'flex items-center flex-wrap rounded-md bg-gray-50/80 px-1.5 py-1 border border-gray-100',
			containerClasses[variant],
			className
		)}
		role="group"
		aria-label="AI Status"
	>
		<!-- Agent Avatar (when assigned) -->
		{#if showAgent && data.agentType}
			<AgentAvatar
				agentType={data.agentType}
				agentName={data.agentName}
				status={data.status}
				{size}
				showStatus={variant === 'compact' || variant === 'full'}
			/>
		{:else}
			<!-- Status indicator without agent -->
			<AIStatusIndicator status={data.status} {size} showLabel={variant === 'full'} />
		{/if}

		<!-- Status indicator (when not showing in avatar) -->
		{#if showAgent && variant === 'full'}
			<AIStatusIndicator status={data.status} {size} showLabel={true} />
		{/if}

		<!-- Confidence Meter -->
		{#if showConfidence && data.confidence !== undefined}
			<ConfidenceMeter
				confidence={data.confidence}
				{size}
				variant={variant === 'full' ? 'bar' : 'compact'}
				showLabel={true}
			/>
		{/if}

		<!-- Knowledge Ring -->
		{#if showKnowledge && data.knowledge !== undefined}
			<KnowledgeRing knowledge={data.knowledge} {size} showValue={true} thickness="thin" />
		{/if}

		<!-- Current Task (full variant only) -->
		{#if showTask && data.currentTask}
			<span
				class={cn(
					'text-gray-500 truncate max-w-[120px]',
					size === 'xs' ? 'text-[9px]' : size === 'sm' ? 'text-[10px]' : 'text-xs'
				)}
				title={data.currentTask}
			>
				{data.currentTask}
			</span>
		{/if}
	</div>
{/if}
