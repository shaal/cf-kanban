<script lang="ts">
  /**
   * GAP-3.5.2: System Status Indicator Component
   *
   * Displays system health status in the header:
   * - Green dot: All systems healthy
   * - Yellow dot: Degraded (partial issues)
   * - Red dot: Unhealthy (critical issues)
   * - Gray dot: Unknown/loading
   *
   * Clickable to navigate to /status page for details.
   */
  import { onMount, onDestroy } from 'svelte';
  import {
    healthStore,
    healthStatus,
    startHealthPolling,
    stopHealthPolling,
    getStatusColor,
    getStatusLabel,
    type HealthStatus
  } from '$lib/stores/health';
  import { Activity, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-svelte';
  import { goto } from '$app/navigation';

  interface Props {
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
    clickable?: boolean;
  }

  let {
    showLabel = false,
    size = 'md',
    clickable = true
  }: Props = $props();

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20
  };

  const statusConfig: Record<HealthStatus, { color: string; bgColor: string; icon: typeof CheckCircle }> = {
    healthy: {
      color: 'text-green-500',
      bgColor: 'bg-green-500',
      icon: CheckCircle
    },
    degraded: {
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500',
      icon: AlertTriangle
    },
    unhealthy: {
      color: 'text-red-500',
      bgColor: 'bg-red-500',
      icon: XCircle
    },
    unknown: {
      color: 'text-gray-400',
      bgColor: 'bg-gray-400',
      icon: Activity
    }
  };

  let status = $derived($healthStatus);
  let config = $derived(statusConfig[status]);
  let label = $derived(getStatusLabel(status));
  let isChecking = $derived($healthStore.isChecking);

  onMount(() => {
    // Start health polling when component mounts
    startHealthPolling();
  });

  onDestroy(() => {
    // Stop polling when component unmounts (cleanup)
    // Note: We don't stop here because other components may need it
    // The store will be reset when the app unmounts
  });

  function handleClick() {
    if (clickable) {
      goto('/status');
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (clickable && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      goto('/status');
    }
  }
</script>

<div
  class="flex items-center gap-2 {clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}"
  role={clickable ? 'button' : 'status'}
  tabindex={clickable ? 0 : -1}
  aria-label={`System status: ${label}. ${clickable ? 'Click for details.' : ''}`}
  onclick={handleClick}
  onkeydown={handleKeydown}
  title={label}
>
  {#if isChecking}
    <Loader2
      class="text-gray-400 animate-spin"
      size={iconSizes[size]}
      aria-hidden="true"
    />
  {:else if status === 'healthy'}
    <div class="relative">
      <div
        class="{sizeClasses[size]} {config.bgColor} rounded-full"
        aria-hidden="true"
      ></div>
      <div
        class="{sizeClasses[size]} {config.bgColor} rounded-full absolute inset-0 animate-ping opacity-75"
        aria-hidden="true"
      ></div>
    </div>
  {:else}
    <svelte:component
      this={config.icon}
      class={config.color}
      size={iconSizes[size]}
      aria-hidden="true"
    />
  {/if}

  {#if showLabel}
    <span class="text-sm {config.color}">{label}</span>
  {/if}
</div>
