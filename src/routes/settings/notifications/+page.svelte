<script lang="ts">
  /**
   * GAP-3.5.1: Notification Settings Page
   *
   * Comprehensive notification configuration UI including:
   * - Event type preferences
   * - Email digest settings
   * - Webhook configuration
   */
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import {
    Bell,
    Mail,
    Webhook,
    ChevronRight,
    ArrowLeft,
    Settings
  } from 'lucide-svelte';
  import {
    NotificationPreferencesPanel,
    EmailDigestSettings,
    WebhookManager
  } from '$lib/components/notifications';

  // Tab state
  let activeTab = $state<'preferences' | 'digest' | 'webhooks'>('preferences');

  // Tabs configuration
  const tabs = [
    {
      id: 'preferences' as const,
      label: 'Notification Preferences',
      description: 'Control which notifications you receive',
      icon: Bell
    },
    {
      id: 'digest' as const,
      label: 'Email Digest',
      description: 'Configure email summary settings',
      icon: Mail
    },
    {
      id: 'webhooks' as const,
      label: 'Webhooks',
      description: 'Send notifications to external services',
      icon: Webhook
    }
  ];
</script>

<svelte:head>
  <title>Notification Settings | cf-kanban</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-6xl mx-auto px-4 py-8">
    <!-- Page Header -->
    <div class="mb-8">
      <a
        href="/settings"
        class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4"
      >
        <ArrowLeft class="w-4 h-4" />
        Back to Settings
      </a>
      <div class="flex items-center gap-3">
        <div class="p-3 bg-blue-100 rounded-lg">
          <Settings class="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Notification Settings</h1>
          <p class="text-gray-500 mt-1">
            Configure how and when you receive notifications
          </p>
        </div>
      </div>
    </div>

    <div class="flex gap-6">
      <!-- Sidebar Tabs -->
      <div class="w-72 flex-shrink-0">
        <Card class="p-2">
          {#each tabs as tab}
            <button
              class="w-full flex items-start gap-3 px-4 py-3 rounded-lg text-left transition-colors
                {activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'}"
              onclick={() => (activeTab = tab.id)}
            >
              <tab.icon class="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div class="flex-1">
                <span class="font-medium block">{tab.label}</span>
                <span class="text-xs text-gray-500">{tab.description}</span>
              </div>
              {#if activeTab === tab.id}
                <ChevronRight class="w-4 h-4 mt-0.5 flex-shrink-0" />
              {/if}
            </button>
          {/each}
        </Card>

        <!-- Help Card -->
        <Card class="p-4 mt-4">
          <h4 class="font-medium text-gray-900 mb-2">Need help?</h4>
          <p class="text-sm text-gray-500 mb-3">
            Learn more about notification settings and how to configure them.
          </p>
          <a
            href="/docs/notifications"
            class="text-sm text-blue-600 hover:text-blue-800"
          >
            View Documentation
          </a>
        </Card>
      </div>

      <!-- Content -->
      <div class="flex-1">
        {#if activeTab === 'preferences'}
          <Card class="p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-2">
              Notification Preferences
            </h2>
            <p class="text-gray-500 mb-6">
              Choose which events trigger notifications and how you want to receive them.
            </p>
            <NotificationPreferencesPanel />
          </Card>
        {:else if activeTab === 'digest'}
          <EmailDigestSettings />
        {:else if activeTab === 'webhooks'}
          <WebhookManager />
        {/if}
      </div>
    </div>
  </div>
</div>
