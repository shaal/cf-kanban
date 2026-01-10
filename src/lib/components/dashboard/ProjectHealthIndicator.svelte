<script lang="ts">
  /**
   * GAP-3.1.4: Project Health Indicator Component
   *
   * Visual indication of Claude Code instance status with color-coded
   * health status and detailed tooltip.
   */
  import Tooltip from '$lib/components/ui/Tooltip.svelte';
  import type { HealthStatus } from '$lib/types/dashboard';

  interface Props {
    status: HealthStatus;
    activeAgents?: number;
    lastActivity?: Date | string | null;
    message?: string;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
  }

  let {
    status = 'unknown',
    activeAgents = 0,
    lastActivity = null,
    message = '',
    size = 'md',
    showLabel = false
  }: Props = $props();

  const statusConfig: Record<HealthStatus, { color: string; bgColor: string; label: string }> = {
    healthy: {
      color: 'bg-green-500',
      bgColor: 'bg-green-100',
      label: 'Healthy'
    },
    degraded: {
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-100',
      label: 'Degraded'
    },
    unhealthy: {
      color: 'bg-red-500',
      bgColor: 'bg-red-100',
      label: 'Unhealthy'
    },
    unknown: {
      color: 'bg-gray-400',
      bgColor: 'bg-gray-100',
      label: 'Unknown'
    }
  };

  const sizeConfig = {
    sm: { dot: 'w-2 h-2', ring: 'w-3.5 h-3.5', text: 'text-xs' },
    md: { dot: 'w-2.5 h-2.5', ring: 'w-4 h-4', text: 'text-sm' },
    lg: { dot: 'w-3 h-3', ring: 'w-5 h-5', text: 'text-base' }
  };

  let config = $derived(statusConfig[status]);
  let sizeClass = $derived(sizeConfig[size]);

  function formatLastActivity(date: Date | string | null): string {
    if (!date) return 'No activity recorded';

    const activityDate = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - activityDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return activityDate.toLocaleDateString();
  }

  let tooltipContent = $derived(() => {
    const parts = [
      `Status: ${config.label}`,
      `Active agents: ${activeAgents}`,
      `Last activity: ${formatLastActivity(lastActivity)}`
    ];
    if (message) parts.push(message);
    return parts.join('\n');
  });
</script>

<Tooltip content={tooltipContent()} position="top" maxWidth="250px">
  <div class="inline-flex items-center gap-1.5">
    <div class="relative flex items-center justify-center {sizeClass.ring} {config.bgColor} rounded-full">
      <span
        class="{sizeClass.dot} {config.color} rounded-full {status === 'healthy' ? 'animate-pulse' : ''}"
      ></span>
    </div>
    {#if showLabel}
      <span class="{sizeClass.text} font-medium text-gray-700">{config.label}</span>
    {/if}
  </div>
</Tooltip>

<style>
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
</style>
