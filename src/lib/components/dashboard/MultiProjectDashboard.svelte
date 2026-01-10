<script lang="ts">
  /**
   * GAP-3.1.4: Multi-Project Dashboard Component
   *
   * Grid view of all projects with:
   * - Health indicators per project
   * - Active agent counts
   * - Last activity timestamps
   * - Aggregate statistics panel
   * - Filtering and sorting options
   */
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import ProjectStatsCard from './ProjectStatsCard.svelte';
  import ProjectHealthIndicator from './ProjectHealthIndicator.svelte';
  import type { HealthStatus, ProjectWithHealth, AggregateStats } from '$lib/types/dashboard';
  import {
    Search,
    Filter,
    SortAsc,
    SortDesc,
    Grid,
    List,
    RefreshCw,
    FolderKanban,
    Bot,
    Ticket,
    TrendingUp,
    Activity,
    AlertCircle,
    CheckCircle2
  } from 'lucide-svelte';
  import { goto } from '$app/navigation';

  interface Props {
    projects: ProjectWithHealth[];
    aggregateStats?: AggregateStats | null;
    onRefresh?: () => Promise<void>;
    loading?: boolean;
    class?: string;
  }

  type SortField = 'name' | 'updatedAt' | 'activeAgents' | 'healthStatus' | 'ticketCount';
  type ViewMode = 'grid' | 'list';

  let {
    projects,
    aggregateStats = null,
    onRefresh,
    loading = false,
    class: className = ''
  }: Props = $props();

  // State
  let searchQuery = $state('');
  let sortField = $state<SortField>('updatedAt');
  let sortAsc = $state(false);
  let viewMode = $state<ViewMode>('grid');
  let showArchived = $state(false);
  let healthFilter = $state<HealthStatus | 'all'>('all');
  let isRefreshing = $state(false);

  // Computed stats
  let computedStats = $derived<AggregateStats>(() => {
    if (aggregateStats) return aggregateStats;

    return {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => !p.isArchived).length,
      archivedProjects: projects.filter(p => p.isArchived).length,
      totalAgents: projects.reduce((sum, p) => sum + p.activeAgents, 0),
      totalTickets: projects.reduce((sum, p) => sum + p.ticketCount, 0),
      completedTickets: projects.reduce((sum, p) => sum + p.completedTickets, 0),
      healthyProjects: projects.filter(p => p.healthStatus === 'healthy').length,
      degradedProjects: projects.filter(p => p.healthStatus === 'degraded').length,
      unhealthyProjects: projects.filter(p => p.healthStatus === 'unhealthy').length
    };
  });

  let completionRate = $derived(
    computedStats().totalTickets > 0
      ? Math.round((computedStats().completedTickets / computedStats().totalTickets) * 100)
      : 0
  );

  // Filtered and sorted projects
  let filteredProjects = $derived.by(() => {
    let result = [...projects];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    // Filter by archived status
    if (!showArchived) {
      result = result.filter(p => !p.isArchived);
    }

    // Filter by health status
    if (healthFilter !== 'all') {
      result = result.filter(p => p.healthStatus === healthFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'updatedAt':
          comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          break;
        case 'activeAgents':
          comparison = b.activeAgents - a.activeAgents;
          break;
        case 'healthStatus':
          const healthOrder: Record<HealthStatus, number> = {
            healthy: 0,
            degraded: 1,
            unhealthy: 2,
            unknown: 3
          };
          comparison = healthOrder[a.healthStatus] - healthOrder[b.healthStatus];
          break;
        case 'ticketCount':
          comparison = b.ticketCount - a.ticketCount;
          break;
      }
      return sortAsc ? -comparison : comparison;
    });

    return result;
  });

  async function handleRefresh() {
    if (!onRefresh || isRefreshing) return;
    isRefreshing = true;
    try {
      await onRefresh();
    } finally {
      isRefreshing = false;
    }
  }

  function handleViewDetails(projectId: string) {
    goto(`/admin/projects/${projectId}`);
  }

  function handleViewBoard(projectId: string) {
    goto(`/projects/${projectId}`);
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      sortAsc = !sortAsc;
    } else {
      sortField = field;
      sortAsc = false;
    }
  }
