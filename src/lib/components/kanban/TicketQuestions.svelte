<script lang="ts">
  /**
   * TicketQuestions Component
   *
   * TASK-057: Create Question/Answer UI on Ticket Cards
   *
   * Displays agent questions and allows users to provide answers.
   * This is a core component of the swim-lane feedback loop.
   *
   * Features:
   * - Displays all pending questions for a ticket
   * - Different input types for each question type (TEXT, CHOICE, MULTISELECT, CONFIRM, CODE)
   * - Real-time answer submission
   * - "Ready to Resume" button when all required questions are answered
   */
  import { createEventDispatcher } from 'svelte';
  import { Button, Input } from '$lib/components/ui';
  import { cn } from '$lib/utils';

  /**
   * Question type definitions matching the Prisma schema
   */
  type QuestionType = 'TEXT' | 'CHOICE' | 'MULTISELECT' | 'CONFIRM' | 'CODE';

  /**
   * Question interface matching the database model
   */
  interface Question {
    id: string;
    question: string;
    type: QuestionType;
    options: string[];
    required: boolean;
    answer: string | null;
    answered: boolean;
    context: string | null;
    codeLanguage: string | null;
    defaultValue: string | null;
    agentId: string;
  }

  /**
   * Component props
   */
  interface Props {
    ticketId: string;
    questions: Question[];
    class?: string;
  }

  let { ticketId, questions = [], class: className = '' }: Props = $props();

  const dispatch = createEventDispatcher<{
    answered: { questionId: string; allAnswered: boolean };
    readyToResume: void;
    error: { message: string };
  }>();

  // Local state for answers and submission status
  let answers: Record<string, string> = $state({});
  let multiselects: Record<string, Set<string>> = $state({});
  let submitting: Record<string, boolean> = $state({});
  let errors: Record<string, string> = $state({});

  // Computed: count of unanswered required questions
  let unansweredCount = $derived(
    questions.filter(q => !q.answered && q.required).length
  );

  // Computed: whether all required questions are answered
  let allAnswered = $derived(unansweredCount === 0);

  // Initialize default values and multiselects
  $effect(() => {
    for (const q of questions) {
      if (!q.answered) {
        if (q.defaultValue && !answers[q.id]) {
          answers[q.id] = q.defaultValue;
        }
        if (q.type === 'MULTISELECT' && !multiselects[q.id]) {
          multiselects[q.id] = new Set();
        }
      }
    }
  });

  /**
   * Submit an answer for a question
   */
  async function submitAnswer(question: Question) {
    let answer: string | undefined;

    if (question.type === 'MULTISELECT') {
      const selected = multiselects[question.id];
      if (selected && selected.size > 0) {
        answer = Array.from(selected).join(',');
      }
    } else {
      answer = answers[question.id];
    }

    // Validate required
    if (question.required && (!answer || answer.trim() === '')) {
      errors[question.id] = 'This question requires an answer';
      return;
    }

    // Clear any previous error
    delete errors[question.id];
    submitting[question.id] = true;

    try {
      const response = await fetch(
        `/api/tickets/${ticketId}/questions/${question.id}/answer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer })
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to submit answer');
      }

      const result = await response.json();

      // Update local state to show answered
      const idx = questions.findIndex(q => q.id === question.id);
      if (idx >= 0) {
        questions[idx] = { ...questions[idx], answered: true, answer: answer || null };
        questions = [...questions];
      }

      dispatch('answered', {
        questionId: question.id,
        allAnswered: result.allAnswered
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit answer';
      errors[question.id] = message;
      dispatch('error', { message });
    } finally {
      submitting[question.id] = false;
    }
  }

  /**
   * Toggle a multiselect option
   */
  function toggleMultiselect(questionId: string, option: string) {
    if (!multiselects[questionId]) {
      multiselects[questionId] = new Set();
    }

    const set = new Set(multiselects[questionId]);
    if (set.has(option)) {
      set.delete(option);
    } else {
      set.add(option);
    }
    multiselects[questionId] = set;
  }

  /**
   * Handle choice selection (auto-submit)
   */
  async function selectChoice(question: Question, choice: string) {
    answers[question.id] = choice;
    await submitAnswer(question);
  }

  /**
   * Handle confirmation (auto-submit)
   */
  async function confirm(question: Question, value: boolean) {
    answers[question.id] = value ? 'Yes' : 'No';
    await submitAnswer(question);
  }

  /**
   * Handle ready to resume
   */
  function handleReadyToResume() {
    dispatch('readyToResume');
  }

  /**
   * Handle keyboard submit for text inputs
   */
  function handleKeydown(event: KeyboardEvent, question: Question) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitAnswer(question);
    }
  }
</script>

<div class={cn('space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-200', className)}>
  <!-- Header -->
  <div class="flex items-center gap-2 text-amber-700">
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span class="font-medium">Claude needs your input</span>
    {#if unansweredCount > 0}
      <span class="text-sm">
        ({unansweredCount} question{unansweredCount > 1 ? 's' : ''} remaining)
      </span>
    {/if}
  </div>

  <!-- Questions -->
  {#each questions as question (question.id)}
    <div class="bg-white rounded-md p-3 shadow-sm border border-gray-100">
      <!-- Question text -->
      <p class="font-medium text-sm text-gray-800 mb-2">{question.question}</p>

      <!-- Context if provided -->
      {#if question.context}
        <p class="text-xs text-gray-500 mb-3 italic">{question.context}</p>
      {/if}

      <!-- Already answered -->
      {#if question.answered}
        <div class="flex items-center gap-2 text-green-600">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span class="text-sm">{question.answer}</span>
        </div>

      <!-- TEXT input -->
      {:else if question.type === 'TEXT'}
        <div class="flex flex-col gap-2">
          <div class="flex gap-2">
            <Input
              bind:value={answers[question.id]}
              placeholder="Type your answer..."
              class="flex-1"
              onkeydown={(e) => handleKeydown(e, question)}
            />
            <Button
              size="sm"
              onclick={() => submitAnswer(question)}
              disabled={submitting[question.id] || (question.required && !answers[question.id])}
            >
              {submitting[question.id] ? '...' : 'Submit'}
            </Button>
          </div>
          {#if errors[question.id]}
            <p class="text-xs text-red-500">{errors[question.id]}</p>
          {/if}
        </div>

      <!-- CHOICE (single select) -->
      {:else if question.type === 'CHOICE'}
        <div class="flex flex-wrap gap-2">
          {#each question.options as option}
            <button
              class={cn(
                'px-3 py-1.5 text-sm rounded-full border transition-colors',
                answers[question.id] === option
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700'
              )}
              onclick={() => selectChoice(question, option)}
              disabled={submitting[question.id]}
            >
              {option}
            </button>
          {/each}
        </div>
        {#if errors[question.id]}
          <p class="text-xs text-red-500 mt-2">{errors[question.id]}</p>
        {/if}

      <!-- MULTISELECT -->
      {:else if question.type === 'MULTISELECT'}
        <div class="space-y-2">
          <div class="flex flex-wrap gap-2">
            {#each question.options as option}
              <button
                class={cn(
                  'px-3 py-1.5 text-sm rounded-full border transition-colors',
                  multiselects[question.id]?.has(option)
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700'
                )}
                onclick={() => toggleMultiselect(question.id, option)}
                disabled={submitting[question.id]}
              >
                {option}
              </button>
            {/each}
          </div>
          <Button
            size="sm"
            onclick={() => submitAnswer(question)}
            disabled={submitting[question.id] || (question.required && (!multiselects[question.id] || multiselects[question.id].size === 0))}
          >
            {submitting[question.id] ? 'Submitting...' : 'Submit Selection'}
          </Button>
          {#if errors[question.id]}
            <p class="text-xs text-red-500">{errors[question.id]}</p>
          {/if}
        </div>

      <!-- CONFIRM (Yes/No) -->
      {:else if question.type === 'CONFIRM'}
        <div class="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onclick={() => confirm(question, false)}
            disabled={submitting[question.id]}
          >
            No
          </Button>
          <Button
            size="sm"
            onclick={() => confirm(question, true)}
            disabled={submitting[question.id]}
          >
            Yes
          </Button>
        </div>
        {#if errors[question.id]}
          <p class="text-xs text-red-500 mt-2">{errors[question.id]}</p>
        {/if}

      <!-- CODE input -->
      {:else if question.type === 'CODE'}
        <div class="space-y-2">
          {#if question.codeLanguage}
            <span class="text-xs text-gray-500">Language: {question.codeLanguage}</span>
          {/if}
          <textarea
            bind:value={answers[question.id]}
            placeholder="Enter code here..."
            class={cn(
              'w-full min-h-[100px] p-3 font-mono text-sm',
              'border border-gray-300 rounded-md',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'bg-gray-50'
            )}
            onkeydown={(e) => {
              // Allow Tab for indentation in code
              if (e.key === 'Tab') {
                e.preventDefault();
                const target = e.target as HTMLTextAreaElement;
                const start = target.selectionStart;
                const end = target.selectionEnd;
                answers[question.id] =
                  answers[question.id].substring(0, start) +
                  '  ' +
                  answers[question.id].substring(end);
                // Set cursor position after the tab
                setTimeout(() => {
                  target.selectionStart = target.selectionEnd = start + 2;
                }, 0);
              }
            }}
          ></textarea>
          <Button
            size="sm"
            onclick={() => submitAnswer(question)}
            disabled={submitting[question.id] || (question.required && !answers[question.id])}
          >
            {submitting[question.id] ? 'Submitting...' : 'Submit Code'}
          </Button>
          {#if errors[question.id]}
            <p class="text-xs text-red-500">{errors[question.id]}</p>
          {/if}
        </div>
      {/if}

      <!-- Required indicator -->
      {#if question.required && !question.answered}
        <p class="text-xs text-gray-400 mt-2">* Required</p>
      {/if}
    </div>
  {/each}

  <!-- Ready to Resume button -->
  {#if allAnswered && questions.length > 0}
    <Button
      class="w-full"
      onclick={handleReadyToResume}
    >
      Ready to Resume - Let Claude Continue
    </Button>
  {/if}
</div>
