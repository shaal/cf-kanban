<script lang="ts">
  /**
   * TASK-118: Improved Error Messages Component
   *
   * User-friendly error messages with:
   * - Clear explanations
   * - Suggested actions
   * - Technical details (collapsible)
   */

  import { AlertCircle, RefreshCw, ChevronDown, ChevronUp, X } from 'lucide-svelte';

  interface Props {
    title?: string;
    message: string;
    type?: 'error' | 'warning' | 'info';
    code?: string;
    suggestion?: string;
    technicalDetails?: string;
    onRetry?: () => void;
    onDismiss?: () => void;
  }

  let {
    title,
    message,
    type = 'error',
    code,
    suggestion,
    technicalDetails,
    onRetry,
    onDismiss
  }: Props = $props();

  let showDetails = $state(false);

  const typeStyles = {
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      icon: 'text-red-500',
      title: 'text-red-800 dark:text-red-200',
      text: 'text-red-700 dark:text-red-300',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: 'text-yellow-500',
      title: 'text-yellow-800 dark:text-yellow-200',
      text: 'text-yellow-700 dark:text-yellow-300',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'text-blue-500',
      title: 'text-blue-800 dark:text-blue-200',
      text: 'text-blue-700 dark:text-blue-300',
    },
  };

  const styles = typeStyles[type];

  const defaultTitles = {
    error: 'Something went wrong',
    warning: 'Heads up',
    info: 'For your information',
  };

  const defaultSuggestions = {
    error: 'Please try again. If the problem persists, contact support.',
    warning: 'You may want to review this before continuing.',
    info: '',
  };
</script>

<div
  class="rounded-lg border p-4 {styles.bg} {styles.border}"
  role="alert"
  aria-live="polite"
>
  <div class="flex items-start gap-3">
    <!-- Icon -->
    <div class="flex-shrink-0 mt-0.5">
      <AlertCircle class="w-5 h-5 {styles.icon}" />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <!-- Title -->
      <h3 class="text-sm font-semibold {styles.title}">
        {title || defaultTitles[type]}
        {#if code}
          <span class="font-normal text-xs ml-2 opacity-75">({code})</span>
        {/if}
      </h3>

      <!-- Message -->
      <p class="mt-1 text-sm {styles.text}">
        {message}
      </p>

      <!-- Suggestion -->
      {#if suggestion || defaultSuggestions[type]}
        <p class="mt-2 text-sm {styles.text} opacity-80">
          {suggestion || defaultSuggestions[type]}
        </p>
      {/if}

      <!-- Technical Details (collapsible) -->
      {#if technicalDetails}
        <div class="mt-3">
          <button
            type="button"
            class="flex items-center gap-1 text-xs {styles.text} opacity-60 hover:opacity-100 transition-opacity"
            onclick={() => showDetails = !showDetails}
          >
            {#if showDetails}
              <ChevronUp class="w-3 h-3" />
              Hide technical details
            {:else}
              <ChevronDown class="w-3 h-3" />
              Show technical details
            {/if}
          </button>

          {#if showDetails}
            <pre
              class="mt-2 p-2 text-xs font-mono bg-black/10 dark:bg-white/10 rounded overflow-x-auto {styles.text}"
            >{technicalDetails}</pre>
          {/if}
        </div>
      {/if}

      <!-- Actions -->
      {#if onRetry}
        <div class="mt-3 flex gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md
                   bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                   hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            onclick={onRetry}
          >
            <RefreshCw class="w-4 h-4" />
            Try Again
          </button>
        </div>
      {/if}
    </div>

    <!-- Dismiss Button -->
    {#if onDismiss}
      <button
        type="button"
        class="flex-shrink-0 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        onclick={onDismiss}
        aria-label="Dismiss"
      >
        <X class="w-4 h-4 {styles.icon}" />
      </button>
    {/if}
  </div>
</div>
