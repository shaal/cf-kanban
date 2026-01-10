<script lang="ts">
  /**
   * KanbanCard component - Draggable ticket card
   *
   * TASK-013: Create KanbanCard Component
   * GAP-3.3.3: Agent Status on Ticket Cards
   * GAP-3.2.6: Feedback Interaction UI Enhancement - Question indicator
   * GAP-UX.1: KanbanCard AI Status Indicators
   * GAP-3.2.3: Estimated Completion Time Display
   * GAP-3.2.4: Ticket Dependency Detection
   * GAP-3.2.5: Ticket Attachment Support - attachment count indicator
   *
   * Features:
   * - Displays ticket title, description (truncated), priority badge, and labels
   * - Visual states: normal, dragging (opacity-50)
   * - Uses GripVertical icon for drag handle indication
   * - Priority color coding
   * - Agent status indicators for assigned agents (GAP-3.3.3)
   * - Question indicator badge for tickets in NEEDS_FEEDBACK status (GAP-3.2.6)
   * - AI status section with confidence, knowledge ring, and agent avatar (GAP-UX.1)
   * - Estimated completion time badge (GAP-3.2.3)
   * - Dependency indicator badge (GAP-3.2.4)
   */
  import { GripVertical, MessageCircleQuestion, Link2, Paperclip } from 'lucide-svelte';
  import { Badge } from '../ui';
  import { cn } from '$lib/utils';
  import type { Ticket, Priority, TicketWithQuestions } from '$lib/types';
  import TicketAgentsDisplay from './TicketAgentsDisplay.svelte';
  import AIStatusSection from './AIStatusSection.svelte';
  import TimeEstimateBadge from './TimeEstimateBadge.svelte';
  import { createTicketAIStatusStore } from '$lib/stores/ai-status';

  interface Props {
    ticket: Ticket | TicketWithQuestions;
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
   * GAP-3.2.6: Check if ticket has pending questions
   */
  function hasPendingQuestions(t: Ticket | TicketWithQuestions): boolean {
    if ('questions' in t && Array.isArray(t.questions)) {
      return t.questions.some(q => !q.answered);
    }
    // If in NEEDS_FEEDBACK status but no questions loaded, assume it has questions
    return t.status === 'NEEDS_FEEDBACK';
  }

  /**
   * GAP-3.2.6: Get count of pending questions
   */
  function getPendingQuestionCount(t: Ticket | TicketWithQuestions): number {
    if ('questions' in t && Array.isArray(t.questions)) {
      return t.questions.filter(q => !q.answered).length;
    }
    return 0;
  }

  // Reactive derived values for questions
  let showQuestionIndicator = $derived(hasPendingQuestions(ticket));
  let pendingQuestionCount = $derived(getPendingQuestionCount(ticket));

  // GAP-3.2.4: Check if ticket has dependencies
  let hasDependencies = $derived(ticket.dependencyIds && ticket.dependencyIds.length > 0);
  let dependencyCount = $derived(ticket.dependencyIds?.length ?? 0);

  // GAP-3.2.5: Track attachment count (fetched separately)
  let attachmentCount = $state(0);

  // Load attachment count on mount
  $effect(() => {
    async function loadAttachmentCount() {
      try {
        const response = await fetch(`/api/tickets/${ticket.id}/attachments`);
        if (response.ok) {
          const data = await response.json();
          attachmentCount = data.attachments?.length ?? 0;
        }
      } catch {
        // Silently fail - attachment count is not critical
      }
    }
    loadAttachmentCount();
  });

  // GAP-UX.1: Subscribe to AI status for this ticket
  const aiStatusStore = createTicketAIStatusStore(ticket.id);
  const aiStatus = $derived($aiStatusStore);

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
  data-tour="ticket-card"
  data-ticket-id={ticket.id}
>
  <div class="flex items-start gap-2">
    <!-- Drag handle icon -->
    <div class="text-gray-400 mt-0.5 flex-shrink-0" aria-hidden="true">
      <GripVertical class="w-4 h-4" />
    </div>

    <div class="flex-1 min-w-0">
      <!-- Ticket title with question indicator -->
      <div class="flex items-center gap-2">
        <h4 class="font-medium text-sm text-gray-900 truncate flex-1">
          {ticket.title}
        </h4>
        <!-- GAP-3.2.6: Question indicator badge -->
        {#if showQuestionIndicator}
          <span
            class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 flex-shrink-0"
            title="Needs your input - click to answer"
          >
            <MessageCircleQuestion class="w-3 h-3" />
            {#if pendingQuestionCount > 0}
              <span>{pendingQuestionCount}</span>
            {/if}
          </span>
        {/if}
        <!-- GAP-3.2.4: Dependency indicator badge -->
        {#if hasDependencies}
          <span
            class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 flex-shrink-0"
            title="{dependencyCount} {dependencyCount === 1 ? 'dependency' : 'dependencies'}"
          >
            <Link2 class="w-3 h-3" />
            <span>{dependencyCount}</span>
          </span>
        {/if}
        <!-- GAP-3.2.5: Attachment indicator badge -->
        {#if attachmentCount > 0}
          <span
            class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200 flex-shrink-0"
            title="{attachmentCount} {attachmentCount === 1 ? 'attachment' : 'attachments'}"
          >
            <Paperclip class="w-3 h-3" />
            <span>{attachmentCount}</span>
          </span>
        {/if}
      </div>

      <!-- Ticket description (truncated) -->
      {#if ticket.description}
        <p class="text-xs text-gray-500 mt-1 line-clamp-2">
          {ticket.description}
        </p>
      {/if}

      <!-- Priority, time estimate, and labels -->
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

        <!-- GAP-3.2.3: Time estimate badge -->
        <TimeEstimateBadge ticketId={ticket.id} compact />

        <!-- Labels -->
        {#each ticket.labels as label}
          <Badge variant="outline" class="text-xs">
            {label}
          </Badge>
        {/each}

        <!-- Agent status display (GAP-3.3.3) -->
        <TicketAgentsDisplay ticketId={ticket.id} size="xs" />
      </div>

      <!-- GAP-UX.1: AI Status Section -->
      {#if aiStatus}
        <div class="mt-2">
          <AIStatusSection
            data={{
              status: aiStatus.status,
              confidence: aiStatus.confidence,
              knowledge: aiStatus.knowledge,
              agentType: aiStatus.agentType,
              agentName: aiStatus.agentName,
              currentTask: aiStatus.currentTask
            }}
            variant="compact"
            size="xs"
          />
        </div>
      {/if}
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
