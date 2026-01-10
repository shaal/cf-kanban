<script lang="ts">
  /**
   * KanbanCard component - Draggable ticket card
   *
   * TASK-013: Create KanbanCard Component
   *
   * Features:
   * - Displays ticket title, description (truncated), priority badge, and labels
   * - Visual states: normal, dragging (opacity-50)
   * - Uses GripVertical icon for drag handle indication
   * - Priority color coding
   */
  import { GripVertical } from 'lucide-svelte';
  import { Badge } from '../ui';
  import { cn } from '$lib/utils';
  import type { Ticket, Priority } from '$lib/types';

  interface Props {
    ticket: Ticket;
    isDragging?: boolean;
    class?: string;
    onclick?: (ticket: Ticket) => void;
  }

  let {
    ticket,
    isDragging = false,
    class: className = '',
    onclick
  }: Props = $props();

  /**
   * Priority badge colors
   */
  const priorityColors: Record<Priority, string> = {
    LOW: 'bg-gray-200 text-gray-700 border-gray-300',
    MEDIUM: 'bg-blue-100 text-blue-700 border-blue-200',
    HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
    CRITICAL: 'bg-red-100 text-red-700 border-red-200'
  };

  function handleClick() {
    onclick?.(ticket);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  }
</script>

<div
  class={cn(
    'w-full text-left bg-white rounded-lg shadow-sm p-3',
    'cursor-grab active:cursor-grabbing',
    'hover:shadow-md transition-shadow duration-200',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
    isDragging && 'opacity-50 shadow-lg rotate-2',
    className
  )}
  role="button"
  tabindex="0"
  onclick={handleClick}
  onkeydown={handleKeyDown}
  aria-label="Ticket: {ticket.title}"
>
  <div class="flex items-start gap-2">
    <!-- Drag handle icon -->
    <div class="text-gray-400 mt-0.5 flex-shrink-0" aria-hidden="true">
      <GripVertical class="w-4 h-4" />
    </div>

    <div class="flex-1 min-w-0">
      <!-- Ticket title -->
      <h4 class="font-medium text-sm text-gray-900 truncate">
        {ticket.title}
      </h4>

      <!-- Ticket description (truncated) -->
      {#if ticket.description}
        <p class="text-xs text-gray-500 mt-1 line-clamp-2">
          {ticket.description}
        </p>
      {/if}

      <!-- Priority and labels -->
      <div class="flex items-center gap-2 mt-2 flex-wrap">
        <!-- Priority badge -->
        <span
          class={cn(
            'text-xs px-2 py-0.5 rounded-full border font-medium',
            priorityColors[ticket.priority]
          )}
        >
          {ticket.priority}
        </span>

        <!-- Labels -->
        {#each ticket.labels as label}
          <Badge variant="outline" class="text-xs">
            {label}
          </Badge>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  /* Line clamp for description */
  .line-clamp-2 {
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
