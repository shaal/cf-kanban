<script lang="ts">
  /**
   * DependencySelector Component
   *
   * GAP-3.2.4: Ticket Dependency Detection
   *
   * A component that allows users to select dependencies for a ticket.
   * Shows available tickets in the project and allows multi-select.
   */
  import { createEventDispatcher } from 'svelte';
  import { Search, X, Link2, AlertTriangle, CheckCircle2 } from 'lucide-svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import type { Ticket } from '$lib/types';

  interface Props {
    /** Currently selected dependency IDs */
    selectedIds?: string[];
    /** All tickets in the project (for selection) */
    availableTickets?: Ticket[];
    /** Current ticket ID (to exclude from selection) */
    currentTicketId?: string;
    /** Whether the selector is disabled */
    disabled?: boolean;
  }

  let {
    selectedIds = [],
    availableTickets = [],
    currentTicketId = '',
    disabled = false
  }: Props = $props();

  const dispatch = createEventDispatcher<{
    change: { dependencyIds: string[] };
  }>();

  let searchQuery = $state('');
  let isOpen = $state(false);

  /**
   * Filter out the current ticket and already selected tickets
   */
  let selectableTickets = $derived.by(() => {
    return availableTickets.filter(t =>
      t.id !== currentTicketId &&
      !selectedIds.includes(t.id) &&
      t.status !== 'CANCELLED' // Don't allow depending on cancelled tickets
    );
  });

  /**
   * Filter tickets based on search query
   */
  let filteredTickets = $derived.by(() => {
    if (!searchQuery.trim()) {
      return selectableTickets;
    }
    const query = searchQuery.toLowerCase();
    return selectableTickets.filter(t =>
      t.title.toLowerCase().includes(query) ||
      t.id.toLowerCase().includes(query)
    );
  });

  /**
   * Get the selected tickets (full objects)
   */
  let selectedTickets = $derived.by(() => {
    return availableTickets.filter(t => selectedIds.includes(t.id));
  });

  /**
   * Check if a dependency is completed (DONE status)
   */
  function isDependencyComplete(ticket: Ticket): boolean {
    return ticket.status === 'DONE';
  }

  /**
   * Check if a dependency is blocked (has incomplete dependencies)
   */
  function isDependencyBlocked(ticket: Ticket): boolean {
    return ticket.status !== 'DONE' && ticket.status !== 'REVIEW';
  }

  /**
   * Add a ticket as a dependency
   */
  function addDependency(ticket: Ticket) {
    const newIds = [...selectedIds, ticket.id];
    dispatch('change', { dependencyIds: newIds });
    searchQuery = '';
    isOpen = false;
  }

  /**
   * Remove a dependency
   */
  function removeDependency(ticketId: string) {
    const newIds = selectedIds.filter(id => id !== ticketId);
    dispatch('change', { dependencyIds: newIds });
  }

  /**
   * Get status color for a ticket
   */
  function getStatusColor(status: string): string {
    switch (status) {
      case 'DONE': return 'bg-green-100 text-green-700 border-green-200';
      case 'REVIEW': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'NEEDS_FEEDBACK': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      isOpen = false;
    }
  }
</script>

<div class="space-y-2">
  <label class="block text-sm font-medium text-gray-700">
    <span class="flex items-center gap-1.5">
      <Link2 class="w-4 h-4" />
      Dependencies
    </span>
  </label>

  <!-- Selected dependencies -->
  {#if selectedTickets.length > 0}
    <div class="flex flex-wrap gap-2 mb-2">
      {#each selectedTickets as ticket}
        <div
          class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm border {getStatusColor(ticket.status)}"
        >
          {#if isDependencyComplete(ticket)}
            <CheckCircle2 class="w-3 h-3 text-green-600" />
          {:else}
            <AlertTriangle class="w-3 h-3 text-amber-600" />
          {/if}
          <span class="max-w-[150px] truncate" title={ticket.title}>
            {ticket.title}
          </span>
          {#if !disabled}
            <button
              type="button"
              class="p-0.5 hover:bg-black/10 rounded transition-colors"
              onclick={() => removeDependency(ticket.id)}
              aria-label="Remove dependency"
            >
              <X class="w-3 h-3" />
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Dependency selector dropdown -->
  <div class="relative">
    <div class="relative">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search tickets to add as dependency..."
        class="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm
               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
               disabled:opacity-50 disabled:bg-gray-100"
        {disabled}
        onfocus={() => isOpen = true}
        onkeydown={handleKeydown}
      />
    </div>

    <!-- Dropdown list -->
    {#if isOpen && !disabled && filteredTickets.length > 0}
      <div
        class="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-y-auto"
      >
        {#each filteredTickets as ticket}
          <button
            type="button"
            class="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 last:border-b-0"
            onclick={() => addDependency(ticket)}
          >
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900 truncate">
                {ticket.title}
              </div>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-xs text-gray-500">#{ticket.id.slice(-6)}</span>
                <span class="text-xs px-1.5 py-0.5 rounded {getStatusColor(ticket.status)}">
                  {ticket.status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
            <Link2 class="w-4 h-4 text-gray-400" />
          </button>
        {/each}
      </div>
    {/if}

    {#if isOpen && !disabled && searchQuery && filteredTickets.length === 0}
      <div class="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 p-4 text-center text-sm text-gray-500">
        No matching tickets found
      </div>
    {/if}
  </div>

  <!-- Help text -->
  {#if selectedIds.length === 0}
    <p class="text-xs text-gray-500">
      Select tickets that must be completed before this one can progress.
    </p>
  {:else}
    {#if selectedTickets.some(t => !isDependencyComplete(t))}
      <p class="text-xs text-amber-600 flex items-center gap-1">
        <AlertTriangle class="w-3 h-3" />
        Some dependencies are not yet complete. This ticket will be blocked until they are done.
      </p>
    {:else}
      <p class="text-xs text-green-600 flex items-center gap-1">
        <CheckCircle2 class="w-3 h-3" />
        All dependencies are complete.
      </p>
    {/if}
  {/if}
</div>

<!-- Click outside to close -->
{#if isOpen}
  <button
    type="button"
    class="fixed inset-0 z-0 cursor-default"
    onclick={() => isOpen = false}
    aria-label="Close dropdown"
    tabindex="-1"
  ></button>
{/if}
