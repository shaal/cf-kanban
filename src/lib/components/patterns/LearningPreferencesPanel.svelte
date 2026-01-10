<script lang="ts">
  /**
   * GAP-3.1.3: Learning Preferences Panel
   *
   * UI component for configuring how patterns are shared across projects.
   * Allows toggling global sharing, transfer permissions, and retention settings.
   */
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import {
    Shield,
    Globe,
    ArrowLeftRight,
    Clock,
    Users,
    Info,
    Save,
    AlertCircle,
    CheckCircle
  } from 'lucide-svelte';
  import type { LearningConfig } from '$lib/types/admin';

  interface Props {
    projectId: string;
    config: LearningConfig;
    onSave?: (config: LearningConfig) => Promise<void>;
    availableProjects?: Array<{ id: string; name: string }>;
    readonly?: boolean;
  }

  let {
    projectId,
    config,
    onSave,
    availableProjects = [],
    readonly = false
  }: Props = $props();

  // Local state for editing
  let localConfig = $state<LearningConfig>({
    shareGlobally: config.shareGlobally,
    allowTransfer: config.allowTransfer,
    retentionDays: config.retentionDays,
    sharedWithProjects: [...config.sharedWithProjects]
  });
  let saving = $state(false);
  let saveSuccess = $state(false);
  let saveError = $state('');

  // Sync local config when prop changes
  $effect(() => {
    localConfig = {
      shareGlobally: config.shareGlobally,
      allowTransfer: config.allowTransfer,
      retentionDays: config.retentionDays,
      sharedWithProjects: [...config.sharedWithProjects]
    };
  });

  // Retention period options
  const retentionOptions = [
    { value: null, label: 'Indefinite' },
    { value: 30, label: '30 days' },
    { value: 60, label: '60 days' },
    { value: 90, label: '90 days' },
    { value: 180, label: '6 months' },
    { value: 365, label: '1 year' }
  ];

  // Check if config has changed
  let hasChanges = $derived(
    localConfig.shareGlobally !== config.shareGlobally ||
    localConfig.allowTransfer !== config.allowTransfer ||
    localConfig.retentionDays !== config.retentionDays ||
    JSON.stringify(localConfig.sharedWithProjects) !== JSON.stringify(config.sharedWithProjects)
  );

  async function handleSave() {
    if (!onSave || readonly) return;

    saving = true;
    saveSuccess = false;
    saveError = '';

    try {
      await onSave(localConfig);
      saveSuccess = true;
      setTimeout(() => (saveSuccess = false), 3000);
    } catch (err) {
      saveError = err instanceof Error ? err.message : 'Failed to save preferences';
    } finally {
      saving = false;
    }
  }

  function toggleProjectSharing(projectId: string) {
    if (readonly) return;

    const idx = localConfig.sharedWithProjects.indexOf(projectId);
    if (idx >= 0) {
      localConfig.sharedWithProjects = localConfig.sharedWithProjects.filter((id) => id !== projectId);
    } else {
      localConfig.sharedWithProjects = [...localConfig.sharedWithProjects, projectId];
    }
  }

  function resetChanges() {
    localConfig = { ...config };
  }
</script>

