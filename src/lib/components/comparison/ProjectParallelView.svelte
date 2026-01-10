<script lang="ts">
  /**
   * GAP-UX.3: Project Parallel View Component
   *
   * Main component for multi-project comparison view.
   * Allows users to compare multiple projects side-by-side with:
   * - Side-by-side project comparison layout
   * - Key metrics comparison (velocity, completion rates)
   * - Pattern similarity indicators
   * - Timeline comparison
   */
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import ProjectComparisonCard from './ProjectComparisonCard.svelte';
  import MetricsComparisonChart from './MetricsComparisonChart.svelte';
  import PatternSimilarityIndicator from './PatternSimilarityIndicator.svelte';
  import TimelineComparison from './TimelineComparison.svelte';
  import type {
    ProjectComparisonData,
    PatternSimilarityResult,
    ComparisonMetricType
  } from '$lib/types/project-comparison';
  import { getProjectColor } from '$lib/types/project-comparison';
  import {
    Search,
    Filter,
    RefreshCw,
    Columns,
    BarChart2,
    GitCompare,
    Activity,
    X,
    Plus,
    ChevronDown,
    ChevronUp
  } from 'lucide-svelte';

  interface Props {
    projects: ProjectComparisonData[];
    similarities?: PatternSimilarityResult[];
    onRefresh?: () => Promise<void>;
    loading?: boolean;
    maxSelections?: number;
    class?: string;
  }

  let {
    projects,
    similarities = [],
    onRefresh,
    loading = false,
    maxSelections = 4,
    class: className = ''
  }: Props = $props();

  // State
  let searchQuery = $state('');
  let selectedProjectIds = $state<string[]>([]);
  let selectedMetric = $state<ComparisonMetricType>('velocity');
  let isRefreshing = $state(false);
  let showProjectSelector = $state(true);
  let showCharts = $state(true);

  // Metric options
  const metricOptions: { key: ComparisonMetricType; label: string; icon: typeof BarChart2 }[] = [
    { key: 'velocity', label: 'Velocity', icon: Activity },
    { key: 'completion', label: 'Completion', icon: BarChart2 },
    { key: 'cycleTime', label: 'Cycle Time', icon: Activity },
    { key: 'agents', label: 'Agents', icon: BarChart2 },
    { key: 'patterns', label: 'Patterns', icon: GitCompare }
  ];

  // Filter projects based on search
  let filteredProjects = $derived.by(() => {
    let result = projects.filter(p => !p.isArchived);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    return result;
  });

  // Selected projects data
  let selectedProjects = $derived(
    projects.filter(p => selectedProjectIds.includes(p.id))
  );

  // Relevant similarities for selected projects
  let relevantSimilarities = $derived(
    similarities.filter(
      s =>
        selectedProjectIds.includes(s.projectAId) &&
        selectedProjectIds.includes(s.projectBId)
    )
  );

  // Check if project is selected
  function isProjectSelected(projectId: string): boolean {
    return selectedProjectIds.includes(projectId);
  }

  // Toggle project selection
  function toggleProjectSelection(projectId: string) {
    if (selectedProjectIds.includes(projectId)) {
      selectedProjectIds = selectedProjectIds.filter(id => id !== projectId);
    } else if (selectedProjectIds.length < maxSelections) {
      selectedProjectIds = [...selectedProjectIds, projectId];
    }
  }

  // Remove project from selection
  function removeProject(projectId: string) {
    selectedProjectIds = selectedProjectIds.filter(id => id !== projectId);
  }

  // Clear all selections
  function clearSelections() {
    selectedProjectIds = [];
  }

  // Refresh data
  async function handleRefresh() {
    if (!onRefresh || isRefreshing) return;
    isRefreshing = true;
    try {
      await onRefresh();
    } finally {
      isRefreshing = false;
    }
  }
</script>

