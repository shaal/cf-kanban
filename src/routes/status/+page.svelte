<script lang="ts">
  /**
   * GAP-3.5.2: System Status Page
   *
   * Comprehensive system health dashboard showing:
   * - Overall system status
   * - Individual component health
   * - System metrics (uptime, memory)
   * - Recent health history
   */
  import type { PageData } from './$types';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import {
    Activity,
    CheckCircle,
    XCircle,
    AlertTriangle,
    RefreshCw,
    ArrowLeft,
    Clock,
    HardDrive,
    Database,
    Server,
    Wifi
  } from 'lucide-svelte';
  import { invalidateAll } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';

  export let data: PageData;

  let isRefreshing = false;
  let autoRefresh = true;
  let refreshInterval: ReturnType<typeof setInterval> | null = null;

  // Auto-refresh every 30 seconds
  onMount(() => {
    if (autoRefresh) {
      refreshInterval = setInterval(handleRefresh, 30000);
    }
  });

  onDestroy(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });

  async function handleRefresh() {
    isRefreshing = true;
    try {
      await invalidateAll();
    } finally {
      isRefreshing = false;
    }
  }

  function toggleAutoRefresh() {
    autoRefresh = !autoRefresh;
    if (autoRefresh && !refreshInterval) {
      refreshInterval = setInterval(handleRefresh, 30000);
    } else if (!autoRefresh && refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  function formatUptime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    }
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hours}h`;
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  function formatTimestamp(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  }

  function getStatusColor(status: string): 'success' | 'warning' | 'danger' | 'secondary' {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'degraded':
        return 'warning';
      case 'unhealthy':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'healthy':
        return CheckCircle;
      case 'degraded':
        return AlertTriangle;
      case 'unhealthy':
        return XCircle;
      default:
        return Activity;
    }
  }

  function getComponentIcon(name: string) {
    switch (name.toLowerCase()) {
      case 'database':
        return Database;
      case 'redis':
        return Server;
      case 'api':
        return Wifi;
      default:
        return HardDrive;
    }
  }

  $: statusIcon = data.health ? getStatusIcon(data.health.status) : Activity;
  $: statusColor = data.health ? getStatusColor(data.health.status) : 'secondary';
</script>

<svelte:head>
  <title>System Status | CF Kanban</title>
</svelte:head>

<main class="min-h-screen bg-gray-50">
  <header class="bg-white border-b px-6 py-4">
    <div class="max-w-4xl mx-auto flex items-center gap-4">
      <a href="/" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
        <ArrowLeft class="w-5 h-5" />
      </a>
      <div class="flex-1">
        <div class="flex items-center gap-3">
          <Activity class="w-6 h-6 text-blue-600" />
          <h1 class="text-2xl font-bold">System Status</h1>
        </div>
        <p class="text-gray-600 mt-1">
          Monitor system health and performance
        </p>
      </div>
      <div class="flex items-center gap-3">
        <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onchange={toggleAutoRefresh}
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Auto-refresh
        </label>
        <Button
          variant="outline"
          size="sm"
          onclick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw class="w-4 h-4 mr-2 {isRefreshing ? 'animate-spin' : ''}" />
          Refresh
        </Button>
      </div>
    </div>
  </header>

  <div class="max-w-4xl mx-auto p-6 space-y-6">
    {#if data.error}
      <Card class="p-6 border-red-200 bg-red-50">
        <div class="flex items-center gap-3 text-red-700">
          <XCircle class="w-5 h-5" />
          <div>
            <p class="font-medium">Failed to load system status</p>
            <p class="text-sm">{data.error}</p>
          </div>
        </div>
      </Card>
    {:else if data.health}
      <!-- Overall Status Banner -->
      <Card class="p-6 {data.health.status === 'healthy' ? 'border-green-200 bg-green-50' : data.health.status === 'degraded' ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'}">
        <div class="flex items-center gap-4">
          <div class="p-3 rounded-full {data.health.status === 'healthy' ? 'bg-green-100' : data.health.status === 'degraded' ? 'bg-yellow-100' : 'bg-red-100'}">
            <svelte:component
              this={statusIcon}
              class="w-8 h-8 {data.health.status === 'healthy' ? 'text-green-600' : data.health.status === 'degraded' ? 'text-yellow-600' : 'text-red-600'}"
            />
          </div>
          <div class="flex-1">
            <h2 class="text-xl font-bold {data.health.status === 'healthy' ? 'text-green-800' : data.health.status === 'degraded' ? 'text-yellow-800' : 'text-red-800'}">
              {#if data.health.status === 'healthy'}
                All Systems Operational
              {:else if data.health.status === 'degraded'}
                Partial System Outage
              {:else}
                Major System Outage
              {/if}
            </h2>
            <p class="text-sm {data.health.status === 'healthy' ? 'text-green-600' : data.health.status === 'degraded' ? 'text-yellow-600' : 'text-red-600'}">
              Last checked: {formatTimestamp(data.health.timestamp)}
            </p>
          </div>
          {#if data.health.version}
            <Badge variant="secondary">v{data.health.version}</Badge>
          {/if}
        </div>
      </Card>

      <!-- System Metrics -->
      {#if data.metrics}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Uptime -->
          <Card class="p-4">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-blue-100 rounded-lg">
                <Clock class="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p class="text-sm text-gray-500">Uptime</p>
                <p class="text-lg font-semibold">{formatUptime(data.metrics.uptime)}</p>
              </div>
            </div>
          </Card>

          <!-- Memory Used -->
          <Card class="p-4">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-purple-100 rounded-lg">
                <HardDrive class="w-5 h-5 text-purple-600" />
              </div>
              <div class="flex-1">
                <p class="text-sm text-gray-500">Memory Usage</p>
                <p class="text-lg font-semibold">{formatBytes(data.metrics.memory.used)}</p>
                <div class="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all {data.metrics.memory.percentage > 80 ? 'bg-red-500' : data.metrics.memory.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'}"
                    style="width: {data.metrics.memory.percentage}%"
                  ></div>
                </div>
              </div>
            </div>
          </Card>

          <!-- Total Memory -->
          <Card class="p-4">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-green-100 rounded-lg">
                <Server class="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p class="text-sm text-gray-500">Total Memory</p>
                <p class="text-lg font-semibold">{formatBytes(data.metrics.memory.total)}</p>
              </div>
            </div>
          </Card>
        </div>
      {/if}

      <!-- Component Health -->
      <Card class="p-6">
        <h3 class="text-lg font-semibold mb-4">Component Health</h3>
        <div class="space-y-4">
          {#each data.health.checks as check}
            {@const ComponentIcon = getComponentIcon(check.name)}
            <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div class="p-2 {check.status === 'healthy' ? 'bg-green-100' : 'bg-red-100'} rounded-lg">
                <ComponentIcon class="w-5 h-5 {check.status === 'healthy' ? 'text-green-600' : 'text-red-600'}" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <h4 class="font-medium capitalize">{check.name}</h4>
                  <Badge variant={check.status === 'healthy' ? 'success' : 'danger'}>
                    {check.status}
                  </Badge>
                </div>
                {#if check.message}
                  <p class="text-sm text-gray-500 mt-1">{check.message}</p>
                {/if}
              </div>
              <div class="text-right">
                {#if check.latencyMs !== undefined}
                  <p class="text-sm text-gray-500">
                    {check.latencyMs}ms
                  </p>
                {/if}
              </div>
            </div>
          {/each}

          {#if data.health.checks.length === 0}
            <div class="text-center py-8 text-gray-500">
              <Activity class="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No component health data available</p>
            </div>
          {/if}
        </div>
      </Card>

      <!-- Health Details -->
      <Card class="p-6">
        <h3 class="text-lg font-semibold mb-4">Health Check Details</h3>
        <div class="space-y-3">
          {#each data.health.checks as check}
            {#if check.details && Object.keys(check.details).length > 0}
              <div class="p-4 bg-gray-50 rounded-lg">
                <h4 class="font-medium capitalize mb-2">{check.name} Details</h4>
                <pre class="text-xs text-gray-600 overflow-x-auto">{JSON.stringify(check.details, null, 2)}</pre>
              </div>
            {/if}
          {/each}

          {#if data.health.checks.every(c => !c.details || Object.keys(c.details).length === 0)}
            <p class="text-sm text-gray-500 text-center py-4">
              No additional details available
            </p>
          {/if}
        </div>
      </Card>
    {:else}
      <Card class="p-12 text-center">
        <Activity class="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 class="text-xl font-semibold text-gray-700 mb-2">Unable to Load Status</h2>
        <p class="text-gray-500 mb-6">
          Could not retrieve system health information.
        </p>
        <Button onclick={handleRefresh}>
          <RefreshCw class="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </Card>
    {/if}
  </div>
</main>
