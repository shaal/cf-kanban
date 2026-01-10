<script lang="ts">
  /**
   * GAP-UX.3: Project Comparison Card Component
   *
   * A compact card for displaying a project in the parallel comparison view.
   * Shows key metrics, health status, and provides selection functionality.
   */
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import ProjectHealthIndicator from '$lib/components/dashboard/ProjectHealthIndicator.svelte';
  import type { ProjectComparisonData, TrendDirection } from '$lib/types/project-comparison';
  import { getProjectColor, getTrendColor } from '$lib/types/project-comparison';
  import {
    FolderKanban,
    Ticket,
    Bot,
    TrendingUp,
    TrendingDown,
    Minus,
    Clock,
    Zap,
    Check,
    X
  } from 'lucide-svelte';

  interface Props {
    project: ProjectComparisonData;
    index: number;
    isSelected?: boolean;
    onSelect?: (projectId: string) => void;
    onRemove?: (projectId: string) => void;
    showRemoveButton?: boolean;
    class?: string;
  }

  let {
    project,
    index,
    isSelected = false,
    onSelect,
    onRemove,
    showRemoveButton = false,
    class: className = ''
  }: Props = $props();

  let projectColor = $derived(getProjectColor(index));

  let completionPercentage = $derived(
    project.ticketCount > 0
      ? Math.round((project.completedTickets / project.ticketCount) * 100)
      : 0
  );

  function handleSelect() {
    if (onSelect) {
      onSelect(project.id);
    }
  }

  function handleRemove(e: MouseEvent) {
    e.stopPropagation();
    if (onRemove) {
      onRemove(project.id);
    }
  }

  function getTrendIconComponent(trend: TrendDirection) {
    switch (trend) {
      case 'up':
        return TrendingUp;
      case 'down':
        return TrendingDown;
      default:
        return Minus;
    }
  }
</script>

<Card
  class="relative overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-md
    {isSelected ? 'ring-2 ring-offset-2' : ''}
    {project.isArchived ? 'opacity-75' : ''} {className}"
  style={isSelected ? `--tw-ring-color: ${projectColor}` : ''}
>
  <!-- Color bar at top -->
  <div
    class="h-1 w-full"
    style="background-color: {projectColor}"
  ></div>

  <!-- Remove button (positioned absolutely to avoid nesting inside button) -->
  {#if showRemoveButton && isSelected}
    <button
      class="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors z-10"
      onclick={handleRemove}
      title="Remove from comparison"
      type="button"
    >
      <X class="w-4 h-4" />
    </button>
  {/if}

  <button
    class="w-full text-left p-4"
    onclick={handleSelect}
    type="button"
  >
    <!-- Header -->
    <div class="flex items-start justify-between mb-3">
      <div class="flex items-center gap-2 min-w-0 flex-1">
        <div
          class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style="background-color: {projectColor}20"
        >
          <FolderKanban
            class="w-4 h-4"
            style="color: {projectColor}"
          />
        </div>
        <div class="min-w-0 flex-1">
          <h3 class="font-semibold text-gray-900 truncate text-sm">
            {project.name}
          </h3>
          <ProjectHealthIndicator
            status={project.healthStatus}
            activeAgents={project.activeAgents}
            lastActivity={project.lastActivityAt}
            size="sm"
          />
        </div>
      </div>
    </div>

    <!-- Metrics Grid -->
    <div class="grid grid-cols-2 gap-2 mb-3">
      <!-- Velocity -->
      <div class="bg-gray-50 rounded-lg p-2">
        <div class="flex items-center gap-1 text-xs text-gray-500 mb-1">
          <Zap class="w-3 h-3" />
          Velocity
        </div>
        <div class="flex items-center gap-1">
          <span class="font-semibold text-gray-900 text-sm">
            {project.velocity.toFixed(1)}
          </span>
          <span class="text-xs text-gray-500">/wk</span>
          <svelte:component
            this={getTrendIconComponent(project.trends.velocityTrend)}
            class="w-3 h-3 {getTrendColor(project.trends.velocityTrend)}"
          />
        </div>
      </div>

      <!-- Cycle Time -->
      <div class="bg-gray-50 rounded-lg p-2">
        <div class="flex items-center gap-1 text-xs text-gray-500 mb-1">
          <Clock class="w-3 h-3" />
          Cycle Time
        </div>
        <div class="flex items-center gap-1">
          <span class="font-semibold text-gray-900 text-sm">
            {project.avgCycleTime.toFixed(0)}
          </span>
          <span class="text-xs text-gray-500">hrs</span>
        </div>
      </div>

      <!-- Tickets -->
      <div class="bg-gray-50 rounded-lg p-2">
        <div class="flex items-center gap-1 text-xs text-gray-500 mb-1">
          <Ticket class="w-3 h-3" />
          Tickets
        </div>
        <div class="flex items-center gap-1">
          <span class="font-semibold text-gray-900 text-sm">
            {project.completedTickets}
          </span>
          <span class="text-xs text-gray-500">/ {project.ticketCount}</span>
        </div>
      </div>

      <!-- Active Agents -->
      <div class="bg-gray-50 rounded-lg p-2">
        <div class="flex items-center gap-1 text-xs text-gray-500 mb-1">
          <Bot class="w-3 h-3" />
          Agents
        </div>
        <span class="font-semibold text-gray-900 text-sm">
          {project.activeAgents}
        </span>
      </div>
    </div>

    <!-- Completion Bar -->
    <div class="mb-2">
      <div class="flex items-center justify-between text-xs mb-1">
        <span class="text-gray-500">Completion</span>
        <span class="font-medium" style="color: {projectColor}">
          {completionPercentage}%
        </span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-1.5">
        <div
          class="h-1.5 rounded-full transition-all duration-300"
          style="width: {completionPercentage}%; background-color: {projectColor}"
        ></div>
      </div>
    </div>

    <!-- Pattern Domains (if available) -->
    {#if project.patternDomains && project.patternDomains.length > 0}
      <div class="flex flex-wrap gap-1">
        {#each project.patternDomains.slice(0, 3) as domain}
          <Badge variant="secondary" class="text-xs py-0">
            {domain.domain}: {domain.count}
          </Badge>
        {/each}
        {#if project.patternDomains.length > 3}
          <Badge variant="secondary" class="text-xs py-0">
            +{project.patternDomains.length - 3}
          </Badge>
        {/if}
      </div>
    {/if}
  </button>

  <!-- Selection indicator -->
  {#if isSelected}
    <div
      class="absolute bottom-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
      style="background-color: {projectColor}"
    >
      <Check class="w-3 h-3 text-white" />
    </div>
  {/if}
</Card>