<div class="project-parallel-view {className}">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Project Comparison</h1>
      <p class="text-gray-500 mt-1">
        Compare metrics and patterns across multiple projects
      </p>
    </div>
    <div class="flex items-center gap-2">
      {#if selectedProjectIds.length > 0}
        <Button variant="outline" size="sm" onclick={clearSelections}>
          <X class="w-4 h-4 mr-1" />
          Clear ({selectedProjectIds.length})
        </Button>
      {/if}
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

  <!-- Selection Summary -->
  {#if selectedProjectIds.length > 0}
    <Card class="p-4 mb-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Columns class="w-4 h-4 text-blue-600" />
          <span class="font-medium text-gray-900">
            Comparing {selectedProjectIds.length} project{selectedProjectIds.length > 1 ? 's' : ''}
          </span>
        </div>
        <div class="flex items-center gap-2">
          {#each selectedProjects as project, i}
            <Badge
              class="flex items-center gap-1 cursor-pointer hover:opacity-80"
              style="background-color: {getProjectColor(i)}20; color: {getProjectColor(i)}"
              onclick={() => removeProject(project.id)}
            >
              {project.name}
              <X class="w-3 h-3" />
            </Badge>
          {/each}
          {#if selectedProjectIds.length < maxSelections}
            <Badge variant="secondary" class="text-xs">
              +{maxSelections - selectedProjectIds.length} more
            </Badge>
          {/if}
        </div>
      </div>
    </Card>
  {/if}

  <!-- Main Content Grid -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Left Column: Project Selector -->
    <div class="lg:col-span-1">
      <Card class="overflow-hidden">
        <button
          class="w-full p-4 flex items-center justify-between border-b border-gray-100 hover:bg-gray-50 transition-colors"
          onclick={() => (showProjectSelector = !showProjectSelector)}
        >
          <div class="flex items-center gap-2">
            <Plus class="w-4 h-4 text-gray-500" />
            <span class="font-semibold text-gray-900 text-sm">Select Projects</span>
          </div>
          {#if showProjectSelector}
            <ChevronUp class="w-4 h-4 text-gray-400" />
          {:else}
            <ChevronDown class="w-4 h-4 text-gray-400" />
          {/if}
        </button>

        {#if showProjectSelector}
          <div class="p-4">
            <!-- Search -->
            <div class="relative mb-4">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search projects..."
                bind:value={searchQuery}
                class="pl-10"
              />
            </div>

            <!-- Project List -->
            <div class="space-y-2 max-h-[400px] overflow-y-auto">
              {#if loading}
                {#each Array(3) as _}
                  <div class="animate-pulse">
                    <div class="h-24 bg-gray-100 rounded-lg"></div>
                  </div>
                {/each}
              {:else if filteredProjects.length === 0}
                <div class="text-center py-8 text-gray-500 text-sm">
                  No projects found
                </div>
              {:else}
                {#each filteredProjects as project, i}
                  {@const isSelected = isProjectSelected(project.id)}
                  {@const selectionIndex = selectedProjectIds.indexOf(project.id)}
                  <ProjectComparisonCard
                    {project}
                    index={selectionIndex >= 0 ? selectionIndex : i}
                    {isSelected}
                    onSelect={toggleProjectSelection}
                    onRemove={removeProject}
                    showRemoveButton={true}
                  />
                {/each}
              {/if}
            </div>
          </div>
        {/if}
      </Card>
    </div>

    <!-- Right Column: Comparison Charts -->
    <div class="lg:col-span-2 space-y-6">
      {#if selectedProjectIds.length === 0}
        <Card class="p-12 text-center">
          <Columns class="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            Select Projects to Compare
          </h3>
          <p class="text-gray-500 max-w-md mx-auto">
            Choose up to {maxSelections} projects from the list to see side-by-side
            comparisons of metrics, patterns, and activity timelines.
          </p>
        </Card>
      {:else}
        <!-- Metric Selector -->
        <Card class="p-4">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-gray-700">Compare by:</span>
            <div class="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              {#each metricOptions as option}
                <button
                  class="px-3 py-1.5 text-xs rounded transition-colors
                    {selectedMetric === option.key
                      ? 'bg-white shadow-sm text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'}"
                  onclick={() => (selectedMetric = option.key)}
                >
                  {option.label}
                </button>
              {/each}
            </div>
          </div>
        </Card>

        <!-- Side-by-Side Project Cards -->
        <div class="grid gap-4" style="grid-template-columns: repeat({Math.min(selectedProjects.length, 4)}, 1fr)">
          {#each selectedProjects as project, i}
            <ProjectComparisonCard
              {project}
              index={i}
              isSelected={true}
              onRemove={removeProject}
              showRemoveButton={true}
            />
          {/each}
        </div>

        <!-- Collapsible Charts Section -->
        <Card class="overflow-hidden">
          <button
            class="w-full p-4 flex items-center justify-between border-b border-gray-100 hover:bg-gray-50 transition-colors"
            onclick={() => (showCharts = !showCharts)}
          >
            <div class="flex items-center gap-2">
              <BarChart2 class="w-4 h-4 text-gray-500" />
              <span class="font-semibold text-gray-900 text-sm">Detailed Comparisons</span>
            </div>
            {#if showCharts}
              <ChevronUp class="w-4 h-4 text-gray-400" />
            {:else}
              <ChevronDown class="w-4 h-4 text-gray-400" />
            {/if}
          </button>

          {#if showCharts}
            <div class="p-4 space-y-6">
              <!-- Metrics Chart -->
              <MetricsComparisonChart
                projects={selectedProjects}
                metricType={selectedMetric}
              />

              <!-- Pattern Similarity -->
              {#if selectedProjects.length >= 2}
                <PatternSimilarityIndicator
                  projects={selectedProjects}
                  similarities={relevantSimilarities}
                />
              {/if}

              <!-- Timeline -->
              <TimelineComparison projects={selectedProjects} />
            </div>
          {/if}
        </Card>
      {/if}
    </div>
  </div>
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
