<script lang="ts">
	/**
	 * Guided Tour Component
	 * GAP-8.3: Interactive Tutorials
	 *
	 * Provides step-by-step feature highlights with:
	 * - Element highlighting with overlay
	 * - Tooltip positioning
	 * - Progress tracking
	 * - Navigation controls
	 * - Skip and exit options
	 */

	import { onMount, onDestroy, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { cn } from '$lib/utils';
	import {
		onboardingStore,
		isTourActive,
		currentStepIndex,
		selectedPath,
		getTourSteps,
		type TourStep
	} from '$lib/stores/onboarding';
	import {
		X,
		ChevronLeft,
		ChevronRight,
		Check,
		Circle,
		CircleCheck
	} from 'lucide-svelte';

	// State
	let tooltipRef = $state<HTMLDivElement | null>(null);
	let targetRect = $state<DOMRect | null>(null);
	let tooltipPosition = $state<{ top: number; left: number; arrowPosition: string }>({
		top: 0,
		left: 0,
		arrowPosition: 'top'
	});
	let isVisible = $state(false);

	// Derived state
	let steps = $derived(getTourSteps($selectedPath));
	let currentStep = $derived(steps[$currentStepIndex] as TourStep | undefined);
	let totalSteps = $derived(steps.length);
	let isFirstStep = $derived($currentStepIndex === 0);
	let isLastStep = $derived($currentStepIndex === totalSteps - 1);
	let progressPercentage = $derived(
		totalSteps > 0 ? (($currentStepIndex + 1) / totalSteps) * 100 : 0
	);

	// Find and highlight target element
	function findTargetElement(): HTMLElement | null {
		if (!currentStep?.target) return null;
		return document.querySelector(currentStep.target);
	}

	// Update tooltip position based on target element
	async function updatePosition() {
		await tick();

		const targetEl = findTargetElement();
		if (!targetEl || !tooltipRef) {
			isVisible = false;
			return;
		}

		const rect = targetEl.getBoundingClientRect();
		targetRect = rect;

		const tooltipWidth = 320;
		const tooltipHeight = tooltipRef.offsetHeight || 200;
		const padding = 16;
		const arrowOffset = 12;

		let top = 0;
		let left = 0;
		let arrowPosition = currentStep?.position || 'bottom';

		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		switch (currentStep?.position) {
			case 'top':
				top = rect.top - tooltipHeight - arrowOffset;
				left = rect.left + rect.width / 2 - tooltipWidth / 2;
				arrowPosition = 'bottom';
				break;
			case 'bottom':
				top = rect.bottom + arrowOffset;
				left = rect.left + rect.width / 2 - tooltipWidth / 2;
				arrowPosition = 'top';
				break;
			case 'left':
				top = rect.top + rect.height / 2 - tooltipHeight / 2;
				left = rect.left - tooltipWidth - arrowOffset;
				arrowPosition = 'right';
				break;
			case 'right':
				top = rect.top + rect.height / 2 - tooltipHeight / 2;
				left = rect.right + arrowOffset;
				arrowPosition = 'left';
				break;
		}

		// Boundary checks
		if (left < padding) left = padding;
		if (left + tooltipWidth > viewportWidth - padding) {
			left = viewportWidth - tooltipWidth - padding;
		}
		if (top < padding) {
			top = rect.bottom + arrowOffset;
			arrowPosition = 'top';
		}
		if (top + tooltipHeight > viewportHeight - padding) {
			top = rect.top - tooltipHeight - arrowOffset;
			arrowPosition = 'bottom';
		}

		tooltipPosition = { top, left, arrowPosition };
		isVisible = true;

		// Scroll target into view if needed
		targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}

	// Handle next step
	function handleNext() {
		if (isLastStep) {
			onboardingStore.complete();
		} else {
			onboardingStore.nextStep(totalSteps);
		}
	}

	// Handle previous step
	function handlePrev() {
		if (!isFirstStep) {
			onboardingStore.prevStep();
		}
	}

	// Handle skip
	function handleSkip() {
		onboardingStore.skip();
	}

	// Handle exit (pause tour)
	function handleExit() {
		onboardingStore.exitTour();
	}

	// Handle action button
	async function handleAction() {
		if (currentStep?.actionHref) {
			await goto(currentStep.actionHref);
			// Wait for navigation, then update position
			setTimeout(updatePosition, 300);
		}
		handleNext();
	}

	// Handle keyboard navigation
	function handleKeydown(event: KeyboardEvent) {
		if (!$isTourActive) return;

		switch (event.key) {
			case 'Escape':
				handleExit();
				break;
			case 'ArrowRight':
			case 'Enter':
				handleNext();
				break;
			case 'ArrowLeft':
				handlePrev();
				break;
		}
	}

	// Update position when step changes
	$effect(() => {
		if ($isTourActive && currentStep) {
			updatePosition();
		}
	});

	// Handle resize
	let resizeObserver: ResizeObserver | null = null;

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		window.addEventListener('resize', updatePosition);

		resizeObserver = new ResizeObserver(updatePosition);
		if (document.body) {
			resizeObserver.observe(document.body);
		}
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('keydown', handleKeydown);
			window.removeEventListener('resize', updatePosition);
		}
		resizeObserver?.disconnect();
	});

	// Get arrow class based on position
	function getArrowClass(position: string): string {
		switch (position) {
			case 'top':
				return 'before:absolute before:-top-2 before:left-1/2 before:-translate-x-1/2 before:border-8 before:border-transparent before:border-b-white';
			case 'bottom':
				return 'before:absolute before:-bottom-2 before:left-1/2 before:-translate-x-1/2 before:border-8 before:border-transparent before:border-t-white';
			case 'left':
				return 'before:absolute before:-left-2 before:top-1/2 before:-translate-y-1/2 before:border-8 before:border-transparent before:border-r-white';
			case 'right':
				return 'before:absolute before:-right-2 before:top-1/2 before:-translate-y-1/2 before:border-8 before:border-transparent before:border-l-white';
			default:
				return '';
		}
	}
