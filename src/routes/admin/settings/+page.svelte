<script lang="ts">
  /**
   * TASK-103: System Settings Page
   *
   * Global configuration, default project settings,
   * Claude Flow integration, and external integrations.
   */
  import type { PageData } from './$types';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import {
    Settings,
    Save,
    RotateCcw,
    Brain,
    Layers,
    Bell,
    Lock,
    Plug,
    ChevronDown,
    ChevronRight,
    CheckCircle,
    AlertCircle
  } from 'lucide-svelte';
  import type {
    DefaultProjectSettings,
    ClaudeFlowSettings
  } from '$lib/types/admin';

  let { data }: { data: PageData } = $props();

  // Tab state
  let activeTab = $state<
    'defaults' | 'claude-flow' | 'notifications' | 'integrations' | 'security'
  >('defaults');

  // Settings state (copy of data for editing)
  let projectSettings = $state<DefaultProjectSettings>({
    ...data.projectSettings
  });
  let claudeFlowSettings = $state<ClaudeFlowSettings>({
    ...data.claudeFlowSettings
  });

  // Save state
  let saving = $state(false);
  let saveSuccess = $state(false);
  let saveError = $state('');

  // Tabs configuration
  const tabs = [
    { id: 'defaults' as const, label: 'Default Settings', icon: Layers },
    { id: 'claude-flow' as const, label: 'Claude Flow', icon: Brain },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'integrations' as const, label: 'Integrations', icon: Plug },
    { id: 'security' as const, label: 'Security', icon: Lock }
  ];

  // Priority options
  const priorityOptions = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'CRITICAL', label: 'Critical' }
  ];

  // Topology options
  const topologyOptions = [
    { value: 'mesh', label: 'Mesh' },
    { value: 'hierarchical', label: 'Hierarchical' },
    { value: 'hierarchical-mesh', label: 'Hierarchical Mesh' }
  ];

  // Memory backend options
  const memoryBackendOptions = [
    { value: 'hybrid', label: 'Hybrid (Recommended)' },
    { value: 'sqlite', label: 'SQLite' },
    { value: 'redis', label: 'Redis' }
  ];

  async function saveSettings() {
    saving = true;
    saveSuccess = false;
    saveError = '';

    try {
      // Save project settings
      const projectResponse = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'defaults.project',
          value: projectSettings,
          category: 'defaults'
        })
      });

      if (!projectResponse.ok) {
        throw new Error('Failed to save project settings');
      }

      // Save Claude Flow settings
      const cfResponse = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'claude-flow.config',
          value: claudeFlowSettings,
          category: 'claude-flow'
        })
      });

      if (!cfResponse.ok) {
        throw new Error('Failed to save Claude Flow settings');
      }

      saveSuccess = true;
      setTimeout(() => (saveSuccess = false), 3000);
    } catch (err) {
      saveError = err instanceof Error ? err.message : 'Failed to save settings';
    } finally {
      saving = false;
    }
  }

  function resetToDefaults() {
    if (
      !confirm(
        'Are you sure you want to reset all settings to defaults? This cannot be undone.'
      )
    ) {
      return;
    }

    projectSettings = {
      defaultPriority: 'MEDIUM',
      enableAutoAssignment: true,
      maxConcurrentAgents: 5,
      defaultLabels: [],
      autoArchiveAfterDays: null
    };

    claudeFlowSettings = {
      enabled: true,
      apiEndpoint: null,
      maxAgents: 15,
      topology: 'hierarchical-mesh',
      enableNeuralLearning: true,
      enableHNSW: true,
      memoryBackend: 'hybrid'
    };
  }
</script>

