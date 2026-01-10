<script lang="ts">
  /**
   * TASK-102: Project Overview Page
   *
   * List all projects with stats, member management,
   * and archive/delete functionality.
   */
  import type { PageData } from './$types';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import {
    FolderKanban,
    Search,
    ChevronLeft,
    ChevronRight,
    Archive,
    ArchiveRestore,
    Trash2,
    Users,
    Ticket,
    TrendingUp,
    Eye,
    MoreVertical,
    Brain
  } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();

  // State
  let searchQuery = $state('');
  let showArchived = $state(false);
  let selectedProject = $state<(typeof data.projects.data)[0] | null>(null);
  let showMembersModal = $state(false);

  // Pagination
  let currentPage = $state(data.projects.page);

  // Filter projects
  let filteredProjects = $derived.by(() => {
    let projects = data.projects.data;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      projects = projects.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    if (!showArchived) {
      projects = projects.filter((p) => !p.isArchived);
    }

    return projects;
  });

  async function handleArchive(projectId: string) {
    try {
      await fetch(`/api/admin/projects/${projectId}/archive`, {
        method: 'POST'
      });
      window.location.reload();
    } catch (err) {
      console.error('Failed to archive project:', err);
    }
  }

  async function handleUnarchive(projectId: string) {
    try {
      await fetch(`/api/admin/projects/${projectId}/unarchive`, {
        method: 'POST'
      });
      window.location.reload();
    } catch (err) {
      console.error('Failed to unarchive project:', err);
    }
  }

  async function handleDelete(projectId: string) {
    if (
      !confirm(
        'Are you sure you want to delete this project? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      await fetch(`/api/admin/projects/${projectId}`, {
        method: 'DELETE'
      });
      window.location.reload();
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  }

  function getCompletionPercentage(project: (typeof data.projects.data)[0]): number {
    if (project.ticketCount === 0) return 0;
    return Math.round((project.completedTickets / project.ticketCount) * 100);
  }

  function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }
</script>

