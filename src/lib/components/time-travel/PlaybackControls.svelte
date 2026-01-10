<script lang="ts">
  /**
   * GAP-UX.2: Playback Controls Component
   *
   * Provides controls for navigating and auto-playing through the timeline.
   * Includes prev/next, play/pause, speed controls, and progress indicator.
   */
  import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Rewind,
    FastForward,
    ChevronFirst,
    ChevronLast
  } from 'lucide-svelte';
  import { Button } from '$lib/components/ui';
  import { cn } from '$lib/utils';
  import type { PlaybackState } from '$lib/types/time-travel';

  interface Props {
    currentIndex: number;
    totalEvents: number;
    playbackState: PlaybackState;
    onPrev: () => void;
    onNext: () => void;
    onFirst: () => void;
    onLast: () => void;
    onTogglePlay: () => void;
    onSpeedChange: (speed: number) => void;
    disabled?: boolean;
    class?: string;
  }

  let {
    currentIndex,
    totalEvents,
    playbackState,
    onPrev,
    onNext,
    onFirst,
    onLast,
    onTogglePlay,
    onSpeedChange,
    disabled = false,
    class: className = ''
  }: Props = $props();

  const speedOptions = [0.5, 1, 1.5, 2, 3];

  let progress = $derived(totalEvents > 0 ? ((currentIndex + 1) / totalEvents) * 100 : 0);
  let isAtStart = $derived(currentIndex <= 0);
  let isAtEnd = $derived(currentIndex >= totalEvents - 1);

  function handleKeyDown(event: KeyboardEvent) {
    if (disabled) return;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        if (!isAtStart) onPrev();
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (!isAtEnd) onNext();
        break;
      case ' ':
        event.preventDefault();
        onTogglePlay();
        break;
      case 'Home':
        event.preventDefault();
        onFirst();
        break;
      case 'End':
        event.preventDefault();
        onLast();
        break;
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<div
  class={cn(
    'playback-controls bg-white border border-gray-200 rounded-lg p-4',
    disabled && 'opacity-50 pointer-events-none',
    className
  )}
>
  <!-- Progress bar -->
  <div class="mb-4">
    <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
      <span>Event {currentIndex + 1} of {totalEvents}</span>
      <span>{progress.toFixed(0)}%</span>
    </div>
    <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        class="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
        style="width: {progress}%"
      ></div>
    </div>
  </div>

  <!-- Main controls -->
  <div class="flex items-center justify-center gap-2">
    <!-- First -->
    <Button
      variant="ghost"
      size="icon"
      onclick={onFirst}
      disabled={isAtStart}
      class="h-9 w-9"
      title="Go to first event (Home)"
    >
      <ChevronFirst class="w-4 h-4" />
    </Button>

    <!-- Previous -->
    <Button
      variant="ghost"
      size="icon"
      onclick={onPrev}
      disabled={isAtStart}
      class="h-9 w-9"
      title="Previous event (Left arrow)"
    >
      <SkipBack class="w-4 h-4" />
    </Button>

    <!-- Play/Pause -->
    <Button
      variant={playbackState.isPlaying ? 'secondary' : 'default'}
      size="icon"
      onclick={onTogglePlay}
      class="h-12 w-12"
      title={playbackState.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
    >
      {#if playbackState.isPlaying}
        <Pause class="w-5 h-5" />
      {:else}
        <Play class="w-5 h-5 ml-0.5" />
      {/if}
    </Button>

    <!-- Next -->
    <Button
      variant="ghost"
      size="icon"
      onclick={onNext}
      disabled={isAtEnd}
      class="h-9 w-9"
      title="Next event (Right arrow)"
    >
      <SkipForward class="w-4 h-4" />
    </Button>

    <!-- Last -->
    <Button
      variant="ghost"
      size="icon"
      onclick={onLast}
      disabled={isAtEnd}
      class="h-9 w-9"
      title="Go to last event (End)"
    >
      <ChevronLast class="w-4 h-4" />
    </Button>
  </div>

  <!-- Speed controls -->
  <div class="mt-4 flex items-center justify-center gap-2">
    <span class="text-xs text-gray-500 mr-2">Speed:</span>
    <div class="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {#each speedOptions as speed}
        <button
          type="button"
          class={cn(
            'px-2 py-1 text-xs font-medium rounded-md transition-colors',
            playbackState.speed === speed
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
          onclick={() => onSpeedChange(speed)}
        >
          {speed}x
        </button>
      {/each}
    </div>
  </div>

  <!-- Keyboard shortcuts hint -->
  <div class="mt-3 text-center">
    <p class="text-xs text-gray-400">
      Use arrow keys to navigate, Space to play/pause
    </p>
  </div>
</div>
