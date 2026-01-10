<script lang="ts">
	/**
	 * Welcome Modal Component
	 * GAP-8.3: Interactive Tutorials
	 *
	 * Displays on first visit with multiple onboarding paths:
	 * - Quick Start: Essential features only
	 * - Full Tour: Comprehensive walkthrough
	 * - Ask Claude: Open command palette to search
	 * - Read Docs: External documentation link
	 */

	import { Dialog } from 'bits-ui';
	import { cn } from '$lib/utils';
	import {
		onboardingStore,
		showWelcomeModal,
		type OnboardingPath
	} from '$lib/stores/onboarding';
	import {
		Rocket,
		Map,
		MessageCircle,
		BookOpen,
		Sparkles,
		X,
		Clock,
		ChevronRight
	} from 'lucide-svelte';
	import { toggleCommandPalette } from '$lib/stores/command-palette';

	// Path option configuration
	interface PathOption {
		id: OnboardingPath;
		title: string;
		description: string;
		icon: typeof Rocket;
		color: string;
		bgColor: string;
		duration?: string;
	}

	const pathOptions: PathOption[] = [
		{
			id: 'quick-start',
			title: 'Quick Start',
			description: 'Learn the essentials in 3 quick steps',
			icon: Rocket,
			color: 'text-green-600',
			bgColor: 'bg-green-50 hover:bg-green-100',
			duration: '1 min'
		},
		{
			id: 'full-tour',
			title: 'Full Tour',
			description: 'Explore all features with a guided walkthrough',
			icon: Map,
			color: 'text-blue-600',
			bgColor: 'bg-blue-50 hover:bg-blue-100',
			duration: '5 min'
		},
		{
			id: 'ask-claude',
			title: 'Ask Claude',
			description: 'Search for anything with the command palette',
			icon: MessageCircle,
			color: 'text-purple-600',
			bgColor: 'bg-purple-50 hover:bg-purple-100'
		},
		{
			id: 'read-docs',
			title: 'Read Docs',
			description: 'Dive into the documentation',
			icon: BookOpen,
			color: 'text-amber-600',
			bgColor: 'bg-amber-50 hover:bg-amber-100'
		}
	];

	// Handle path selection
	function handleSelectPath(path: OnboardingPath) {
		if (path === 'ask-claude') {
			onboardingStore.closeWelcomeModal();
			onboardingStore.complete();
			// Small delay to let modal close, then open command palette
			setTimeout(() => toggleCommandPalette(), 200);
		} else if (path === 'read-docs') {
			onboardingStore.complete();
			window.open('https://github.com/ruvnet/claude-flow', '_blank');
		} else if (path === 'quick-start' || path === 'full-tour') {
			onboardingStore.startTour(path);
		}
	}

	// Handle skip
	function handleSkip() {
		onboardingStore.skip();
	}

	// Handle remind later
	function handleRemindLater() {
		onboardingStore.remindLater(24);
	}
</script>

<Dialog.Root
	bind:open={$showWelcomeModal}
	onOpenChange={(open) => {
		if (!open) onboardingStore.closeWelcomeModal();
	}}
>
	<Dialog.Portal>
		<Dialog.Overlay
			class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
		/>
		<Dialog.Content
			class="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-2xl border border-gray-200 bg-white shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
		>
			<!-- Header -->
			<div class="relative p-6 pb-4 text-center border-b border-gray-100">
				<!-- Decorative gradient background -->
				<div
					class="absolute inset-0 overflow-hidden rounded-t-2xl"
					aria-hidden="true"
				>
					<div class="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full opacity-50 blur-3xl" />
					<div class="absolute -top-10 -left-10 w-32 h-32 bg-gradient-to-br from-green-100 to-blue-100 rounded-full opacity-50 blur-3xl" />
				</div>

				<!-- Close button -->
				<button
					type="button"
					class="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
					onclick={handleSkip}
				>
					<X class="h-5 w-5" />
				</button>

				<!-- Logo and title -->
				<div class="relative">
					<div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
						<Sparkles class="h-8 w-8 text-white" />
					</div>
					<Dialog.Title class="text-2xl font-bold text-gray-900">
						Welcome to CF-Kanban
					</Dialog.Title>
					<Dialog.Description class="mt-2 text-gray-600">
						Your AI-powered project management system. How would you like to get started?
					</Dialog.Description>
				</div>
			</div>

			<!-- Path Options -->
			<div class="p-6 space-y-3">
				{#each pathOptions as option}
					{@const IconComponent = option.icon}
					<button
						type="button"
						class={cn(
							'w-full flex items-center gap-4 p-4 rounded-xl border border-transparent transition-all',
							option.bgColor,
							'group'
						)}
						onclick={() => handleSelectPath(option.id)}
					>
						<div class={cn(
							'flex items-center justify-center w-12 h-12 rounded-xl bg-white shadow-sm',
							option.color
						)}>
							<IconComponent class="h-6 w-6" />
						</div>
						<div class="flex-1 text-left">
							<div class="flex items-center gap-2">
								<span class="font-semibold text-gray-900">{option.title}</span>
								{#if option.duration}
									<span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
										<Clock class="h-3 w-3" />
										{option.duration}
									</span>
								{/if}
							</div>
							<p class="text-sm text-gray-600 mt-0.5">{option.description}</p>
						</div>
						<ChevronRight class="h-5 w-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" />
					</button>
				{/each}
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
				<button
					type="button"
					class="text-sm text-gray-500 hover:text-gray-700 transition-colors"
					onclick={handleRemindLater}
				>
					Remind me later
				</button>
				<button
					type="button"
					class="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
					onclick={handleSkip}
				>
					Skip intro
				</button>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
