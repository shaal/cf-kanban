<script lang="ts">
  /**
   * TASK-019: Add Project Selector/Dashboard
   * AMENDMENT-001: Added workspace path configuration
   * GAP-A1.1: Added workspace path validation
   * GAP-3.1.1: Added project template selection
   *
   * Dashboard showing all projects with the ability to create new ones.
   */
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import PathValidationIndicator from '$lib/components/ui/PathValidationIndicator.svelte';
  import DuplicatePathWarningModal from '$lib/components/ui/DuplicatePathWarningModal.svelte';
  import { TemplateSelector } from '$lib/components/templates';
  import { Plus, FolderKanban, Ticket, Folder, Bot, Cpu, Brain, Zap, ChevronDown, ChevronUp } from 'lucide-svelte';

  export let data: PageData;
  export let form: ActionData;

  let showCreateForm = false;
  let isSubmitting = false;
  let showCapabilities = false; // Hide capabilities by default - template section is more prominent now

  // GAP-3.1.1: Selected template state
  let selectedTemplateId: string | null = form?.templateId ?? null;

  // GAP-A1.1: Path validation state
  let pathValidationStatus: 'idle' | 'validating' | 'valid' | 'warning' | 'error' = 'idle';
  let pathValidationMessage = '';
  let pathValidationResult: {
    valid: boolean;
    exists: boolean;
    isDuplicate: boolean;
    duplicateProjectId?: string;
    duplicateProjectName?: string;
    warnings: string[];
    errors: string[];
  } | null = null;

  // Duplicate path warning modal
  let showDuplicateWarning = false;
  let pendingFormSubmit: (() => void) | null = null;
  let workspacePathValue = '';

  /**
   * GAP-A1.1: Validate workspace path on blur
   */
  async function validateWorkspacePath(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    const path = input.value.trim();
    workspacePathValue = path;

    if (!path) {
      pathValidationStatus = 'idle';
      pathValidationMessage = '';
      pathValidationResult = null;
      return;
    }

    pathValidationStatus = 'validating';
    pathValidationMessage = 'Validating path...';

    try {
      const response = await fetch('/api/projects/validate-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });

      const result = await response.json();
      pathValidationResult = result;

      if (result.errors && result.errors.length > 0) {
        pathValidationStatus = 'error';
        pathValidationMessage = result.errors[0];
      } else if (result.warnings && result.warnings.length > 0) {
        pathValidationStatus = 'warning';
        pathValidationMessage = result.warnings[0];
      } else if (result.exists && result.isDirectory) {
        pathValidationStatus = 'valid';
        pathValidationMessage = 'Path exists and is a valid directory';
      } else if (result.isAbsolute) {
        pathValidationStatus = 'valid';
        pathValidationMessage = 'Valid absolute path format';
      } else {
        pathValidationStatus = 'idle';
        pathValidationMessage = '';
      }
    } catch {
      pathValidationStatus = 'error';
      pathValidationMessage = 'Failed to validate path';
      pathValidationResult = null;
    }
  }

  /**
   * GAP-A1.1: Handle duplicate path warning confirmation
   */
  function handleDuplicateContinue() {
    showDuplicateWarning = false;
    if (pendingFormSubmit) {
      pendingFormSubmit();
      pendingFormSubmit = null;
    }
  }

  function handleDuplicateCancel() {
    showDuplicateWarning = false;
    pendingFormSubmit = null;
    isSubmitting = false;
  }
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
          use:enhance={({ cancel }) => {
            // GAP-A1.1: Check for duplicate path before submitting
            if (pathValidationResult?.isDuplicate && !showDuplicateWarning) {
              cancel();
              showDuplicateWarning = true;
              pendingFormSubmit = () => {
                // Re-submit the form after user confirms
                const formElement = document.querySelector('form[action="?/createProject"]') as HTMLFormElement;
                if (formElement) {
                  isSubmitting = true;
                  formElement.requestSubmit();
                }
              };
              return;
            }

            isSubmitting = true;
            return async ({ update }) => {
              isSubmitting = false;
              await update();
            };
          }}
          class="space-y-5"
        >
          <!-- AMENDMENT-001: Workspace Path (First and Required) -->
          <!-- GAP-A1.1: Added path validation on blur -->
          <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <label for="workspace-path" class="block text-sm font-medium text-blue-900 mb-1">
              <span class="flex items-center gap-2">
                <Folder class="w-4 h-4" />
                Codebase Folder <span class="text-red-500">*</span>
              </span>
            </label>
            <p class="text-xs text-blue-700 mb-2">
              The local folder where Claude Code will operate. This should be your project's root directory.
            </p>
            <input
              type="text"
              id="workspace-path"
              name="workspacePath"
              required
              value={form?.workspacePath ?? ''}
              disabled={isSubmitting}
              class="w-full px-3 py-2 border rounded-md text-sm font-mono
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     disabled:opacity-50 bg-white
                     {pathValidationStatus === 'error' ? 'border-red-400' :
                      pathValidationStatus === 'warning' ? 'border-amber-400' :
                      pathValidationStatus === 'valid' ? 'border-green-400' :
                      'border-blue-300'}"
              placeholder="/Users/you/code/my-project"
              on:blur={validateWorkspacePath}
              on:input={() => {
                // Reset validation when user starts typing again
                if (pathValidationStatus !== 'idle') {
                  pathValidationStatus = 'idle';
                  pathValidationMessage = '';
                }
              }}
            />
            <!-- GAP-A1.1: Path validation indicator -->
            <PathValidationIndicator
              status={pathValidationStatus}
              message={pathValidationMessage}
              class="mt-2"
            />
            {#if pathValidationStatus === 'idle'}
              <p class="text-xs text-blue-600 mt-1">
                Example: /Users/dev/my-app or /home/dev/projects/api
              </p>
            {/if}
          </div>

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

          <!-- GAP-3.1.1: Template Selection -->
          {#if data.templates && data.templates.length > 0}
            <div class="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <TemplateSelector
                templates={data.templates}
                templatesByCategory={data.templatesByCategory}
                bind:selectedTemplateId
              />
            </div>
          {/if}

          <!-- AMENDMENT-001: Claude Flow Capabilities Overview -->
          <div class="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onclick={() => (showCapabilities = !showCapabilities)}
              class="w-full px-4 py-3 bg-gray-50 flex items-center justify-between text-left hover:bg-gray-100 transition-colors"
            >
              <span class="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Bot class="w-4 h-4 text-purple-600" />
                What can Claude Flow do for this project?
              </span>
              {#if showCapabilities}
                <ChevronUp class="w-4 h-4 text-gray-500" />
              {:else}
                <ChevronDown class="w-4 h-4 text-gray-500" />
              {/if}
            </button>

            {#if showCapabilities}
              <div class="p-4 bg-white border-t border-gray-200">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="flex gap-3">
                    <div class="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Bot class="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <h4 class="text-sm font-medium text-gray-900">60+ Specialized Agents</h4>
                      <p class="text-xs text-gray-500">Coder, Tester, Security Architect, Reviewer, and more work on your tickets</p>
                    </div>
                  </div>

                  <div class="flex gap-3">
                    <div class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Cpu class="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 class="text-sm font-medium text-gray-900">Swarm Orchestration</h4>
                      <p class="text-xs text-gray-500">Multiple agents collaborate on complex tasks with different topologies</p>
                    </div>
                  </div>

                  <div class="flex gap-3">
                    <div class="flex-shrink-0 w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Brain class="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h4 class="text-sm font-medium text-gray-900">Learning & Memory</h4>
                      <p class="text-xs text-gray-500">Patterns are learned from successes and reused across tasks</p>
                    </div>
                  </div>

                  <div class="flex gap-3">
                    <div class="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Zap class="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <h4 class="text-sm font-medium text-gray-900">12 Background Workers</h4>
                      <p class="text-xs text-gray-500">Security audits, test gap analysis, performance optimization run automatically</p>
                    </div>
                  </div>
                </div>

                <div class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p class="text-xs text-amber-800">
                    <strong>How it works:</strong> Create tickets describing what you need → Drag to "In Progress" →
                    Agents spawn and execute the work in your codebase folder → Review and approve the results.
                  </p>
                </div>
              </div>
            {/if}
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
                  <!-- AMENDMENT-001: Display workspace path -->
                  {#if project.workspacePath}
                    <div class="flex items-center gap-1 mt-2 text-xs text-gray-400">
                      <Folder class="w-3 h-3 flex-shrink-0" />
                      <span class="font-mono truncate" title={project.workspacePath}>
                        {project.workspacePath}
                      </span>
                    </div>
                  {:else}
                    <div class="flex items-center gap-1 mt-2 text-xs text-amber-500">
                      <Folder class="w-3 h-3 flex-shrink-0" />
                      <span>No folder configured</span>
                    </div>
                  {/if}
                  <div class="flex items-center gap-1 mt-1 text-xs text-gray-400">
                    <Ticket class="w-3.5 h-3.5" />
                    <span>{project._count.tickets} ticket{project._count.tickets !== 1 ? 's' : ''}</span>
                  </div>
                  <!-- GAP-3.1.1: Display template badge if assigned -->
                  {#if project.template}
                    <div class="flex items-center gap-1 mt-1">
                      <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">
                        {project.template.name}
                      </span>
                    </div>
                  {/if}
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

<!-- GAP-A1.1: Duplicate path warning modal -->
<DuplicatePathWarningModal
  open={showDuplicateWarning}
  duplicateProjectName={pathValidationResult?.duplicateProjectName ?? ''}
  duplicateProjectId={pathValidationResult?.duplicateProjectId ?? ''}
  workspacePath={workspacePathValue}
  onContinue={handleDuplicateContinue}
  onCancel={handleDuplicateCancel}
/>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
