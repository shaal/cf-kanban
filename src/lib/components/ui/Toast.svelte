<script lang="ts">
  /**
   * TASK-118: Toast Notification Component
   *
   * Non-intrusive notifications for:
   * - Success messages
   * - Error alerts
   * - Info updates
   */

  import { CheckCircle, AlertCircle, Info, X } from 'lucide-svelte';
  import { fade, fly } from 'svelte/transition';

  interface Toast {
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
    duration?: number;
  }

  interface Props {
    toasts?: Toast[];
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    onDismiss?: (id: string) => void;
  }

  let {
    toasts = [],
    position = 'top-right',
    onDismiss
  }: Props = $props();

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  const typeConfig = {
    success: {
      bg: 'bg-green-50 dark:bg-green-900/30',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-800 dark:text-green-200',
      icon: CheckCircle,
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/30',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-200',
      icon: AlertCircle,
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/30',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-200',
      icon: Info,
    },
  };

  function handleDismiss(id: string) {
    onDismiss?.(id);
  }
</script>

<div
  class="fixed z-50 flex flex-col gap-2 max-w-sm w-full {positionClasses[position]}"
  aria-live="polite"
  aria-atomic="true"
>
  {#each toasts as toast (toast.id)}
    {@const config = typeConfig[toast.type]}
    <div
      class="flex items-start gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm {config.bg} {config.border}"
      data-testid="toast-{toast.type}"
      transition:fly={{ y: -20, duration: 200 }}
    >
      <!-- Icon -->
      <div class="flex-shrink-0">
        <svelte:component this={config.icon} class="w-5 h-5 {config.text}" />
      </div>

      <!-- Message -->
      <p class="flex-1 text-sm font-medium {config.text}">
        {toast.message}
      </p>

      <!-- Dismiss -->
      <button
        type="button"
        class="flex-shrink-0 p-0.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors {config.text}"
        onclick={() => handleDismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  {/each}
</div>
