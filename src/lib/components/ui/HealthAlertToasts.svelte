<script lang="ts">
  /**
   * GAP-3.5.2: Health Alert Toasts Component
   *
   * Displays toast notifications for health alerts:
   * - Auto-dismisses after duration
   * - Different styles for warning/error/info
   * - Dismissible by user
   */
  import { onMount, onDestroy } from 'svelte';
  import {
    activeAlerts,
    dismissAlert,
    type HealthAlert
  } from '$lib/stores/health';
  import { AlertTriangle, XCircle, Info, X, CheckCircle } from 'lucide-svelte';
  import { fly } from 'svelte/transition';

  interface Props {
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    autoDismissMs?: number;
    maxVisible?: number;
  }

  let {
    position = 'top-right',
    autoDismissMs = 8000,
    maxVisible = 5
  }: Props = $props();

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  const typeConfig = {
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/30',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-800 dark:text-yellow-200',
      icon: AlertTriangle
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/30',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-200',
      icon: XCircle
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/30',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-200',
      icon: CheckCircle
    }
  };

  // Track auto-dismiss timers
  let dismissTimers = new Map<string, ReturnType<typeof setTimeout>>();

  // Get visible alerts (limited)
  let visibleAlerts = $derived(($activeAlerts as HealthAlert[]).slice(0, maxVisible));

  // Setup auto-dismiss for new alerts
  $effect(() => {
    if (autoDismissMs > 0) {
      visibleAlerts.forEach((alert: HealthAlert) => {
        if (!dismissTimers.has(alert.id)) {
          const timer = setTimeout(() => {
            dismissAlert(alert.id);
            dismissTimers.delete(alert.id);
          }, autoDismissMs);
          dismissTimers.set(alert.id, timer);
        }
      });
    }
  });

  // Cleanup timers on destroy
  onDestroy(() => {
    dismissTimers.forEach((timer) => clearTimeout(timer));
    dismissTimers.clear();
  });

  function handleDismiss(alertId: string) {
    const timer = dismissTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      dismissTimers.delete(alertId);
    }
    dismissAlert(alertId);
  }
</script>

{#if visibleAlerts.length > 0}
  <div
    class="fixed z-50 flex flex-col gap-2 max-w-sm w-full {positionClasses[position]}"
    aria-live="polite"
    aria-atomic="true"
  >
    {#each visibleAlerts as alert (alert.id)}
      {@const config = typeConfig[alert.type]}
      <div
        class="flex items-start gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm {config.bg} {config.border}"
        data-testid="health-alert-{alert.type}"
        transition:fly={{ y: -20, duration: 200 }}
      >
        <!-- Icon -->
        <div class="flex-shrink-0">
          <svelte:component this={config.icon} class="w-5 h-5 {config.text}" />
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold {config.text}">
            {alert.title}
          </p>
          <p class="text-sm {config.text} opacity-90 mt-0.5">
            {alert.message}
          </p>
          {#if alert.component}
            <p class="text-xs {config.text} opacity-70 mt-1">
              Component: {alert.component}
            </p>
          {/if}
        </div>

        <!-- Dismiss -->
        <button
          type="button"
          class="flex-shrink-0 p-0.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors {config.text}"
          onclick={() => handleDismiss(alert.id)}
          aria-label="Dismiss notification"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    {/each}
  </div>
{/if}
