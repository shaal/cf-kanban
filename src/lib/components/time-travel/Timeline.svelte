<script lang="ts">
  /**
   * GAP-UX.2: Timeline Component
   *
   * Visualizes the chronological history of ticket events as an
   * interactive timeline. Supports selection, filtering, and navigation.
   */
  import {
    ArrowRight,
    Bot,
    Sparkles,
    MessageSquare,
    HelpCircle,
    CheckCircle,
    Play,
    Square,
    Save,
    GitBranch,
    GitCommit,
    Plus,
    Edit
  } from 'lucide-svelte';
  import { cn } from '$lib/utils';
  import type { TimelineEvent, TimelineEventType, EVENT_TYPE_CONFIG } from '$lib/types/time-travel';

  interface Props {
    events: TimelineEvent[];
    selectedIndex: number;
    onSelect: (index: number) => void;
    filters?: {
      eventTypes: TimelineEventType[];
      searchQuery: string;
    };
    class?: string;
  }

  let {
    events,
    selectedIndex,
    onSelect,
    filters = { eventTypes: [], searchQuery: '' },
    class: className = ''
  }: Props = $props();

  // Icon mapping for event types
  const iconMap: Record<TimelineEventType, typeof ArrowRight> = {
    status_change: ArrowRight,
    agent_assignment: Bot,
    agent_recommendation: Sparkles,
    user_feedback: MessageSquare,
    question_asked: HelpCircle,
    question_answered: CheckCircle,
    swarm_initialized: Play,
    swarm_terminated: Square,
    checkpoint_created: Save,
    pattern_stored: GitBranch,
    decision_made: GitCommit,
    ticket_created: Plus,
    ticket_updated: Edit
  };

  // Color mapping for event types
  const colorMap: Record<TimelineEventType, string> = {
    status_change: 'bg-blue-500',
    agent_assignment: 'bg-purple-500',
    agent_recommendation: 'bg-indigo-500',
    user_feedback: 'bg-green-500',
    question_asked: 'bg-amber-500',
    question_answered: 'bg-emerald-500',
    swarm_initialized: 'bg-cyan-500',
    swarm_terminated: 'bg-slate-500',
    checkpoint_created: 'bg-orange-500',
    pattern_stored: 'bg-pink-500',
    decision_made: 'bg-violet-500',
    ticket_created: 'bg-teal-500',
    ticket_updated: 'bg-sky-500'
  };

  // Filter events based on criteria
  let filteredEvents = $derived.by(() => {
    let result = events;

    if (filters.eventTypes.length > 0) {
      result = result.filter(e => filters.eventTypes.includes(e.eventType));
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(
        e =>
          e.description.toLowerCase().includes(query) ||
          e.triggeredBy.toLowerCase().includes(query)
      );
    }

    return result;
  });

  // Find the actual index in filtered events
  function getFilteredIndex(originalIndex: number): number {
    if (filters.eventTypes.length === 0 && !filters.searchQuery) {
      return originalIndex;
    }
    const originalEvent = events[originalIndex];
    return filteredEvents.findIndex(e => e.id === originalEvent?.id);
  }

  // Get original index from filtered index
  function getOriginalIndex(filteredIndex: number): number {
    const filteredEvent = filteredEvents[filteredIndex];
    return events.findIndex(e => e.id === filteredEvent?.id);
  }

  function formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // Group events by date for display
  let groupedEvents = $derived.by(() => {
    const groups: Map<string, { date: Date; events: { event: TimelineEvent; originalIndex: number }[] }> = new Map();

    filteredEvents.forEach((event) => {
      const dateKey = formatDate(event.timestamp);
      const originalIndex = events.findIndex(e => e.id === event.id);

      if (!groups.has(dateKey)) {
        groups.set(dateKey, { date: event.timestamp, events: [] });
      }
      groups.get(dateKey)!.events.push({ event, originalIndex });
    });

    return Array.from(groups.values());
  });

  function handleEventClick(originalIndex: number) {
    onSelect(originalIndex);
  }

  function handleKeyDown(event: KeyboardEvent, originalIndex: number) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleEventClick(originalIndex);
    }
  }
</script>

<div class={cn('timeline-container', className)}>
  {#if groupedEvents.length === 0}
    <div class="text-center text-gray-500 py-8">
      <p>No events to display</p>
      {#if filters.eventTypes.length > 0 || filters.searchQuery}
        <p class="text-sm mt-2">Try adjusting your filters</p>
      {/if}
    </div>
  {:else}
    <div class="space-y-6">
      {#each groupedEvents as group}
        <!-- Date header -->
        <div class="sticky top-0 bg-gray-50 z-10 py-2 px-3 rounded-lg">
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {formatDate(group.date)}
          </span>
        </div>

        <!-- Events for this date -->
        <div class="relative pl-6">
          <!-- Timeline line -->
          <div class="absolute left-[11px] top-0 bottom-0 w-0.5 bg-gray-200"></div>

          <div class="space-y-4">
            {#each group.events as { event, originalIndex }}
              {@const Icon = iconMap[event.eventType] || ArrowRight}
              {@const isSelected = originalIndex === selectedIndex}

              <div
                class={cn(
                  'relative flex gap-3 group cursor-pointer',
                  'transition-all duration-200'
                )}
                role="button"
                tabindex="0"
                onclick={() => handleEventClick(originalIndex)}
                onkeydown={(e) => handleKeyDown(e, originalIndex)}
              >
                <!-- Event dot/icon -->
                <div
                  class={cn(
                    'absolute -left-6 w-6 h-6 rounded-full flex items-center justify-center',
                    'transition-all duration-200 z-10',
                    colorMap[event.eventType],
                    isSelected ? 'ring-4 ring-blue-200 scale-110' : 'group-hover:scale-105'
                  )}
                >
                  <Icon class="w-3 h-3 text-white" />
                </div>

                <!-- Event content -->
                <div
                  class={cn(
                    'flex-1 bg-white rounded-lg border p-3 ml-3',
                    'transition-all duration-200',
                    isSelected
                      ? 'border-blue-500 shadow-md ring-1 ring-blue-200'
                      : 'border-gray-200 group-hover:border-gray-300 group-hover:shadow-sm'
                  )}
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <p
                        class={cn(
                          'text-sm font-medium',
                          isSelected ? 'text-blue-900' : 'text-gray-900'
                        )}
                      >
                        {event.description}
                      </p>
                      <div class="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span>{formatTime(event.timestamp)}</span>
                        <span class="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span class="truncate">by {event.triggeredBy}</span>
                      </div>
                    </div>

                    <!-- Event type badge -->
                    <span
                      class={cn(
                        'flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium',
                        isSelected
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      )}
                    >
                      {event.eventType.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <!-- Additional metadata preview -->
                  {#if event.metadata.reason}
                    <p class="mt-2 text-xs text-gray-500 italic">
                      "{event.metadata.reason}"
                    </p>
                  {/if}

                  {#if event.metadata.agentCount}
                    <div class="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      <Bot class="w-3 h-3" />
                      <span>{event.metadata.agentCount} agents</span>
                      {#if event.metadata.topology}
                        <span class="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span>{event.metadata.topology} topology</span>
                      {/if}
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .timeline-container {
    max-height: 100%;
    overflow-y: auto;
  }

  .timeline-container::-webkit-scrollbar {
    width: 6px;
  }

  .timeline-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .timeline-container::-webkit-scrollbar-thumb {
    background-color: #d1d5db;
    border-radius: 3px;
  }

  .timeline-container::-webkit-scrollbar-thumb:hover {
    background-color: #9ca3af;
  }
</style>