</script>

<div class="multi-project-dashboard {className}">
  <!-- Aggregate Statistics Panel -->
  <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
    <Card class="p-3">
      <div class="flex items-center gap-2">
        <div class="p-1.5 bg-blue-100 rounded-lg">
          <FolderKanban class="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <p class="text-lg font-bold text-gray-900">{computedStats().totalProjects}</p>
          <p class="text-xs text-gray-500">Projects</p>
        </div>
      </div>
    </Card>

    <Card class="p-3">
      <div class="flex items-center gap-2">
        <div class="p-1.5 bg-purple-100 rounded-lg">
          <Bot class="w-4 h-4 text-purple-600" />
        </div>
        <div>
          <p class="text-lg font-bold text-gray-900">{computedStats().totalAgents}</p>
          <p class="text-xs text-gray-500">Active Agents</p>
        </div>
      </div>
    </Card>

    <Card class="p-3">
      <div class="flex items-center gap-2">
        <div class="p-1.5 bg-amber-100 rounded-lg">
          <Ticket class="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <p class="text-lg font-bold text-gray-900">{computedStats().totalTickets}</p>
          <p class="text-xs text-gray-500">Total Tickets</p>
        </div>
      </div>
    </Card>

    <Card class="p-3">
      <div class="flex items-center gap-2">
        <div class="p-1.5 bg-green-100 rounded-lg">
          <TrendingUp class="w-4 h-4 text-green-600" />
        </div>
        <div>
          <p class="text-lg font-bold text-gray-900">{completionRate}%</p>
          <p class="text-xs text-gray-500">Completion</p>
        </div>
      </div>
    </Card>

    <Card class="p-3">
      <div class="flex items-center gap-2">
        <div class="p-1.5 bg-green-100 rounded-lg">
          <CheckCircle2 class="w-4 h-4 text-green-600" />
        </div>
        <div>
          <p class="text-lg font-bold text-gray-900">{computedStats().healthyProjects}</p>
          <p class="text-xs text-gray-500">Healthy</p>
        </div>
      </div>
    </Card>

    <Card class="p-3">
      <div class="flex items-center gap-2">
        <div class="p-1.5 bg-red-100 rounded-lg">
          <AlertCircle class="w-4 h-4 text-red-600" />
        </div>
        <div>
          <p class="text-lg font-bold text-gray-900">
            {computedStats().degradedProjects + computedStats().unhealthyProjects}
          </p>
          <p class="text-xs text-gray-500">Issues</p>
        </div>
      </div>
    </Card>
  </div>

  <!-- Filters and Controls -->
  <Card class="p-4 mb-6">
    <div class="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
      <!-- Search -->
      <div class="flex-1 relative w-full lg:max-w-md">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="search"
          placeholder="Search projects..."
          bind:value={searchQuery}
          class="pl-10"
        />
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-2 items-center">
        <!-- Health Filter -->
        <div class="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            class="px-2 py-1 text-xs rounded {healthFilter === 'all' ? 'bg-white shadow-sm' : ''}"
            onclick={() => (healthFilter = 'all')}
          >
            All
          </button>
          <button
            class="px-2 py-1 text-xs rounded flex items-center gap-1 {healthFilter === 'healthy' ? 'bg-white shadow-sm' : ''}"
            onclick={() => (healthFilter = 'healthy')}
          >
            <span class="w-2 h-2 rounded-full bg-green-500"></span>
            Healthy
          </button>
          <button
            class="px-2 py-1 text-xs rounded flex items-center gap-1 {healthFilter === 'degraded' ? 'bg-white shadow-sm' : ''}"
            onclick={() => (healthFilter = 'degraded')}
          >
            <span class="w-2 h-2 rounded-full bg-yellow-500"></span>
            Degraded
          </button>
          <button
            class="px-2 py-1 text-xs rounded flex items-center gap-1 {healthFilter === 'unhealthy' ? 'bg-white shadow-sm' : ''}"
            onclick={() => (healthFilter = 'unhealthy')}
          >
            <span class="w-2 h-2 rounded-full bg-red-500"></span>
            Issues
          </button>
        </div>

        <!-- Show Archived -->
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            bind:checked={showArchived}
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span class="text-sm text-gray-700">Archived</span>
        </label>

        <!-- Sort -->
        <div class="flex items-center gap-1">
          <select
            bind:value={sortField}
            class="text-sm border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="updatedAt">Last Updated</option>
            <option value="name">Name</option>
            <option value="activeAgents">Active Agents</option>
            <option value="healthStatus">Health Status</option>
            <option value="ticketCount">Tickets</option>
          </select>
          <Button
            variant="ghost"
            size="sm"
            onclick={() => (sortAsc = !sortAsc)}
          >
            {#if sortAsc}
              <SortAsc class="w-4 h-4" />
            {:else}
              <SortDesc class="w-4 h-4" />
            {/if}
          </Button>
        </div>

        <!-- View Mode -->
        <div class="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            class="p-1 rounded {viewMode === 'grid' ? 'bg-white shadow-sm' : ''}"
            onclick={() => (viewMode = 'grid')}
          >
            <Grid class="w-4 h-4" />
          </button>
          <button
            class="p-1 rounded {viewMode === 'list' ? 'bg-white shadow-sm' : ''}"
            onclick={() => (viewMode = 'list')}
          >
            <List class="w-4 h-4" />
          </button>
        </div>

        <!-- Refresh -->
        {#if onRefresh}
          <Button
            variant="outline"
            size="sm"
            onclick={handleRefresh}
            disabled={isRefreshing || loading}
          >
            <RefreshCw class="w-4 h-4 {isRefreshing ? 'animate-spin' : ''}" />
          </Button>
        {/if}
      </div>
    </div>
  </Card>

  <!-- Projects Grid/List -->
  {#if loading}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each Array(6) as _}
        <Card class="p-5 animate-pulse">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 bg-gray-200 rounded-lg"></div>
            <div class="flex-1">
              <div class="h-4 bg-gray-200 rounded w-32 mb-2"></div>
              <div class="h-3 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-2 mb-4">
            {#each Array(3) as _}
              <div class="h-12 bg-gray-100 rounded-lg"></div>
            {/each}
          </div>
          <div class="h-2 bg-gray-200 rounded w-full"></div>
        </Card>
      {/each}
    </div>
  {:else if filteredProjects.length === 0}
    <Card class="p-12 text-center">
      <FolderKanban class="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
      <p class="text-gray-500">
        {searchQuery
          ? 'Try adjusting your search query or filters'
          : 'Create your first project to get started'}
      </p>
    </Card>
  {:else if viewMode === 'grid'}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each filteredProjects as project (project.id)}
        <ProjectStatsCard
          {project}
          onViewDetails={handleViewDetails}
          onViewBoard={handleViewBoard}
        />
      {/each}
    </div>
  {:else}
    <div class="space-y-3">
      {#each filteredProjects as project (project.id)}
        <ProjectStatsCard
          {project}
          onViewDetails={handleViewDetails}
          onViewBoard={handleViewBoard}
          compact={true}
        />
      {/each}
    </div>
  {/if}

  <!-- Results Count -->
  {#if filteredProjects.length > 0}
    <div class="mt-4 text-sm text-gray-500 text-center">
      Showing {filteredProjects.length} of {projects.length} projects
    </div>
  {/if}
</div>

<style>
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }
</style>
