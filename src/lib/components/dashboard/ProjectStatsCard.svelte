<script lang="ts">
  /**
   * GAP-3.1.4: Project Stats Card Component
   * GAP-A1.2: Added "Open in Editor" quick action
   *
   * Displays project health and statistics including:
   * - Health indicator
   * - Active agent count badge
   * - Last activity timestamp
   * - Quick stats (tickets, completion rate)
   * - Open in Editor button (when workspace path is set)
   */
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import ProjectHealthIndicator from './ProjectHealthIndicator.svelte';
  import type { HealthStatus } from '$lib/types/dashboard';
  import {
    FolderKanban,
    Ticket,
    Users,
    Bot,
    TrendingUp,
    Clock,
    ExternalLink,
    Code2
  } from 'lucide-svelte';
  import { openInEditor, isValidEditorPath, getEditorName } from '$lib/utils/editor';

  interface ProjectStats {
    id: string;
    name: string;
    description?: string | null;
    workspacePath?: string | null; // GAP-A1.2: Workspace path for "Open in Editor"
    ticketCount: number;
    completedTickets: number;
    memberCount: number;
    activeAgents: number;
    patternCount: number;
    isArchived: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
    lastActivityAt?: Date | string | null;
    healthStatus: HealthStatus;
    healthMessage?: string;
  }

  interface Props {
    project: ProjectStats;
    onViewDetails?: (projectId: string) => void;
    onViewBoard?: (projectId: string) => void;
    compact?: boolean;
    class?: string;
  }

  let {
    project,
    onViewDetails,
    onViewBoard,
    compact = false,
    class: className = ''
  }: Props = $props();

  // GAP-A1.2: Check if workspace path is valid for editor opening
  let canOpenInEditor = $derived(isValidEditorPath(project.workspacePath));
  let editorName = $derived(getEditorName());

  let completionPercentage = $derived(
    project.ticketCount > 0
      ? Math.round((project.completedTickets / project.ticketCount) * 100)
      : 0
  );

  function formatRelativeTime(date: Date | string | null | undefined): string {
    if (!date) return 'Never';

    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return d.toLocaleDateString();
  }

  function handleViewDetails() {
    if (onViewDetails) {
      onViewDetails(project.id);
    }
  }

  function handleViewBoard() {
    if (onViewBoard) {
      onViewBoard(project.id);
    }
  }

  // GAP-A1.2: Open project workspace in editor
  function handleOpenInEditor() {
    if (canOpenInEditor && project.workspacePath) {
      openInEditor(project.workspacePath);
    }
  }
</script>

<Card class="overflow-hidden hover:shadow-md transition-shadow {project.isArchived ? 'opacity-75' : ''} {className}">
  <div class="p-4 {compact ? '' : 'p-5'}">
    <!-- Header -->
    <div class="flex items-start justify-between mb-3">
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <div
          class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0
            {project.isArchived ? 'bg-gray-100' : 'bg-blue-100'}"
        >
          <FolderKanban
            class="w-5 h-5 {project.isArchived ? 'text-gray-500' : 'text-blue-600'}"
          />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <h3 class="font-semibold text-gray-900 truncate">{project.name}</h3>
            <ProjectHealthIndicator
              status={project.healthStatus}
              activeAgents={project.activeAgents}
              lastActivity={project.lastActivityAt}
              message={project.healthMessage}
              size="sm"
            />
          </div>
          {#if project.isArchived}
            <Badge variant="secondary" class="mt-1">Archived</Badge>
          {/if}
        </div>
      </div>

      <!-- Active Agents Badge -->
      {#if project.activeAgents > 0}
        <div class="shrink-0 ml-2">
          <Badge variant="default" class="flex items-center gap-1">
            <Bot class="w-3 h-3" />
            <span>{project.activeAgents}</span>
          </Badge>
        </div>
      {/if}
    </div>

    <!-- Description (only in non-compact mode) -->
    {#if !compact && project.description}
      <p class="text-sm text-gray-500 mb-3 line-clamp-2">
        {project.description}
      </p>
    {/if}

    <!-- Quick Stats Grid -->
    <div class="grid grid-cols-3 gap-2 {compact ? 'mb-3' : 'mb-4'}">
      <div class="text-center p-2 bg-gray-50 rounded-lg">
        <div class="flex items-center justify-center gap-1 text-gray-600">
          <Ticket class="w-3.5 h-3.5" />
          <span class="font-semibold text-sm">{project.ticketCount}</span>
        </div>
        <p class="text-xs text-gray-500">Tickets</p>
      </div>
      <div class="text-center p-2 bg-gray-50 rounded-lg">
        <div class="flex items-center justify-center gap-1 text-gray-600">
          <Users class="w-3.5 h-3.5" />
          <span class="font-semibold text-sm">{project.memberCount}</span>
        </div>
        <p class="text-xs text-gray-500">Members</p>
      </div>
      <div class="text-center p-2 bg-gray-50 rounded-lg">
        <div class="flex items-center justify-center gap-1 text-gray-600">
          <Bot class="w-3.5 h-3.5" />
          <span class="font-semibold text-sm">{project.activeAgents}</span>
        </div>
        <p class="text-xs text-gray-500">Agents</p>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="mb-3">
      <div class="flex items-center justify-between text-xs mb-1">
        <span class="text-gray-500 flex items-center gap-1">
          <TrendingUp class="w-3 h-3" />
          Completion
        </span>
        <span class="font-medium text-gray-700">{completionPercentage}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-1.5">
        <div
          class="h-1.5 rounded-full transition-all duration-300
            {completionPercentage === 100 ? 'bg-green-500' :
             completionPercentage >= 75 ? 'bg-blue-500' :
             completionPercentage >= 50 ? 'bg-blue-400' :
             completionPercentage >= 25 ? 'bg-yellow-500' : 'bg-gray-400'}"
          style="width: {completionPercentage}%"
        ></div>
      </div>
    </div>

    <!-- Last Activity -->
    <div class="flex items-center justify-between text-xs text-gray-400 {compact ? 'mb-2' : 'mb-3'}">
      <span class="flex items-center gap-1">
        <Clock class="w-3 h-3" />
        Last activity: {formatRelativeTime(project.lastActivityAt || project.updatedAt)}
      </span>
      {#if project.patternCount > 0}
        <span>{project.patternCount} patterns</span>
      {/if}
    </div>

    <!-- Actions -->
    {#if onViewDetails || onViewBoard || canOpenInEditor}
      <div class="flex items-center gap-2 pt-3 border-t border-gray-100">
        {#if onViewBoard}
          <Button
            variant="outline"
            size="sm"
            class="flex-1"
            onclick={handleViewBoard}
          >
            <FolderKanban class="w-4 h-4 mr-1" />
            Board
          </Button>
        {/if}
        {#if canOpenInEditor}
          <!-- GAP-A1.2: Open in Editor button -->
          <Button
            variant="ghost"
            size="sm"
            onclick={handleOpenInEditor}
            title="Open in {editorName}"
          >
            <Code2 class="w-4 h-4" />
          </Button>
        {/if}
        {#if onViewDetails}
          <Button
            variant="ghost"
            size="sm"
            onclick={handleViewDetails}
          >
            <ExternalLink class="w-4 h-4" />
          </Button>
        {/if}
      </div>
    {/if}
  </div>
</Card>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
