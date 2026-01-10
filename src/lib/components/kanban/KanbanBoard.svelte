<script lang="ts">
  /**
   * KanbanBoard component - Main board composing all columns
   *
   * TASK-014: Create KanbanBoard Component
   *
   * Features:
   * - Compose KanbanColumn for each visible status
   * - Columns: BACKLOG, TODO, IN_PROGRESS, NEEDS_FEEDBACK, REVIEW, DONE
   * - Coordinate drag-and-drop between columns
   * - Dispatch 'ticketMove' event when dropping
   * - Horizontal scroll if needed
   */
  import { createEventDispatcher } from 'svelte';
  import type { Ticket, TicketStatus } from '$lib/types';
  import KanbanColumn from './KanbanColumn.svelte';

  interface Props {
    projectId: string;
    tickets?: Ticket[];
    showCancelledColumn?: boolean;
  }

  let {
    projectId,
    tickets = [],
    showCancelledColumn = false
  }: Props = $props();

  const dispatch = createEventDispatcher<{
    ticketMove: { ticketId: string; newStatus: TicketStatus };
    ticketClick: { ticket: Ticket };
  }>();

  /**
   * Visible columns to display (in order)
   * CANCELLED and READY_TO_RESUME are hidden by default but can be shown
   */
  const defaultColumns: TicketStatus[] = [
    'BACKLOG',
    'TODO',
    'IN_PROGRESS',
    'NEEDS_FEEDBACK',
    'REVIEW',
    'DONE'
  ];

  /**
   * Get visible columns based on props
   */
  let visibleColumns = $derived(
    showCancelledColumn
      ? [...defaultColumns, 'CANCELLED' as TicketStatus]
      : defaultColumns
  );

  /**
   * Group tickets by status for efficient rendering
   */
  let ticketsByStatus = $derived.by(() => {
    const grouped: Record<TicketStatus, Ticket[]> = {
      BACKLOG: [],
      TODO: [],
      IN_PROGRESS: [],
      NEEDS_FEEDBACK: [],
      READY_TO_RESUME: [],
      REVIEW: [],
      DONE: [],
      CANCELLED: []
    };

    for (const ticket of tickets) {
      const ticketStatus = ticket.status as TicketStatus;
      if (grouped[ticketStatus]) {
        grouped[ticketStatus].push(ticket);
      }
    }

    // Sort tickets by position within each column
    for (const status of Object.keys(grouped) as TicketStatus[]) {
      grouped[status].sort((a, b) => a.position - b.position);
    }

    return grouped;
  });

  /**
   * Handle ticket drop from column
   */
  function handleTicketDrop(ticketId: string, newStatus: TicketStatus) {
    dispatch('ticketMove', { ticketId, newStatus });
  }

  /**
   * Handle ticket click for opening detail modal
   */
  function handleTicketClick(ticket: Ticket) {
    dispatch('ticketClick', { ticket });
  }

  // Reference projectId to avoid unused variable warning
  $effect(() => {
    void projectId;
  });
</script>

<div
  class="flex gap-4 overflow-x-auto p-4 min-h-[calc(100vh-120px)] bg-gray-100"
  role="region"
  aria-label="Kanban board for project"
  data-tour="kanban-board"
>
  {#each visibleColumns as status (status)}
    <KanbanColumn
      {status}
      tickets={ticketsByStatus[status]}
      onTicketDrop={handleTicketDrop}
      onTicketClick={handleTicketClick}
    />
  {/each}
</div>

<style>
  /* Custom scrollbar for horizontal scroll */
  div::-webkit-scrollbar {
    height: 8px;
  }

  div::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  div::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
  }

  div::-webkit-scrollbar-thumb:hover {
    background: #a1a1a1;
  }
</style>
