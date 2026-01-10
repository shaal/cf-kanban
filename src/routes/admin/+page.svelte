<script lang="ts">
  /**
   * TASK-100: Admin Dashboard
   *
   * Overview page showing key statistics and recent activity.
   */
  import type { PageData } from './$types';
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import {
    Users,
    FolderKanban,
    Ticket,
    Activity,
    TrendingUp,
    AlertCircle,
    Clock,
    CheckCircle2
  } from 'lucide-svelte';

  export let data: PageData;

  // Stats cards configuration
  const statsCards = [
    {
      label: 'Total Users',
      value: data.stats?.totalUsers ?? 0,
      icon: Users,
      color: 'bg-blue-500',
      change: `${data.stats?.activeUsers ?? 0} active`
    },
    {
      label: 'Projects',
      value: data.stats?.totalProjects ?? 0,
      icon: FolderKanban,
      color: 'bg-green-500',
      change: `${data.stats?.archivedProjects ?? 0} archived`
    },
    {
      label: 'Tickets',
      value: data.stats?.totalTickets ?? 0,
      icon: Ticket,
      color: 'bg-purple-500',
      change: `${data.stats?.completedTickets ?? 0} completed`
    },
    {
      label: 'Recent Activity',
      value: data.stats?.recentAuditLogs ?? 0,
      icon: Activity,
      color: 'bg-orange-500',
      change: 'last 24 hours'
    }
  ];
</script>

<div class="admin-dashboard">
  <!-- Page Header -->
  <div class="mb-8">
    <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
    <p class="text-gray-500 mt-1">
      Overview of your CF Kanban instance
    </p>
  </div>

  <!-- Stats Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    {#each statsCards as stat}
      <Card class="p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">{stat.label}</p>
            <p class="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
            <p class="text-xs text-gray-400 mt-1">{stat.change}</p>
          </div>
          <div class="{stat.color} p-3 rounded-lg">
            <stat.icon class="w-6 h-6 text-white" />
          </div>
        </div>
      </Card>
    {/each}
  </div>

  <!-- Quick Actions & Recent Activity -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Quick Actions -->
    <Card class="p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
      <div class="space-y-3">
        <a
          href="/admin/users"
          class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Users class="w-5 h-5 text-blue-500" />
          <div>
            <p class="font-medium text-gray-900">Manage Users</p>
            <p class="text-sm text-gray-500">Invite users, change roles</p>
          </div>
        </a>
        <a
          href="/admin/projects"
          class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <FolderKanban class="w-5 h-5 text-green-500" />
          <div>
            <p class="font-medium text-gray-900">View Projects</p>
            <p class="text-sm text-gray-500">Project overview and stats</p>
          </div>
        </a>
        <a
          href="/admin/settings"
          class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <TrendingUp class="w-5 h-5 text-purple-500" />
          <div>
            <p class="font-medium text-gray-900">Configure Settings</p>
            <p class="text-sm text-gray-500">System and integration settings</p>
          </div>
        </a>
        <a
          href="/admin/audit"
          class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Activity class="w-5 h-5 text-orange-500" />
          <div>
            <p class="font-medium text-gray-900">View Audit Logs</p>
            <p class="text-sm text-gray-500">Track admin activity</p>
          </div>
        </a>
      </div>
    </Card>

    <!-- Recent Activity -->
    <Card class="p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-900">Recent Activity</h2>
        <a href="/admin/audit" class="text-sm text-blue-600 hover:underline">
          View all
        </a>
      </div>

      {#if data.recentLogs && data.recentLogs.length > 0}
        <div class="space-y-4">
          {#each data.recentLogs.slice(0, 5) as log}
            <div class="flex items-start gap-3">
              <div class="p-1.5 bg-gray-100 rounded-full">
                {#if log.action.includes('USER')}
                  <Users class="w-4 h-4 text-blue-500" />
                {:else if log.action.includes('PROJECT')}
                  <FolderKanban class="w-4 h-4 text-green-500" />
                {:else if log.action.includes('SETTINGS')}
                  <TrendingUp class="w-4 h-4 text-purple-500" />
                {:else}
                  <Activity class="w-4 h-4 text-gray-500" />
                {/if}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-gray-900 truncate">{log.description}</p>
                <p class="text-xs text-gray-500">
                  {log.userEmail} - {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
              {#if log.isSensitive}
                <Badge variant="warning" class="flex-shrink-0">
                  <AlertCircle class="w-3 h-3 mr-1" />
                  Sensitive
                </Badge>
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <div class="text-center py-8">
          <Clock class="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p class="text-gray-500">No recent activity</p>
        </div>
      {/if}
    </Card>
  </div>

  <!-- System Status -->
  <div class="mt-6">
    <Card class="p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">System Status</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
          <CheckCircle2 class="w-5 h-5 text-green-500" />
          <div>
            <p class="font-medium text-gray-900">Database</p>
            <p class="text-sm text-gray-500">Connected</p>
          </div>
        </div>
        <div class="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
          <CheckCircle2 class="w-5 h-5 text-green-500" />
          <div>
            <p class="font-medium text-gray-900">Claude Flow</p>
            <p class="text-sm text-gray-500">
              {data.claudeFlowEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
          <CheckCircle2 class="w-5 h-5 text-green-500" />
          <div>
            <p class="font-medium text-gray-900">WebSocket</p>
            <p class="text-sm text-gray-500">Active</p>
          </div>
        </div>
      </div>
    </Card>
  </div>
</div>
