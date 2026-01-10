<script lang="ts">
  /**
   * KanbanColumn component - Droppable column for tickets
   *
   * TASK-012: Create KanbanColumn Component
   *
   * Features:
   * - Uses svelte-dnd-action for droppable area
   * - Display column header with status and ticket count
   * - Color-coded by status
   * - Handle drag consider/finalize events
   * - Use flip animation for smooth moves
   */
  import { dndzone, type DndEvent } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
  import type { TicketStatus, Ticket } from '$lib/types';
  import KanbanCard from './KanbanCard.svelte';
  import { cn } from '$lib/utils';

  interface Props {
    status: TicketStatus;
    tickets?: Ticket[];
    onTicketDrop?: (ticketId: string, newStatus: TicketStatus) => void;
    onTicketClick?: (ticket: Ticket) => void;
  }

  let {
    status,
    tickets = $bindable([]),
    onTicketDrop,
    onTicketClick
  }: Props = $props();

  const flipDurationMs = 200;

  /**
   * Status display names (more readable)
   */
  const statusDisplayNames: Record<TicketStatus, string> = {
    BACKLOG: 'Backlog',
    TODO: 'To Do',
    IN_PROGRESS: 'In Progress',
    NEEDS_FEEDBACK: 'Needs Feedback',
    READY_TO_RESUME: 'Ready to Resume',
    REVIEW: 'Review',
    DONE: 'Done',
    CANCELLED: 'Cancelled'
  };

  /**
   * Status column background colors
   */
  const statusColors: Record<TicketStatus, string> = {
    BACKLOG: 'bg-gray-100 border-gray-300',
    TODO: 'bg-blue-50 border-blue-300',
    IN_PROGRESS: 'bg-yellow-50 border-yellow-300',
    NEEDS_FEEDBACK: 'bg-orange-50 border-orange-300',
    READY_TO_RESUME: 'bg-teal-50 border-teal-300',
    REVIEW: 'bg-purple-50 border-purple-300',
    DONE: 'bg-green-50 border-green-300',
    CANCELLED: 'bg-red-50 border-red-300'
  };

  /**
   * Status header accent colors
   */
  const statusHeaderColors: Record<TicketStatus, string> = {
    BACKLOG: 'bg-gray-500',
    TODO: 'bg-blue-500',
    IN_PROGRESS: 'bg-yellow-500',
    NEEDS_FEEDBACK: 'bg-orange-500',
    READY_TO_RESUME: 'bg-teal-500',
    REVIEW: 'bg-purple-500',
    DONE: 'bg-green-500',
    CANCELLED: 'bg-red-500'
  };

  /**
   * Handle drag consider event (when items are being dragged over)
   */
  function handleDndConsider(e: CustomEvent<DndEvent<Ticket>>) {
    tickets = e.detail.items;
  }

  /**
   * Handle drag finalize event (when item is dropped)
   */
  function handleDndFinalize(e: CustomEvent<DndEvent<Ticket>>) {
    tickets = e.detail.items;

    // Find any ticket that was dropped here from another column
    // (its status won't match this column's status yet)
    const droppedTicket = e.detail.items.find(t => t.status !== status);
    if (droppedTicket) {
      onTicketDrop?.(droppedTicket.id, status);
    }
  }
</script>

<div
  class={cn(
    'flex flex-col w-72 min-w-[288px] min-h-[500px]',
    'rounded-lg border-2',
    statusColors[status]
  )}
  data-tour="kanban-columns"
>
  <!-- Column header -->
  <header class="p-3 border-b border-inherit">
    <div class="flex items-center gap-2">
      <!-- Status color indicator -->
      <div
        class={cn('w-3 h-3 rounded-full', statusHeaderColors[status])}
        aria-hidden="true"
      ></div>

      <!-- Status name -->
      <h3 class="font-semibold text-sm text-gray-700 flex-1">
        {statusDisplayNames[status]}
      </h3>

      <!-- Ticket count badge -->
      <span
        class="bg-white/80 px-2 py-0.5 rounded-full text-xs font-medium text-gray-600 border border-gray-200"
      >
        {tickets.length}
      </span>
    </div>
  </header>

  <!-- Droppable area for tickets -->
  <div
    class="flex-1 p-2 space-y-2 overflow-y-auto"
    use:dndzone={{
      items: tickets,
      flipDurationMs,
      dropTargetStyle: {
        outline: '2px dashed #3b82f6',
        outlineOffset: '-2px'
      }
    }}
    onconsider={handleDndConsider}
    onfinalize={handleDndFinalize}
    role="list"
    aria-label="{statusDisplayNames[status]} tickets"
  >
    {#each tickets as ticket (ticket.id)}
      <div animate:flip={{ duration: flipDurationMs }} role="listitem">
        <KanbanCard
          {ticket}
          onclick={onTicketClick}
        />
      </div>
    {/each}

    <!-- Empty state placeholder -->
    {#if tickets.length === 0}
      <div
        class="h-24 flex items-center justify-center text-gray-400 text-sm italic border-2 border-dashed border-gray-200 rounded-lg"
      >
        Drop tickets here
      </div>
    {/if}
  </div>
</div>
