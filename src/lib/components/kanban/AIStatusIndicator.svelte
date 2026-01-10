<script lang="ts">
	/**
	 * AI Status Indicator Component
	 * GAP-UX.1: KanbanCard AI Status Indicators
	 *
	 * Animated status indicator showing working/thinking/blocked states
	 * with visual feedback for AI agent activity.
	 */
	import { cn } from '$lib/utils';
	import type { AgentStatus } from '$lib/components/swarm/types';

	interface Props {
		status: AgentStatus;
		size?: 'xs' | 'sm' | 'md' | 'lg';
		showLabel?: boolean;
		class?: string;
	}

	let { status, size = 'sm', showLabel = false, class: className = '' }: Props = $props();

	// Status configuration with colors and animation types
	const statusConfig: Record<
		AgentStatus,
		{
			color: string;
			bgColor: string;
			borderColor: string;
			label: string;
			animation: string;
			icon: string;
		}
	> = {
		idle: {
			color: 'text-gray-500',
			bgColor: 'bg-gray-100',
			borderColor: 'border-gray-300',
			label: 'Idle',
			animation: '',
			icon: 'pause'
		},
		working: {
			color: 'text-blue-600',
			bgColor: 'bg-blue-100',
			borderColor: 'border-blue-400',
			label: 'Working',
			animation: 'animate-working',
			icon: 'cog'
		},
		blocked: {
			color: 'text-red-600',
			bgColor: 'bg-red-100',
			borderColor: 'border-red-400',
			label: 'Blocked',
			animation: 'animate-blocked',
			icon: 'stop'
		},
		learning: {
			color: 'text-amber-600',
			bgColor: 'bg-amber-100',
			borderColor: 'border-amber-400',
			label: 'Learning',
			animation: 'animate-thinking',
			icon: 'brain'
		},
		error: {
			color: 'text-red-700',
			bgColor: 'bg-red-200',
			borderColor: 'border-red-500',
			label: 'Error',
			animation: 'animate-error',
			icon: 'alert'
		}
	};

	// Size configurations
	const sizeConfig = {
		xs: { container: 'w-4 h-4', icon: 'w-2 h-2', text: 'text-[10px]', gap: 'gap-0.5' },
		sm: { container: 'w-5 h-5', icon: 'w-2.5 h-2.5', text: 'text-xs', gap: 'gap-1' },
		md: { container: 'w-6 h-6', icon: 'w-3 h-3', text: 'text-sm', gap: 'gap-1.5' },
		lg: { container: 'w-8 h-8', icon: 'w-4 h-4', text: 'text-base', gap: 'gap-2' }
	};

	const config = $derived(statusConfig[status]);
	const sizes = $derived(sizeConfig[size]);
</script>

<div
	class={cn('inline-flex items-center', sizes.gap, className)}
	role="status"
	aria-label="{config.label} status"
>
	<!-- Animated status indicator -->
	<div
		class={cn(
			'relative rounded-full border-2 flex items-center justify-center',
			config.bgColor,
			config.borderColor,
			sizes.container,
			config.animation
		)}
	>
		<!-- Inner icon/indicator -->
		{#if status === 'working'}
			<!-- Spinning cog for working -->
			<svg
				class={cn('animate-spin', config.color, sizes.icon)}
				fill="none"
				viewBox="0 0 24 24"
				xmlns="http://www.w3.org/2000/svg"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
		{:else if status === 'learning'}
			<!-- Pulsing brain for thinking/learning -->
			<div class={cn('rounded-full', config.color, sizes.icon, 'animate-pulse bg-current')}></div>
		{:else if status === 'blocked'}
			<!-- Static stop indicator -->
			<div class={cn('rounded-sm', sizes.icon, 'bg-red-500')}></div>
		{:else if status === 'error'}
			<!-- Alert triangle -->
			<svg class={cn(config.color, sizes.icon)} fill="currentColor" viewBox="0 0 20 20">
				<path
					fill-rule="evenodd"
					d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
					clip-rule="evenodd"
				/>
			</svg>
		{:else}
			<!-- Idle indicator -->
			<div class={cn('rounded-full bg-gray-400', sizes.icon)}></div>
		{/if}
	</div>

	<!-- Optional label -->
	{#if showLabel}
		<span class={cn('font-medium', config.color, sizes.text)}>
			{config.label}
		</span>
	{/if}
</div>

<style>
	/* Working animation - gentle pulse */
	@keyframes working-pulse {
		0%,
		100% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(1.05);
			opacity: 0.9;
		}
	}

	.animate-working {
		animation: working-pulse 1.5s ease-in-out infinite;
	}

	/* Thinking animation - slower pulse with glow */
	@keyframes thinking {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4);
		}
		50% {
			box-shadow: 0 0 0 4px rgba(251, 191, 36, 0);
		}
	}

	.animate-thinking {
		animation: thinking 2s ease-in-out infinite;
	}

	/* Blocked animation - attention-grabbing pulse */
	@keyframes blocked-pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.6;
		}
	}

	.animate-blocked {
		animation: blocked-pulse 1s ease-in-out infinite;
	}

	/* Error animation - shake */
	@keyframes error-shake {
		0%,
		100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(-2px);
		}
		75% {
			transform: translateX(2px);
		}
	}

	.animate-error {
		animation: error-shake 0.5s ease-in-out;
	}
</style>
