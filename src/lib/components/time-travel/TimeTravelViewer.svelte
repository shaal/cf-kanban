<script lang="ts">
  /**
   * GAP-UX.2: TimeTravelViewer Component
   *
   * Main component for the time travel decision replay feature.
   * Allows users to navigate through ticket history, view snapshots,
   * and replay the decision-making process.
   */
  import {
    History,
    Filter,
    Search,
    X,
    RefreshCw,
    Download,
    GitBranch,
    ChevronDown
  } from 'lucide-svelte';
  import { Button, Card, Input, Badge } from '$lib/components/ui';
  import { cn } from '$lib/utils';
  import Timeline from './Timeline.svelte';
  import SnapshotViewer from './SnapshotViewer.svelte';
  import DecisionAnnotation from './DecisionAnnotation.svelte';
  import PlaybackControls from './PlaybackControls.svelte';
  import type {
    TimelineEvent,
    TimelineEventType,
    TicketSnapshot,
    TimeTravelFilters,
    PlaybackState,
    DecisionAnnotation as DecisionAnnotationType,
    DEFAULT_PLAYBACK_STATE,
    DEFAULT_FILTERS,
    EVENT_TYPE_CONFIG
  } from '$lib/types/time-travel';

  interface Props {
    ticketId: string;
    ticketTitle: string;
    projectName: string;
    events: TimelineEvent[];
    currentSnapshot: TicketSnapshot | null;
    decisions?: DecisionAnnotationType[];
    onSnapshotChange?: (snapshot: TicketSnapshot | null) => void;
    class?: string;
  }

  let {
    ticketId,
    ticketTitle,
    projectName,
    events,
    currentSnapshot: initialSnapshot,
    decisions = [],
    onSnapshotChange,
    class: className = ''
  }: Props = $props();

  // State
  let selectedIndex = $state(events.length - 1);
  let currentSnapshot = $state<TicketSnapshot | null>(initialSnapshot);
  let playbackState = $state<PlaybackState>({
    isPlaying: false,
    speed: 1,
    direction: 'forward',
    pauseOnTypes: ['decision_made', 'agent_recommendation', 'user_feedback']
  });
  let filters = $state<TimeTravelFilters>({
    eventTypes: [],
    dateRange: { start: null, end: null },
    triggeredBy: [],
    searchQuery: ''
  });
  let showFilters = $state(false);
  let showDecisions = $state(false);

  // Playback interval
  let playbackInterval: ReturnType<typeof setInterval> | null = null;

  // Event types for filter
  const eventTypeOptions: { value: TimelineEventType; label: string }[] = [
    { value: 'status_change', label: 'Status Changes' },
    { value: 'agent_assignment', label: 'Agent Assignments' },
    { value: 'agent_recommendation', label: 'Recommendations' },
    { value: 'user_feedback', label: 'User Feedback' },
    { value: 'question_asked', label: 'Questions Asked' },
    { value: 'question_answered', label: 'Questions Answered' },
    { value: 'swarm_initialized', label: 'Swarm Started' },
    { value: 'swarm_terminated', label: 'Swarm Ended' },
    { value: 'checkpoint_created', label: 'Checkpoints' },
    { value: 'pattern_stored', label: 'Patterns Stored' },
    { value: 'decision_made', label: 'Decisions Made' }
  ];

  // Compute current event
  let currentEvent = $derived(events[selectedIndex] || null);

  // Update snapshot when selection changes
  $effect(() => {
    if (currentEvent?.snapshot) {
      currentSnapshot = currentEvent.snapshot;
      onSnapshotChange?.(currentSnapshot);
    }
  });

  // Playback effect
  $effect(() => {
    if (playbackState.isPlaying) {
      const intervalMs = 2000 / playbackState.speed;
      playbackInterval = setInterval(() => {
        if (playbackState.direction === 'forward') {
          if (selectedIndex < events.length - 1) {
            const nextEvent = events[selectedIndex + 1];
            // Check if we should pause on this event type
            if (
              playbackState.pauseOnTypes.includes(nextEvent.eventType)
            ) {
              playbackState.isPlaying = false;
            } else {
              selectedIndex++;
            }
          } else {
            playbackState.isPlaying = false;
          }
        } else {
          if (selectedIndex > 0) {
            selectedIndex--;
          } else {
            playbackState.isPlaying = false;
          }
        }
      }, intervalMs);
    }

    return () => {
      if (playbackInterval) {
        clearInterval(playbackInterval);
        playbackInterval = null;
      }
    };
  });

  // Navigation handlers
  function handleSelectEvent(index: number) {
    selectedIndex = index;
    playbackState.isPlaying = false;
  }

  function handlePrev() {
    if (selectedIndex > 0) {
      selectedIndex--;
    }
  }

  function handleNext() {
    if (selectedIndex < events.length - 1) {
      selectedIndex++;
    }
  }

  function handleFirst() {
    selectedIndex = 0;
  }

  function handleLast() {
    selectedIndex = events.length - 1;
  }

  function handleTogglePlay() {
    playbackState.isPlaying = !playbackState.isPlaying;
  }

  function handleSpeedChange(speed: number) {
    playbackState.speed = speed;
  }

  // Filter handlers
  function toggleEventTypeFilter(type: TimelineEventType) {
    if (filters.eventTypes.includes(type)) {
      filters.eventTypes = filters.eventTypes.filter(t => t !== type);
    } else {
      filters.eventTypes = [...filters.eventTypes, type];
    }
  }

  function clearFilters() {
    filters = {
      eventTypes: [],
      dateRange: { start: null, end: null },
      triggeredBy: [],
      searchQuery: ''
    };
  }

  // Export handler
  function handleExport() {
    const data = {
      ticketId,
      ticketTitle,
      projectName,
      events,
      decisions,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-travel-${ticketId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class={cn('time-travel-viewer h-full flex flex-col bg-gray-50', className)}>
  <!-- Header -->
  <div class="bg-white border-b border-gray-200 px-4 py-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
          <History class="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 class="font-semibold text-gray-900">{ticketTitle}</h1>
          <p class="text-xs text-gray-500">{projectName} - {events.length} events</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Filter toggle -->
        <Button
          variant={showFilters ? 'secondary' : 'ghost'}
          size="sm"
          onclick={() => (showFilters = !showFilters)}
        >
          <Filter class="w-4 h-4 mr-1" />
          Filters
          {#if filters.eventTypes.length > 0 || filters.searchQuery}
            <Badge class="ml-1 h-5 px-1.5">{filters.eventTypes.length || 1}</Badge>
          {/if}
        </Button>

        <!-- Decisions toggle -->
        {#if decisions.length > 0}
          <Button
            variant={showDecisions ? 'secondary' : 'ghost'}
            size="sm"
            onclick={() => (showDecisions = !showDecisions)}
          >
            <GitBranch class="w-4 h-4 mr-1" />
            Decisions
            <Badge class="ml-1 h-5 px-1.5">{decisions.length}</Badge>
          </Button>
        {/if}

        <!-- Export -->
        <Button variant="ghost" size="sm" onclick={handleExport}>
          <Download class="w-4 h-4 mr-1" />
          Export
        </Button>
      </div>
    </div>

    <!-- Filter panel -->
    {#if showFilters}
      <div class="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-medium text-gray-700">Filter Events</span>
          {#if filters.eventTypes.length > 0 || filters.searchQuery}
            <button
              type="button"
              class="text-xs text-blue-600 hover:text-blue-800"
              onclick={clearFilters}
            >
              Clear all
            </button>
          {/if}
        </div>

        <!-- Search -->
        <div class="relative mb-3">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search events..."
            class="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            bind:value={filters.searchQuery}
          />
          {#if filters.searchQuery}
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2"
              onclick={() => (filters.searchQuery = '')}
            >
              <X class="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          {/if}
        </div>

        <!-- Event type filters -->
        <div class="flex flex-wrap gap-2">
          {#each eventTypeOptions as option}
            <button
              type="button"
              class={cn(
                'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors',
                filters.eventTypes.includes(option.value)
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              )}
              onclick={() => toggleEventTypeFilter(option.value)}
            >
              {option.label}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- Main content -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Timeline panel -->
    <div class="w-96 border-r border-gray-200 bg-white flex flex-col">
      <div class="px-4 py-3 border-b border-gray-100">
        <h2 class="text-sm font-medium text-gray-700">Timeline</h2>
      </div>
      <div class="flex-1 overflow-hidden p-4">
        <Timeline
          {events}
          selectedIndex={selectedIndex}
          onSelect={handleSelectEvent}
          filters={{ eventTypes: filters.eventTypes, searchQuery: filters.searchQuery }}
          class="h-full"
        />
      </div>
    </div>

    <!-- Center panel: Snapshot & Decisions -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Snapshot viewer -->
      <div class="flex-1 p-4 overflow-auto">
        <SnapshotViewer snapshot={currentSnapshot} class="h-full" />
      </div>

      <!-- Decisions panel (collapsible) -->
      {#if showDecisions && decisions.length > 0}
        <div class="border-t border-gray-200 bg-white max-h-80 overflow-auto">
          <div class="px-4 py-3 border-b border-gray-100 sticky top-0 bg-white">
            <h2 class="text-sm font-medium text-gray-700">Decisions at this point</h2>
          </div>
          <div class="p-4 space-y-3">
            {#each decisions.filter(d =>
              currentEvent && new Date(d.timestamp) <= new Date(currentEvent.timestamp)
            ).slice(-3) as decision}
              <DecisionAnnotation {decision} />
            {/each}
          </div>
        </div>
      {/if}

      <!-- Playback controls -->
      <div class="border-t border-gray-200 p-4 bg-white">
        <PlaybackControls
          currentIndex={selectedIndex}
          totalEvents={events.length}
          {playbackState}
          onPrev={handlePrev}
          onNext={handleNext}
          onFirst={handleFirst}
          onLast={handleLast}
          onTogglePlay={handleTogglePlay}
          onSpeedChange={handleSpeedChange}
          disabled={events.length === 0}
        />
      </div>
    </div>
  </div>
</div>

<style>
  .time-travel-viewer {
    min-height: 500px;
  }
</style>