<div class="settings-page">
  <!-- Page Header -->
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">System Settings</h1>
      <p class="text-gray-500 mt-1">
        Configure global settings and integrations
      </p>
    </div>
    <div class="flex items-center gap-3">
      <Button variant="outline" onclick={resetToDefaults}>
        <RotateCcw class="w-4 h-4 mr-2" />
        Reset Defaults
      </Button>
      <Button onclick={saveSettings} disabled={saving}>
        <Save class="w-4 h-4 mr-2" />
        {saving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  </div>

  <!-- Status Messages -->
  {#if saveSuccess}
    <div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
      <CheckCircle class="w-5 h-5 text-green-600" />
      <span class="text-green-800">Settings saved successfully!</span>
    </div>
  {/if}

  {#if saveError}
    <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
      <AlertCircle class="w-5 h-5 text-red-600" />
      <span class="text-red-800">{saveError}</span>
    </div>
  {/if}

  <div class="flex gap-6">
    <!-- Sidebar Tabs -->
    <div class="w-64 flex-shrink-0">
      <Card class="p-2">
        {#each tabs as tab}
          <button
            class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors
              {activeTab === tab.id
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-50'}"
            onclick={() => (activeTab = tab.id)}
          >
            <tab.icon class="w-5 h-5" />
            <span class="font-medium">{tab.label}</span>
            {#if activeTab === tab.id}
              <ChevronRight class="w-4 h-4 ml-auto" />
            {/if}
          </button>
        {/each}
      </Card>
    </div>

    <!-- Content -->
    <div class="flex-1">
      <!-- Default Project Settings -->
      {#if activeTab === 'defaults'}
        <Card class="p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-6">
            Default Project Settings
          </h2>

          <div class="space-y-6">
            <!-- Default Priority -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Default Ticket Priority
              </label>
              <select
                bind:value={projectSettings.defaultPriority}
                class="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {#each priorityOptions as option}
                  <option value={option.value}>{option.label}</option>
                {/each}
              </select>
              <p class="mt-1 text-sm text-gray-500">
                Priority assigned to new tickets by default
              </p>
            </div>

            <!-- Auto Assignment -->
            <div class="flex items-center justify-between">
              <div>
                <label class="block text-sm font-medium text-gray-700">
                  Enable Auto-Assignment
                </label>
                <p class="text-sm text-gray-500">
                  Automatically assign agents to new tickets
                </p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  bind:checked={projectSettings.enableAutoAssignment}
                  class="sr-only peer"
                />
                <div
                  class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
                ></div>
              </label>
            </div>

            <!-- Max Concurrent Agents -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Max Concurrent Agents per Project
              </label>
              <Input
                type="number"
                value={String(projectSettings.maxConcurrentAgents)}
                oninput={(e) => {
                  projectSettings.maxConcurrentAgents = parseInt((e.target as HTMLInputElement).value) || 5;
                }}
                class="w-32"
              />
              <p class="mt-1 text-sm text-gray-500">
                Maximum number of agents that can work on a project simultaneously
              </p>
            </div>

            <!-- Default Labels -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Default Labels
              </label>
              <Input
                type="text"
                value={projectSettings.defaultLabels.join(', ')}
                oninput={(e) => {
                  projectSettings.defaultLabels = (e.target as HTMLInputElement).value
                    .split(',')
                    .map((l) => l.trim())
                    .filter(Boolean);
                }}
                placeholder="bug, feature, enhancement"
              />
              <p class="mt-1 text-sm text-gray-500">
                Comma-separated list of default labels for new projects
              </p>
            </div>

            <!-- Auto Archive -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Auto-Archive After (days)
              </label>
              <Input
                type="number"
                value={projectSettings.autoArchiveAfterDays !== null ? String(projectSettings.autoArchiveAfterDays) : ''}
                oninput={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  projectSettings.autoArchiveAfterDays = val
                    ? parseInt(val)
                    : null;
                }}
                placeholder="Leave empty to disable"
                class="w-32"
              />
              <p class="mt-1 text-sm text-gray-500">
                Automatically archive inactive projects (leave empty to disable)
              </p>
            </div>
          </div>
        </Card>
      {/if}

      <!-- Claude Flow Settings -->
      {#if activeTab === 'claude-flow'}
        <Card class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-semibold text-gray-900">
              Claude Flow Integration
            </h2>
            <Badge variant={claudeFlowSettings.enabled ? 'default' : 'secondary'}>
              {claudeFlowSettings.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>

          <div class="space-y-6">
            <!-- Enable/Disable -->
            <div class="flex items-center justify-between">
              <div>
                <label class="block text-sm font-medium text-gray-700">
                  Enable Claude Flow
                </label>
                <p class="text-sm text-gray-500">
                  Use Claude Flow for AI-powered task execution
                </p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  bind:checked={claudeFlowSettings.enabled}
                  class="sr-only peer"
                />
                <div
                  class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
                ></div>
              </label>
            </div>

            <!-- Max Agents -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Maximum Agents
              </label>
              <Input
                type="number"
                value={String(claudeFlowSettings.maxAgents)}
                oninput={(e) => {
                  claudeFlowSettings.maxAgents = parseInt((e.target as HTMLInputElement).value) || 15;
                }}
                class="w-32"
              />
              <p class="mt-1 text-sm text-gray-500">
                Maximum concurrent agents in a swarm
              </p>
            </div>

            <!-- Topology -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Swarm Topology
              </label>
              <select
                bind:value={claudeFlowSettings.topology}
                class="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {#each topologyOptions as option}
                  <option value={option.value}>{option.label}</option>
                {/each}
              </select>
              <p class="mt-1 text-sm text-gray-500">
                How agents are organized and communicate
              </p>
            </div>

            <!-- Neural Learning -->
            <div class="flex items-center justify-between">
              <div>
                <label class="block text-sm font-medium text-gray-700">
                  Enable Neural Learning (SONA)
                </label>
                <p class="text-sm text-gray-500">
                  Self-optimizing neural architecture for pattern learning
                </p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  bind:checked={claudeFlowSettings.enableNeuralLearning}
                  class="sr-only peer"
                />
                <div
                  class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
                ></div>
              </label>
            </div>

            <!-- HNSW -->
            <div class="flex items-center justify-between">
              <div>
                <label class="block text-sm font-medium text-gray-700">
                  Enable HNSW Indexing
                </label>
                <p class="text-sm text-gray-500">
                  Fast vector search (150x-12,500x faster)
                </p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  bind:checked={claudeFlowSettings.enableHNSW}
                  class="sr-only peer"
                />
                <div
                  class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
                ></div>
              </label>
            </div>

            <!-- Memory Backend -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Memory Backend
              </label>
              <select
                bind:value={claudeFlowSettings.memoryBackend}
                class="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {#each memoryBackendOptions as option}
                  <option value={option.value}>{option.label}</option>
                {/each}
              </select>
              <p class="mt-1 text-sm text-gray-500">
                Storage backend for agent memory and patterns
              </p>
            </div>
          </div>
        </Card>
      {/if}

      <!-- Notifications -->
      {#if activeTab === 'notifications'}
        <Card class="p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            Notification Settings
          </h2>
          <p class="text-gray-500 mb-6">
            Configure system-wide notification defaults and user notification settings.
          </p>

          <div class="space-y-4">
            <a
              href="/settings/notifications"
              class="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="font-medium text-gray-900">User Notification Preferences</h4>
                  <p class="text-sm text-gray-500 mt-1">
                    Configure your personal notification settings, email digest, and webhooks
                  </p>
                </div>
                <ChevronRight class="w-5 h-5 text-gray-400" />
              </div>
            </a>

            <div class="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 class="font-medium text-gray-900 mb-2">System Defaults</h4>
              <p class="text-sm text-gray-500">
                System-wide notification defaults are configured through the API.
                Individual users can override these settings in their personal preferences.
              </p>
            </div>
          </div>
        </Card>
      {/if}

      <!-- Integrations -->
      {#if activeTab === 'integrations'}
        <Card class="p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-6">
            External Integrations
          </h2>

          <div class="text-center py-12">
            <Plug class="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 mb-2">
              Coming Soon
            </h3>
            <p class="text-gray-500">
              Integration settings for GitHub, Slack, and other services
            </p>
          </div>
        </Card>
      {/if}

      <!-- Security -->
      {#if activeTab === 'security'}
        <Card class="p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-6">
            Security Settings
          </h2>

          <div class="text-center py-12">
            <Lock class="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 mb-2">
              Coming Soon
            </h3>
            <p class="text-gray-500">
              Security policies, session settings, and audit configuration
            </p>
          </div>
        </Card>
      {/if}
    </div>
  </div>
</div>
