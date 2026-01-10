<script lang="ts">
  /**
   * TASK-019: Add Project Selector/Dashboard
   *
   * Dashboard showing all projects with the ability to create new ones.
   */
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { Plus, FolderKanban, Ticket } from 'lucide-svelte';

  export let data: PageData;
  export let form: ActionData;

  let showCreateForm = false;
  let isSubmitting = false;
</script>

<svelte:head>
  <title>Projects | CF Kanban</title>
  <meta name="description" content="AI-powered Kanban board - Manage your projects" />
</svelte:head>

<main class="min-h-screen bg-gray-50 p-6 md:p-8">
  <!-- Header -->
  <header class="max-w-6xl mx-auto mb-8">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Projects</h1>
        <p class="mt-1 text-gray-600">Manage your Kanban boards</p>
      </div>
      <Button onclick={() => (showCreateForm = true)}>
        <Plus class="w-4 h-4 mr-2" />
        New Project
      </Button>
    </div>
  </header>

  <!-- Create project form -->
  {#if showCreateForm}
    <div class="max-w-6xl mx-auto mb-8">
      <Card class="p-6">
        <h2 class="text-lg font-semibold mb-4">Create New Project</h2>

        {#if form?.error}
          <div class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {form.error}
          </div>
        {/if}

        <form
          method="POST"
          action="?/createProject"
          use:enhance={() => {
            isSubmitting = true;
            return async ({ update }) => {
              isSubmitting = false;
              await update();
            };
          }}
          class="space-y-4"
        >
          <div>
            <label for="project-name" class="block text-sm font-medium text-gray-700 mb-1">
              Project Name <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="project-name"
              name="name"
              required
              value={form?.name ?? ''}
              disabled={isSubmitting}
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     disabled:opacity-50"
              placeholder="My Awesome Project"
            />
          </div>

          <div>
            <label for="project-description" class="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="project-description"
              name="description"
              rows="2"
              value={form?.description ?? ''}
              disabled={isSubmitting}
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     disabled:opacity-50"
              placeholder="A brief description of your project..."
            ></textarea>
          </div>

          <div class="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onclick={() => (showCreateForm = false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  {/if}

  <!-- Projects grid -->
  <div class="max-w-6xl mx-auto">
    {#if data.projects.length > 0}
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each data.projects as project}
          <a
            href="/projects/{project.id}"
            class="block group"
          >
            <Card class="p-5 hover:shadow-md transition-shadow duration-200 h-full">
              <div class="flex items-start gap-3">
                <div class="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-100 transition-colors">
                  <FolderKanban class="w-5 h-5" />
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {project.name}
                  </h3>
                  {#if project.description}
                    <p class="text-sm text-gray-500 mt-1 line-clamp-2">
                      {project.description}
                    </p>
                  {/if}
                  <div class="flex items-center gap-1 mt-3 text-xs text-gray-400">
                    <Ticket class="w-3.5 h-3.5" />
                    <span>{project._count.tickets} ticket{project._count.tickets !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            </Card>
          </a>
        {/each}
      </div>
    {:else}
      <!-- Empty state -->
      <div class="text-center py-16">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
          <FolderKanban class="w-8 h-8 text-gray-400" />
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">No projects yet</h2>
        <p class="text-gray-600 mb-6">Create your first project to get started with CF Kanban.</p>
        <Button onclick={() => (showCreateForm = true)}>
          <Plus class="w-4 h-4 mr-2" />
          Create Your First Project
        </Button>
      </div>
    {/if}
  </div>
</main>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
