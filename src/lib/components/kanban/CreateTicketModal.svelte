<script lang="ts">
  /**
   * CreateTicketModal Component
   *
   * TASK-018: Add Ticket Creation Modal
   * GAP-8.5: Contextual Suggestions on Ticket Creation
   *
   * A modal form for creating new tickets with:
   * - Title (required)
   * - Description (optional)
   * - Priority dropdown
   * - Labels (comma-separated)
   * - AI-powered contextual suggestions (GAP-8.5)
   *
   * Uses fly/fade transitions for smooth animation.
   * Dispatches 'created' event on success.
   */
  import { createEventDispatcher } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import TicketSuggestions from './TicketSuggestions.svelte';
  import { X } from 'lucide-svelte';

  export let open = false;
  export let projectId: string;

  const dispatch = createEventDispatcher<{
    created: { ticket: unknown };
    close: void;
  }>();

  let title = '';
  let description = '';
  let priority = 'MEDIUM';
  let labelsInput = '';
  let loading = false;
  let error = '';

  /**
   * Reset form to initial state
   */
  function resetForm() {
    title = '';
    description = '';
    priority = 'MEDIUM';
    labelsInput = '';
    error = '';
  }

  /**
   * Handle form submission
   */
  async function handleSubmit() {
    if (!title.trim()) {
      error = 'Title is required';
      return;
    }

    loading = true;
    error = '';

    try {
      const labels = labelsInput
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean);

      const response = await fetch(`/api/projects/${projectId}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          labels
        })
      });

      if (response.ok) {
        const ticket = await response.json();
        dispatch('created', { ticket });
        resetForm();
        open = false;
      } else {
        const data = await response.json();
        error = data.message || 'Failed to create ticket';
      }
    } catch (err) {
      error = 'Network error. Please try again.';
    } finally {
      loading = false;
    }
  }

  /**
   * Handle modal close
   */
  function handleClose() {
    if (!loading) {
      resetForm();
      open = false;
      dispatch('close');
    }
  }

  /**
   * Handle keyboard events
   */
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && !loading) {
      handleClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center"
    transition:fade={{ duration: 150 }}
  >
    <!-- Overlay -->
    <button
      type="button"
      class="absolute inset-0 bg-black/50 cursor-default"
      on:click={handleClose}
      aria-label="Close modal"
      tabindex="-1"
    ></button>

    <!-- Modal content -->
    <div
      class="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
      transition:fly={{ y: 20, duration: 200 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <!-- Header -->
      <header class="flex items-center justify-between px-6 py-4 border-b">
        <h2 id="modal-title" class="text-lg font-semibold text-gray-900">
          Create New Ticket
        </h2>
        <button
          type="button"
          class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          on:click={handleClose}
          aria-label="Close"
        >
          <X class="w-5 h-5" />
        </button>
      </header>

      <!-- Form -->
      <form on:submit|preventDefault={handleSubmit} class="p-6 space-y-4">
        <!-- Error message -->
        {#if error}
          <div class="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        {/if}

        <!-- Title -->
        <div>
          <label for="ticket-title" class="block text-sm font-medium text-gray-700 mb-1">
            Title <span class="text-red-500">*</span>
          </label>
          <Input
            id="ticket-title"
            bind:value={title}
            placeholder="Enter ticket title"
            required
            disabled={loading}
          />
        </div>

        <!-- Description -->
        <div>
          <label for="ticket-description" class="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="ticket-description"
            bind:value={description}
            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   disabled:opacity-50 disabled:bg-gray-100 resize-none"
            rows="3"
            placeholder="Describe the ticket..."
            disabled={loading}
          ></textarea>
        </div>

        <!-- Priority -->
        <div>
          <label for="ticket-priority" class="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            id="ticket-priority"
            bind:value={priority}
            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   disabled:opacity-50"
            disabled={loading}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>

        <!-- Labels -->
        <div>
          <label for="ticket-labels" class="block text-sm font-medium text-gray-700 mb-1">
            Labels
          </label>
          <Input
            id="ticket-labels"
            bind:value={labelsInput}
            placeholder="bug, frontend, urgent"
            disabled={loading}
          />
          <p class="mt-1 text-xs text-gray-500">
            Separate multiple labels with commas
          </p>
        </div>

        <!-- GAP-8.5: Contextual Suggestions -->
        <TicketSuggestions
          {title}
          {description}
          {priority}
          labels={labelsInput.split(',').map(l => l.trim()).filter(Boolean)}
          {projectId}
          debounceMs={300}
        />

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4 border-t mt-6">
          <Button
            type="button"
            variant="ghost"
            onclick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !title.trim()}>
            {loading ? 'Creating...' : 'Create Ticket'}
          </Button>
        </div>
      </form>
    </div>
  </div>
{/if}