<Card class="p-6">
  <div class="flex items-center justify-between mb-6">
    <div class="flex items-center gap-3">
      <div class="p-2 bg-purple-100 rounded-lg">
        <Shield class="w-5 h-5 text-purple-600" />
      </div>
      <div>
        <h2 class="text-lg font-semibold text-gray-900">Learning Preferences</h2>
        <p class="text-sm text-gray-500">Control how patterns are shared across projects</p>
      </div>
    </div>
    {#if !readonly && hasChanges}
      <div class="flex items-center gap-2">
        <Button variant="ghost" size="sm" onclick={resetChanges}>
          Reset
        </Button>
        <Button size="sm" onclick={handleSave} disabled={saving}>
          <Save class="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    {/if}
  </div>

  <!-- Status Messages -->
  {#if saveSuccess}
    <div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
      <CheckCircle class="w-4 h-4 text-green-600" />
      <span class="text-sm text-green-800">Preferences saved successfully!</span>
    </div>
  {/if}

  {#if saveError}
    <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
      <AlertCircle class="w-4 h-4 text-red-600" />
      <span class="text-sm text-red-800">{saveError}</span>
    </div>
  {/if}

  <div class="space-y-6">
    <!-- Global Sharing Toggle -->
    <div class="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
      <div class="flex items-start gap-3">
        <Globe class="w-5 h-5 text-blue-600 mt-0.5" />
        <div>
          <label class="block text-sm font-medium text-gray-900">
            Share Patterns Globally
          </label>
          <p class="text-sm text-gray-500 mt-1">
            Make learned patterns from this project visible to all other projects.
            When enabled, other projects can discover and use these patterns.
          </p>
          {#if localConfig.shareGlobally}
            <Badge variant="default" class="mt-2">
              Patterns are publicly visible
            </Badge>
          {:else}
            <Badge variant="secondary" class="mt-2">
              Patterns are private
            </Badge>
          {/if}
        </div>
      </div>
      <label class="relative inline-flex items-center cursor-pointer {readonly ? 'opacity-50' : ''}">
        <input
          type="checkbox"
          bind:checked={localConfig.shareGlobally}
          disabled={readonly}
          class="sr-only peer"
        />
        <div
          class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
        ></div>
      </label>
    </div>

    <!-- Transfer Permission Toggle -->
    <div class="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
      <div class="flex items-start gap-3">
        <ArrowLeftRight class="w-5 h-5 text-green-600 mt-0.5" />
        <div>
          <label class="block text-sm font-medium text-gray-900">
            Allow Pattern Transfer
          </label>
          <p class="text-sm text-gray-500 mt-1">
            Permit patterns to be transferred to and from this project.
            Disabling this prevents cross-project pattern migration.
          </p>
        </div>
      </div>
      <label class="relative inline-flex items-center cursor-pointer {readonly ? 'opacity-50' : ''}">
        <input
          type="checkbox"
          bind:checked={localConfig.allowTransfer}
          disabled={readonly}
          class="sr-only peer"
        />
        <div
          class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"
        ></div>
      </label>
    </div>

    <!-- Retention Period -->
    <div class="p-4 bg-gray-50 rounded-lg">
      <div class="flex items-start gap-3 mb-3">
        <Clock class="w-5 h-5 text-amber-600 mt-0.5" />
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-900">
            Pattern Retention Period
          </label>
          <p class="text-sm text-gray-500 mt-1">
            How long to keep learned patterns before automatic cleanup.
            Longer retention preserves more learning history.
          </p>
        </div>
      </div>
      <select
        bind:value={localConfig.retentionDays}
        disabled={readonly}
        class="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {#each retentionOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>

    <!-- Selective Sharing (when not globally shared) -->
    {#if !localConfig.shareGlobally && availableProjects.length > 0}
      <div class="p-4 bg-gray-50 rounded-lg">
        <div class="flex items-start gap-3 mb-4">
          <Users class="w-5 h-5 text-indigo-600 mt-0.5" />
          <div>
            <label class="block text-sm font-medium text-gray-900">
              Share with Specific Projects
            </label>
            <p class="text-sm text-gray-500 mt-1">
              Select individual projects that can access patterns from this project.
            </p>
          </div>
        </div>

        <div class="space-y-2 max-h-48 overflow-y-auto">
          {#each availableProjects.filter(p => p.id !== projectId) as project}
            <label
              class="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer {readonly ? 'opacity-50' : ''}"
            >
              <input
                type="checkbox"
                checked={localConfig.sharedWithProjects.includes(project.id)}
                onchange={() => toggleProjectSharing(project.id)}
                disabled={readonly}
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span class="text-sm text-gray-700">{project.name}</span>
            </label>
          {/each}
        </div>

        {#if localConfig.sharedWithProjects.length > 0}
          <div class="mt-3 pt-3 border-t border-gray-200">
            <p class="text-xs text-gray-500">
              Shared with {localConfig.sharedWithProjects.length} project{localConfig.sharedWithProjects.length === 1 ? '' : 's'}
            </p>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Privacy Notice -->
    <div class="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg">
      <Info class="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
      <div class="text-sm text-blue-800">
        <p class="font-medium mb-1">Privacy Information</p>
        <ul class="list-disc list-inside space-y-1 text-blue-700">
          <li>Private patterns are only visible within this project</li>
          <li>Global sharing makes patterns discoverable in pattern search across all projects</li>
          <li>Transfer settings control whether patterns can be copied between projects</li>
          <li>Changes take effect immediately after saving</li>
        </ul>
      </div>
    </div>
  </div>
</Card>