</script>

{#if $isTourActive && currentStep}
	<!-- Overlay -->
	<div class="fixed inset-0 z-[100] pointer-events-none">
		<!-- Semi-transparent backdrop with hole for target -->
		<svg class="absolute inset-0 w-full h-full">
			<defs>
				<mask id="tour-mask">
					<rect x="0" y="0" width="100%" height="100%" fill="white" />
					{#if targetRect}
						<rect
							x={targetRect.left - 8}
							y={targetRect.top - 8}
							width={targetRect.width + 16}
							height={targetRect.height + 16}
							rx="8"
							fill="black"
						/>
					{/if}
				</mask>
			</defs>
			<rect
				x="0"
				y="0"
				width="100%"
				height="100%"
				fill="rgba(0, 0, 0, 0.5)"
				mask="url(#tour-mask)"
			/>
		</svg>

		<!-- Target highlight ring -->
		{#if targetRect}
			<div
				class="absolute border-2 border-blue-500 rounded-lg shadow-[0_0_0_4px_rgba(59,130,246,0.3)] transition-all duration-300"
				style="
					top: {targetRect.top - 8}px;
					left: {targetRect.left - 8}px;
					width: {targetRect.width + 16}px;
					height: {targetRect.height + 16}px;
				"
			/>
		{/if}

		<!-- Tooltip -->
		{#if isVisible}
			<div
				bind:this={tooltipRef}
				class={cn(
					'absolute z-[101] w-80 bg-white rounded-xl shadow-2xl pointer-events-auto transition-all duration-300',
					getArrowClass(tooltipPosition.arrowPosition)
				)}
				style="top: {tooltipPosition.top}px; left: {tooltipPosition.left}px;"
			>
				<!-- Header -->
				<div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
					<div class="flex items-center gap-2">
						<span class="text-xs font-medium text-gray-500">
							Step {$currentStepIndex + 1} of {totalSteps}
						</span>
					</div>
					<button
						type="button"
						class="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
						onclick={handleExit}
						aria-label="Exit tour"
					>
						<X class="h-4 w-4" />
					</button>
				</div>

				<!-- Content -->
				<div class="p-4">
					<h3 class="text-lg font-semibold text-gray-900 mb-2">
						{currentStep.title}
					</h3>
					<p class="text-sm text-gray-600 leading-relaxed">
						{currentStep.content}
					</p>
				</div>

				<!-- Progress dots -->
				<div class="flex items-center justify-center gap-1.5 py-3 border-t border-gray-100">
					{#each steps as step, index}
						<button
							type="button"
							class={cn(
								'w-2 h-2 rounded-full transition-all',
								index === $currentStepIndex
									? 'w-6 bg-blue-500'
									: index < $currentStepIndex
										? 'bg-blue-500'
										: 'bg-gray-200 hover:bg-gray-300'
							)}
							onclick={() => onboardingStore.goToStep(index)}
							aria-label={`Go to step ${index + 1}`}
						/>
					{/each}
				</div>

				<!-- Footer actions -->
				<div class="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-b-xl">
					<div class="flex items-center gap-2">
						{#if !isFirstStep}
							<button
								type="button"
								class="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
								onclick={handlePrev}
							>
								<ChevronLeft class="h-4 w-4" />
								Back
							</button>
						{:else}
							<button
								type="button"
								class="text-sm text-gray-500 hover:text-gray-700 transition-colors"
								onclick={handleSkip}
							>
								Skip tour
							</button>
						{/if}
					</div>

					<div class="flex items-center gap-2">
						{#if currentStep.action}
							<button
								type="button"
								class="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
								onclick={handleAction}
							>
								{currentStep.action}
							</button>
						{/if}
						<button
							type="button"
							class={cn(
								'inline-flex items-center gap-1 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors',
								isLastStep
									? 'bg-green-600 text-white hover:bg-green-700'
									: 'bg-blue-600 text-white hover:bg-blue-700'
							)}
							onclick={handleNext}
						>
							{#if isLastStep}
								<Check class="h-4 w-4" />
								Finish
							{:else}
								Next
								<ChevronRight class="h-4 w-4" />
							{/if}
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}
