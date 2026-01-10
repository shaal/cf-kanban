<script lang="ts">
  /**
   * GAP-A1.1: Path Validation Indicator Component
   *
   * Displays validation status for workspace paths:
   * - Green checkmark for valid, existing paths
   * - Yellow warning for non-existent or duplicate paths
   * - Red error for invalid paths
   */
  import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-svelte';
  import { cn } from '$lib/utils';

  interface Props {
    status: 'idle' | 'validating' | 'valid' | 'warning' | 'error';
    message?: string;
    class?: string;
  }

  let { status, message, class: className }: Props = $props();

  const statusConfig = {
    idle: {
      icon: null,
      color: 'text-gray-400',
      bgColor: 'bg-gray-100'
    },
    validating: {
      icon: Loader2,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      animate: true
    },
    valid: {
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    error: {
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  };

  const config = $derived(statusConfig[status]);
</script>

{#if status !== 'idle'}
  <div class={cn('flex items-start gap-2 p-2 rounded-md text-sm', config.bgColor, className)}>
    {#if status === 'validating'}
      <Loader2 class={cn('w-4 h-4 flex-shrink-0 mt-0.5 animate-spin', config.color)} />
    {:else if status === 'valid'}
      <CheckCircle2 class={cn('w-4 h-4 flex-shrink-0 mt-0.5', config.color)} />
    {:else if status === 'warning'}
      <AlertTriangle class={cn('w-4 h-4 flex-shrink-0 mt-0.5', config.color)} />
    {:else if status === 'error'}
      <XCircle class={cn('w-4 h-4 flex-shrink-0 mt-0.5', config.color)} />
    {/if}
    {#if message}
      <span class={cn('text-xs', config.color)}>{message}</span>
    {/if}
  </div>
{/if}
