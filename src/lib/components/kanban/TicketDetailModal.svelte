<script lang="ts">
  /**
   * TicketDetailModal Component
   *
   * GAP-3.2.6: Feedback Interaction UI Enhancement
   *
   * A modal dialog that displays ticket details and allows users to:
   * - View ticket information (title, description, priority, labels)
   * - Answer pending questions from Claude
   * - Request clarification on questions
   * - Resume ticket processing after answering all required questions
   */
  import { createEventDispatcher, onMount } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { X, AlertCircle, CheckCircle2 } from 'lucide-svelte';
  import { Button, Badge } from '$lib/components/ui';
  import { cn } from '$lib/utils';
  import TicketQuestions from './TicketQuestions.svelte';
  import type { Ticket, TicketWithQuestions, Priority, TicketQuestion } from '$lib/types';

  interface Props {
    open?: boolean;
    ticket: Ticket | TicketWithQuestions | null;
  }

  let { open = $bindable(false), ticket }: Props = $props();

  const dispatch = createEventDispatcher<{
    close: void;
    resume: { ticketId: string };
    updated: { ticket: Ticket };
  }>();

  // Local state
  let loading = $state(false);
  let error = $state('');
  let questions = $state<TicketQuestion[]>([]);
  let resuming = $state(false);

  /**
   * Priority badge colors
   */
  const priorityColors: Record<Priority, string> = {
    LOW: 'bg-gray-200 text-gray-700 border-gray-300',
    MEDIUM: 'bg-blue-100 text-blue-700 border-blue-200',
    HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
    CRITICAL: 'bg-red-100 text-red-700 border-red-200'
  };

  /**
   * Load questions when ticket changes
   */
  $effect(() => {
    if (open && ticket) {
      loadQuestions();
    }
  });

  /**
   * Fetch questions for the ticket
   */
  async function loadQuestions() {
    if (!ticket) return;

    // Check if questions are already loaded in the ticket object
    if ('questions' in ticket && Array.isArray(ticket.questions)) {
      questions = ticket.questions;
      return;
    }

    loading = true;
    error = '';

    try {
      const response = await fetch(`/api/tickets/${ticket.id}/questions`);
      if (response.ok) {
        const data = await response.json();
        questions = data.questions || [];
      } else {
        const data = await response.json();
        error = data.message || 'Failed to load questions';
      }
    } catch (err) {
      error = 'Network error loading questions';
    } finally {
      loading = false;
    }
  }

  /**
   * Handle question answered
   */
  function handleQuestionAnswered(event: CustomEvent<{ questionId: string; allAnswered: boolean }>) {
    // Update local questions state
    const idx = questions.findIndex(q => q.id === event.detail.questionId);
    if (idx >= 0) {
      questions[idx] = { ...questions[idx], answered: true };
      questions = [...questions];
    }
  }

  /**
   * Handle ready to resume
   */
  async function handleReadyToResume() {
    if (!ticket) return;

    resuming = true;
    error = '';

    try {
      const response = await fetch(`/api/tickets/${ticket.id}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        dispatch('resume', { ticketId: ticket.id });
        dispatch('updated', { ticket: data.ticket });
        handleClose();
      } else {
        const data = await response.json();
        error = data.message || 'Failed to resume ticket';
      }
    } catch (err) {
      error = 'Network error resuming ticket';
    } finally {
      resuming = false;
    }
  }

  /**
   * Handle clarification request
   */
  function handleClarifyRequest(event: CustomEvent<{ questionId: string }>) {
    // The TicketQuestions component handles the API call
    // We just need to refresh questions after
    loadQuestions();
  }

  /**
   * Handle error from child component
   */
  function handleError(event: CustomEvent<{ message: string }>) {
    error = event.detail.message;
  }

  /**
   * Close the modal
   */
  function handleClose() {
    if (!resuming) {
      open = false;
      dispatch('close');
    }
  }

  /**
   * Handle keyboard events
   */
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && !resuming) {
      handleClose();
    }
  }

  // Computed values
  let hasPendingQuestions = $derived(questions.some(q => !q.answered));
  let pendingCount = $derived(questions.filter(q => !q.answered).length);
  let allRequiredAnswered = $derived(questions.filter(q => q.required && !q.answered).length === 0);
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open && ticket}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center"
    transition:fade={{ duration: 150 }}
  >
    <!-- Overlay -->
    <button
      type="button"
      class="absolute inset-0 bg-black/50 cursor-default"
      onclick={handleClose}
      aria-label="Close modal"
      tabindex="-1"
    ></button>

    <!-- Modal content -->
    <div
      class="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
      transition:fly={{ y: 20, duration: 200 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticket-detail-title"
    >
      <!-- Header -->
      <header class="flex items-center justify-between px-6 py-4 border-b bg-white sticky top-0 z-10">
        <div class="flex items-center gap-3">
          <h2 id="ticket-detail-title" class="text-lg font-semibold text-gray-900 truncate">
            {ticket.title}
          </h2>
          <span
            class={cn(
              'text-xs px-2 py-0.5 rounded-full border font-medium',
              priorityColors[ticket.priority]
            )}
          >
            {ticket.priority}
          </span>
        </div>
        <button
          type="button"
          class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          onclick={handleClose}
          aria-label="Close"
        >
          <X class="w-5 h-5" />
        </button>
      </header>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        <!-- Error message -->
        {#if error}
          <div class="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle class="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        {/if}

        <!-- Ticket description -->
        {#if ticket.description}
          <div>
            <h3 class="text-sm font-medium text-gray-700 mb-2">Description</h3>
            <p class="text-sm text-gray-600 whitespace-pre-wrap">{ticket.description}</p>
          </div>
        {/if}

        <!-- Labels -->
        {#if ticket.labels && ticket.labels.length > 0}
          <div>
            <h3 class="text-sm font-medium text-gray-700 mb-2">Labels</h3>
            <div class="flex flex-wrap gap-2">
              {#each ticket.labels as label}
                <Badge variant="outline">{label}</Badge>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Status indicator -->
        <div class="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <span class="text-sm font-medium text-gray-700">Status:</span>
          <span class={cn(
            'text-sm px-2 py-0.5 rounded-full font-medium',
            ticket.status === 'NEEDS_FEEDBACK' ? 'bg-amber-100 text-amber-700' :
            ticket.status === 'READY_TO_RESUME' ? 'bg-teal-100 text-teal-700' :
            ticket.status === 'DONE' ? 'bg-green-100 text-green-700' :
            'bg-gray-100 text-gray-700'
          )}>
            {ticket.status.replace(/_/g, ' ')}
          </span>
        </div>

        <!-- Questions section (GAP-3.2.6) -->
        {#if loading}
          <div class="flex items-center justify-center py-8">
            <div class="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span class="ml-2 text-sm text-gray-500">Loading questions...</span>
          </div>
        {:else if questions.length > 0}
          <div>
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-medium text-gray-700">
                Questions from Claude
              </h3>
              {#if hasPendingQuestions}
                <Badge variant="warning">
                  {pendingCount} pending
                </Badge>
              {:else}
                <Badge variant="default" class="bg-green-100 text-green-700 border-green-200">
                  <CheckCircle2 class="w-3 h-3 mr-1" />
                  All answered
                </Badge>
              {/if}
            </div>
            <TicketQuestions
              ticketId={ticket.id}
              {questions}
              on:answered={handleQuestionAnswered}
              on:readyToResume={handleReadyToResume}
              on:clarify={handleClarifyRequest}
              on:error={handleError}
            />
          </div>
        {:else if ticket.status === 'NEEDS_FEEDBACK'}
          <div class="p-4 bg-amber-50 rounded-lg border border-amber-200 text-amber-700">
            <p class="text-sm">This ticket is waiting for feedback, but no specific questions are pending.</p>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <footer class="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
        <Button variant="ghost" onclick={handleClose} disabled={resuming}>
          Close
        </Button>
        {#if allRequiredAnswered && questions.length > 0 && ticket.status === 'NEEDS_FEEDBACK'}
          <Button onclick={handleReadyToResume} disabled={resuming}>
            {resuming ? 'Resuming...' : 'Resume Processing'}
          </Button>
        {/if}
      </footer>
    </div>
  </div>
{/if}
