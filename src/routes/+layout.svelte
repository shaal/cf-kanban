<script lang="ts">
	/**
	 * Root Layout
	 * Includes global components like:
	 * - Command Palette (GAP-8.2)
	 * - Health Alert Toasts (GAP-3.5.2)
	 * - Onboarding/Interactive Tutorials (GAP-8.3)
	 * - AI Chat Assistant (GAP-8.1)
	 */
	import { onMount } from 'svelte';
	import '../app.css';
	import { CommandPalette } from '$lib/components/command';
	import { HealthAlertToasts } from '$lib/components/ui';
	import { WelcomeModal, GuidedTour, TourResumePrompt } from '$lib/components/onboarding';
	import { ChatAssistant, ChatButton } from '$lib/components/chat';
	import { onboardingStore } from '$lib/stores/onboarding';

	let { children } = $props();

	// Initialize onboarding on mount (checks localStorage for first visit)
	onMount(() => {
		onboardingStore.initialize();
	});
</script>

<!-- Global Command Palette (Cmd+K) -->
<CommandPalette />

<!-- GAP-3.5.2: Global Health Alert Toasts -->
<HealthAlertToasts position="top-right" autoDismissMs={8000} maxVisible={3} />

<!-- GAP-8.3: Onboarding Components -->
<WelcomeModal />
<GuidedTour />
<TourResumePrompt />

<!-- GAP-8.1: AI Chat Assistant -->
<ChatAssistant />
<ChatButton />

{@render children()}