<div class="project-overview">
  <!-- Page Header -->
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Project Overview</h1>
      <p class="text-gray-500 mt-1">
        {data.projects.total} projects total
      </p>
    </div>
  </div>

  <!-- Filters -->
  <Card class="p-4 mb-6">
    <div class="flex flex-col sm:flex-row gap-4 items-center">
      <div class="flex-1 relative w-full">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="search"
          placeholder="Search projects..."
          bind:value={searchQuery}
          class="pl-10"
        />
      </div>
      <label class="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          bind:checked={showArchived}
          class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span class="text-sm text-gray-700">Show archived</span>
      </label>
    </div>
  </Card>

  <!-- Stats Summary -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-blue-100 rounded-lg">
          <FolderKanban class="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p class="text-2xl font-bold text-gray-900">
            {data.stats.totalProjects}
          </p>
          <p class="text-sm text-gray-500">Total Projects</p>
        </div>
      </div>
    </Card>
    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-green-100 rounded-lg">
          <TrendingUp class="w-5 h-5 text-green-600" />
        </div>
        <div>
          <p class="text-2xl font-bold text-gray-900">
            {data.stats.activeProjects}
          </p>
          <p class="text-sm text-gray-500">Active</p>
        </div>
      </div>
    </Card>
    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-purple-100 rounded-lg">
          <Ticket class="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <p class="text-2xl font-bold text-gray-900">
            {data.stats.totalTickets}
          </p>
          <p class="text-sm text-gray-500">Total Tickets</p>
        </div>
      </div>
    </Card>
    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-amber-100 rounded-lg">
          <Archive class="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p class="text-2xl font-bold text-gray-900">
            {data.stats.archivedProjects}
          </p>
          <p class="text-sm text-gray-500">Archived</p>
        </div>
      </div>
    </Card>
  </div>

  <!-- Projects Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {#each filteredProjects as project}
      <Card class="overflow-hidden">
        <div class="p-5">
          <!-- Header -->
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-lg flex items-center justify-center
                  {project.isArchived ? 'bg-gray-100' : 'bg-blue-100'}"
              >
                <FolderKanban
                  class="w-5 h-5 {project.isArchived
                    ? 'text-gray-500'
                    : 'text-blue-600'}"
                />
              </div>
              <div>
                <h3 class="font-semibold text-gray-900">{project.name}</h3>
                {#if project.isArchived}
                  <Badge variant="secondary">Archived</Badge>
                {/if}
              </div>
            </div>
          </div>

          <!-- Description -->
          {#if project.description}
            <p class="text-sm text-gray-500 mb-4 line-clamp-2">
              {project.description}
            </p>
          {/if}

          <!-- Stats -->
          <div class="grid grid-cols-3 gap-4 mb-4">
            <div class="text-center">
              <div class="flex items-center justify-center gap-1 text-gray-600">
                <Ticket class="w-4 h-4" />
                <span class="font-semibold">{project.ticketCount}</span>
              </div>
              <p class="text-xs text-gray-500">Tickets</p>
            </div>
            <div class="text-center">
              <div class="flex items-center justify-center gap-1 text-gray-600">
                <Users class="w-4 h-4" />
                <span class="font-semibold">{project.memberCount}</span>
              </div>
              <p class="text-xs text-gray-500">Members</p>
            </div>
            <div class="text-center">
              <div class="flex items-center justify-center gap-1 text-gray-600">
                <Brain class="w-4 h-4" />
                <span class="font-semibold">{project.patternCount}</span>
              </div>
              <p class="text-xs text-gray-500">Patterns</p>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="mb-4">
            <div class="flex items-center justify-between text-sm mb-1">
              <span class="text-gray-500">Completion</span>
              <span class="font-medium text-gray-900">
                {getCompletionPercentage(project)}%
              </span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div
                class="bg-blue-600 h-2 rounded-full transition-all"
                style="width: {getCompletionPercentage(project)}%"
              ></div>
            </div>
          </div>

          <!-- Footer -->
          <div
            class="flex items-center justify-between pt-4 border-t border-gray-100"
          >
            <span class="text-xs text-gray-400">
              Updated {formatDate(project.updatedAt)}
            </span>
            <div class="flex items-center gap-1">
              <a href="/projects/{project.id}">
                <Button variant="ghost" size="sm">
                  <Eye class="w-4 h-4" />
                </Button>
              </a>
              <Button
                variant="ghost"
                size="sm"
                onclick={() => {
                  selectedProject = project;
                  showMembersModal = true;
                }}
              >
                <Users class="w-4 h-4" />
              </Button>
              {#if project.isArchived}
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => handleUnarchive(project.id)}
                >
                  <ArchiveRestore class="w-4 h-4" />
                </Button>
              {:else}
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => handleArchive(project.id)}
                >
                  <Archive class="w-4 h-4" />
                </Button>
              {/if}
              <Button
                variant="ghost"
                size="sm"
                onclick={() => handleDelete(project.id)}
                class="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 class="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    {/each}
  </div>

  <!-- Empty State -->
  {#if filteredProjects.length === 0}
    <Card class="p-12 text-center">
      <FolderKanban class="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
      <p class="text-gray-500">
        {searchQuery
          ? 'Try adjusting your search query'
          : 'Create your first project to get started'}
      </p>
    </Card>
  {/if}

  <!-- Pagination -->
  {#if data.projects.totalPages > 1}
    <div class="flex items-center justify-center gap-2 mt-6">
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage <= 1}
        onclick={() => (window.location.href = `?page=${currentPage - 1}`)}
      >
        <ChevronLeft class="w-4 h-4" />
      </Button>
      <span class="text-sm text-gray-700">
        Page {currentPage} of {data.projects.totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage >= data.projects.totalPages}
        onclick={() => (window.location.href = `?page=${currentPage + 1}`)}
      >
        <ChevronRight class="w-4 h-4" />
      </Button>
    </div>
  {/if}
</div>

<!-- Members Modal -->
{#if showMembersModal && selectedProject}
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    onclick={() => (showMembersModal = false)}
  >
    <div
      class="bg-white rounded-lg shadow-xl w-full max-w-md p-6"
      onclick={(e) => e.stopPropagation()}
    >
      <h2 class="text-xl font-bold text-gray-900 mb-4">
        {selectedProject.name} - Members
      </h2>

      <div class="text-center py-8 text-gray-500">
        <Users class="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p>Member management available in the project view</p>
      </div>

      <div class="flex justify-end mt-4">
        <Button variant="outline" onclick={() => (showMembersModal = false)}>
          Close
        </Button>
      </div>
    </div>
  </div>
{/if}

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
