<script lang="ts">
  /**
   * ConnectionIndicator - Shows real-time connection status
   *
   * TASK-034: Connect Kanban board to WebSocket
   *
   * Displays a small indicator showing:
   * - Green dot: Connected
   * - Yellow dot: Connecting
   * - Red dot: Disconnected or error
   * - Optional label text
   */
  import { connectionStatus, type ConnectionStatus } from '$lib/stores/socket';
  import { Wifi, WifiOff, Loader2 } from 'lucide-svelte';

  interface Props {
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }

  let { showLabel = false, size = 'md' }: Props = $props();

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

  const statusConfig: Record<ConnectionStatus, { color: string; label: string; bgColor: string }> = {
    connected: {
      color: 'text-green-500',
      label: 'Connected',
      bgColor: 'bg-green-500'
    },
    connecting: {
      color: 'text-yellow-500',
      label: 'Connecting...',
      bgColor: 'bg-yellow-500'
    },
    disconnected: {
      color: 'text-gray-400',
      label: 'Disconnected',
      bgColor: 'bg-gray-400'
    },
    error: {
      color: 'text-red-500',
      label: 'Connection Error',
      bgColor: 'bg-red-500'
    }
  };

  let config = $derived(statusConfig[$connectionStatus]);
</script>

<div
  class="flex items-center gap-2"
  role="status"
  aria-label={`Connection status: ${config.label}`}
>
  {#if $connectionStatus === 'connecting'}
    <Loader2
      class="{config.color} animate-spin"
      size={iconSizes[size]}
      aria-hidden="true"
    />
  {:else if $connectionStatus === 'connected'}
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
  {:else if $connectionStatus === 'error'}
    <WifiOff
      class={config.color}
      size={iconSizes[size]}
      aria-hidden="true"
    />
  {:else}
    <div
      class="{sizeClasses[size]} {config.bgColor} rounded-full"
      aria-hidden="true"
    ></div>
  {/if}

  {#if showLabel}
    <span class="text-sm {config.color}">{config.label}</span>
  {/if}
</div>
