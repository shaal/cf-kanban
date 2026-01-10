<script lang="ts">
	/**
	 * Tour Resume Prompt Component
	 * GAP-8.3: Interactive Tutorials
	 *
	 * Shows a subtle prompt when user has an incomplete tour,
	 * allowing them to resume or dismiss it.
	 */

	import { cn } from '$lib/utils';
	import {
		onboardingStore,
		hasResumableTour,
		tourProgress
	} from '$lib/stores/onboarding';
	import { Play, X, RotateCcw } from 'lucide-svelte';

	let isVisible = $state(true);

	// Handle resume
	function handleResume() {
		onboardingStore.resumeTour();
	}

	// Handle dismiss (just hide, don't complete)
	function handleDismiss() {
		isVisible = false;
	}

	// Handle restart
	function handleRestart() {
		if ($tourProgress?.path) {
			onboardingStore.startTour($tourProgress.path);
		}
	}
</script>

{#if $hasResumableTour && isVisible}
	<div
		class="fixed bottom-4 left-4 z-40 flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl shadow-lg animate-in slide-in-from-bottom-4 fade-in duration-300"
	>
		<div class="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
			<Play class="h-5 w-5 text-blue-600" />
		</div>

		<div class="flex-1">
			<p class="text-sm font-medium text-gray-900">Continue your tour?</p>
			<p class="text-xs text-gray-500">
				{#if $tourProgress}
					Step {$tourProgress.currentStepIndex + 1} - {$tourProgress.path === 'quick-start' ? 'Quick Start' : 'Full Tour'}
				{/if}
			</p>
		</div>

		<div class="flex items-center gap-2">
			<button
				type="button"
				class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
				onclick={handleRestart}
				aria-label="Restart tour"
				title="Restart tour"
			>
				<RotateCcw class="h-4 w-4" />
			</button>
			<button
				type="button"
				class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
				onclick={handleResume}
			>
				Resume
			</button>
			<button
				type="button"
				class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
				onclick={handleDismiss}
				aria-label="Dismiss"
			>
				<X class="h-4 w-4" />
			</button>
		</div>
	</div>
{/if}
