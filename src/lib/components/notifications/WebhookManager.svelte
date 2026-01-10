<script lang="ts">
  /**
   * GAP-3.5.1: Webhook Manager Component
   *
   * Configure and manage webhook endpoints for notifications.
   */
  import { onMount } from 'svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import {
    Webhook,
    Plus,
    Trash2,
    TestTube2,
    Pause,
    Play,
    Eye,
    EyeOff,
    CheckCircle,
    AlertCircle,
    XCircle,
    Loader2,
    ChevronDown,
    ChevronRight,
    RefreshCw
  } from 'lucide-svelte';
  import type { NotificationEventType } from '@prisma/client';
  import type {
    WebhookConfigItem,
    CreateWebhookRequest,
    WebhookDeliveryLogItem
  } from '$lib/types/notifications';
  import {
    NOTIFICATION_CATEGORIES,
    NOTIFICATION_EVENT_LABELS,
    isValidWebhookUrl
  } from '$lib/types/notifications';

  let loading = $state(true);
  let webhooks = $state<WebhookConfigItem[]>([]);
  let error = $state<string | null>(null);
  let success = $state<string | null>(null);

  // Create webhook modal state
  let showCreateModal = $state(false);
  let createLoading = $state(false);
  let newWebhook = $state<CreateWebhookRequest>({
    name: '',
    url: '',
    secret: '',
    eventTypes: []
  });

  // Expanded webhook state
  let expandedWebhookId = $state<string | null>(null);
  let deliveryLogs = $state<Record<string, WebhookDeliveryLogItem[]>>({});
  let loadingLogs = $state<string | null>(null);

  // Testing state
  let testingWebhookId = $state<string | null>(null);
  let testResult = $state<{ success: boolean; message: string } | null>(null);

  async function fetchWebhooks() {
    try {
      const response = await fetch('/api/notifications/webhooks');
      if (!response.ok) throw new Error('Failed to fetch webhooks');
      const data = await response.json();
      webhooks = data.webhooks;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load webhooks';
    } finally {
      loading = false;
    }
  }

  async function createWebhook() {
    if (!newWebhook.name || !newWebhook.url || newWebhook.eventTypes.length === 0) {
      error = 'Please fill in all required fields';
      return;
    }

    if (!isValidWebhookUrl(newWebhook.url)) {
      error = 'Please enter a valid HTTP or HTTPS URL';
      return;
    }

    createLoading = true;
    error = null;

    try {
      const response = await fetch('/api/notifications/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWebhook)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create webhook');
      }

      const webhook = await response.json();
      webhooks = [webhook, ...webhooks];
      showCreateModal = false;
      newWebhook = { name: '', url: '', secret: '', eventTypes: [] };
      success = 'Webhook created successfully';
      setTimeout(() => (success = null), 3000);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create webhook';
    } finally {
      createLoading = false;
    }
  }

  async function deleteWebhook(id: string) {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      const response = await fetch(`/api/notifications/webhooks/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete webhook');

      webhooks = webhooks.filter((w) => w.id !== id);
      success = 'Webhook deleted';
      setTimeout(() => (success = null), 3000);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to delete webhook';
    }
  }

  async function toggleWebhook(id: string, enabled: boolean) {
    try {
      const response = await fetch(`/api/notifications/webhooks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });

      if (!response.ok) throw new Error('Failed to update webhook');

      const updated = await response.json();
      webhooks = webhooks.map((w) => (w.id === id ? updated : w));
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to update webhook';
    }
  }

  async function unpauseWebhook(id: string) {
    try {
      const response = await fetch(`/api/notifications/webhooks/${id}?action=unpause`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to unpause webhook');

      const updated = await response.json();
      webhooks = webhooks.map((w) => (w.id === id ? updated : w));
      success = 'Webhook unpaused';
      setTimeout(() => (success = null), 3000);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to unpause webhook';
    }
  }

  async function testWebhook(id: string) {
    testingWebhookId = id;
    testResult = null;

    try {
      const response = await fetch(`/api/notifications/webhooks/${id}?action=test`, {
        method: 'POST'
      });

      const result = await response.json();
      testResult = {
        success: result.success,
        message: result.success
          ? `Success (${result.statusCode}, ${result.responseTime}ms)`
          : result.error || 'Test failed'
      };
    } catch (err) {
      testResult = {
        success: false,
        message: err instanceof Error ? err.message : 'Test failed'
      };
    } finally {
      testingWebhookId = null;
      setTimeout(() => (testResult = null), 5000);
    }
  }

  async function loadDeliveryLogs(id: string) {
    if (expandedWebhookId === id) {
      expandedWebhookId = null;
      return;
    }

    expandedWebhookId = id;
    loadingLogs = id;

    try {
      const response = await fetch(`/api/notifications/webhooks/${id}?logs=true`);
      if (!response.ok) throw new Error('Failed to load logs');

      const data = await response.json();
      deliveryLogs[id] = data.logs || [];
    } catch (err) {
      console.error('Failed to load delivery logs:', err);
    } finally {
      loadingLogs = null;
    }
  }

  function toggleEventType(eventType: NotificationEventType) {
    if (newWebhook.eventTypes.includes(eventType)) {
      newWebhook.eventTypes = newWebhook.eventTypes.filter((t) => t !== eventType);
    } else {
      newWebhook.eventTypes = [...newWebhook.eventTypes, eventType];
    }
  }

  onMount(fetchWebhooks);
</script>

<div class="webhook-manager">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <div class="flex items-center gap-3">
      <div class="p-2 bg-purple-100 rounded-lg">
        <Webhook class="w-5 h-5 text-purple-600" />
      </div>
      <div>
        <h3 class="text-lg font-semibold text-gray-900">Webhooks</h3>
        <p class="text-sm text-gray-500">
          Send notifications to external endpoints
        </p>
      </div>
    </div>
    <Button onclick={() => (showCreateModal = true)}>
      <Plus class="w-4 h-4 mr-2" />
      Add Webhook
    </Button>
  </div>

  <!-- Status Messages -->
  {#if success}
    <div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
      <CheckCircle class="w-4 h-4 text-green-600" />
      <span class="text-sm text-green-800">{success}</span>
    </div>
  {/if}

  {#if error}
    <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
      <AlertCircle class="w-4 h-4 text-red-600" />
      <span class="text-sm text-red-800">{error}</span>
      <button
        type="button"
        class="ml-auto text-red-600 hover:text-red-800"
        onclick={() => (error = null)}
      >
        <XCircle class="w-4 h-4" />
      </button>
    </div>
  {/if}

  {#if testResult}
    <div
      class="mb-4 p-3 rounded-lg flex items-center gap-2
        {testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}"
    >
      {#if testResult.success}
        <CheckCircle class="w-4 h-4 text-green-600" />
        <span class="text-sm text-green-800">Test passed: {testResult.message}</span>
      {:else}
        <XCircle class="w-4 h-4 text-red-600" />
        <span class="text-sm text-red-800">Test failed: {testResult.message}</span>
      {/if}
    </div>
  {/if}

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <Loader2 class="w-6 h-6 animate-spin text-gray-400" />
      <span class="ml-2 text-gray-500">Loading webhooks...</span>
    </div>
  {:else if webhooks.length === 0}
    <Card class="p-8 text-center">
      <Webhook class="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h4 class="text-lg font-medium text-gray-900 mb-2">No webhooks configured</h4>
      <p class="text-gray-500 mb-4">
        Add a webhook to send notifications to external services
      </p>
      <Button onclick={() => (showCreateModal = true)}>
        <Plus class="w-4 h-4 mr-2" />
        Add Webhook
      </Button>
    </Card>
  {:else}
    <!-- Webhook List -->
    <div class="space-y-4">
      {#each webhooks as webhook}
        <Card class="p-4">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="font-medium text-gray-900">{webhook.name}</span>
                {#if webhook.isPaused}
                  <Badge variant="warning">Paused</Badge>
                {:else if webhook.enabled}
                  <Badge variant="default">Active</Badge>
                {:else}
                  <Badge variant="secondary">Disabled</Badge>
                {/if}
                {#if webhook.failureCount > 0 && !webhook.isPaused}
                  <Badge variant="destructive">{webhook.failureCount} failures</Badge>
                {/if}
              </div>
              <p class="text-sm text-gray-500 mt-1 font-mono">{webhook.url}</p>
              <div class="flex flex-wrap gap-1 mt-2">
                {#each webhook.eventTypes as eventType}
                  <span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {NOTIFICATION_EVENT_LABELS[eventType]}
                  </span>
                {/each}
              </div>
              {#if webhook.lastSuccessAt}
                <p class="text-xs text-gray-400 mt-2">
                  Last success: {new Date(webhook.lastSuccessAt).toLocaleString()}
                </p>
              {/if}
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                onclick={() => testWebhook(webhook.id)}
                disabled={testingWebhookId === webhook.id}
                title="Test webhook"
              >
                {#if testingWebhookId === webhook.id}
                  <Loader2 class="w-4 h-4 animate-spin" />
                {:else}
                  <TestTube2 class="w-4 h-4" />
                {/if}
              </button>

              {#if webhook.isPaused}
                <button
                  type="button"
                  class="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md"
                  onclick={() => unpauseWebhook(webhook.id)}
                  title="Unpause webhook"
                >
                  <RefreshCw class="w-4 h-4" />
                </button>
              {:else}
                <button
                  type="button"
                  class="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-md"
                  onclick={() => toggleWebhook(webhook.id, !webhook.enabled)}
                  title={webhook.enabled ? 'Disable' : 'Enable'}
                >
                  {#if webhook.enabled}
                    <Pause class="w-4 h-4" />
                  {:else}
                    <Play class="w-4 h-4" />
                  {/if}
                </button>
              {/if}

              <button
                type="button"
                class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md"
                onclick={() => loadDeliveryLogs(webhook.id)}
                title="View delivery logs"
              >
                {#if expandedWebhookId === webhook.id}
                  <ChevronDown class="w-4 h-4" />
                {:else}
                  <ChevronRight class="w-4 h-4" />
                {/if}
              </button>

              <button
                type="button"
                class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                onclick={() => deleteWebhook(webhook.id)}
                title="Delete webhook"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Delivery Logs -->
          {#if expandedWebhookId === webhook.id}
            <div class="mt-4 pt-4 border-t border-gray-100">
              <h5 class="text-sm font-medium text-gray-700 mb-2">Recent Deliveries</h5>
              {#if loadingLogs === webhook.id}
                <div class="flex items-center justify-center py-4">
                  <Loader2 class="w-4 h-4 animate-spin text-gray-400" />
                </div>
              {:else if !deliveryLogs[webhook.id] || deliveryLogs[webhook.id].length === 0}
                <p class="text-sm text-gray-500 py-2">No delivery logs yet</p>
              {:else}
                <div class="space-y-2 max-h-48 overflow-y-auto">
                  {#each deliveryLogs[webhook.id] as log}
                    <div class="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                      <div class="flex items-center gap-2">
                        {#if log.success}
                          <CheckCircle class="w-4 h-4 text-green-500" />
                        {:else}
                          <XCircle class="w-4 h-4 text-red-500" />
                        {/if}
                        <span class="text-gray-600">
                          {NOTIFICATION_EVENT_LABELS[log.eventType]}
                        </span>
                      </div>
                      <div class="flex items-center gap-3 text-gray-500 text-xs">
                        {#if log.statusCode}
                          <span>{log.statusCode}</span>
                        {/if}
                        {#if log.durationMs}
                          <span>{log.durationMs}ms</span>
                        {/if}
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        </Card>
      {/each}
    </div>
  {/if}

  <!-- Create Webhook Modal -->
  {#if showCreateModal}
    <div
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onclick={() => (showCreateModal = false)}
    >
      <Card
        class="w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto"
        onclick={(e) => e.stopPropagation()}
      >
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Add Webhook</h3>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1" for="webhook-name">
              Name *
            </label>
            <Input
              id="webhook-name"
              type="text"
              bind:value={newWebhook.name}
              placeholder="My Webhook"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1" for="webhook-url">
              URL *
            </label>
            <Input
              id="webhook-url"
              type="url"
              bind:value={newWebhook.url}
              placeholder="https://example.com/webhook"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1" for="webhook-secret">
              Secret (for HMAC signature)
            </label>
            <Input
              id="webhook-secret"
              type="password"
              bind:value={newWebhook.secret}
              placeholder="Optional secret for signature verification"
            />
            <p class="text-xs text-gray-500 mt-1">
              If provided, payloads will be signed with HMAC-SHA256
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Event Types *
            </label>
            <div class="space-y-3 max-h-48 overflow-y-auto">
              {#each Object.entries(NOTIFICATION_CATEGORIES) as [category, eventTypes]}
                <div>
                  <span class="text-xs font-semibold text-gray-500 uppercase">
                    {category}
                  </span>
                  <div class="mt-1 space-y-1">
                    {#each eventTypes as eventType}
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newWebhook.eventTypes.includes(eventType as NotificationEventType)}
                          onchange={() => toggleEventType(eventType as NotificationEventType)}
                          class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span class="text-sm text-gray-700">
                          {NOTIFICATION_EVENT_LABELS[eventType as NotificationEventType]}
                        </span>
                      </label>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <Button variant="outline" onclick={() => (showCreateModal = false)}>
            Cancel
          </Button>
          <Button onclick={createWebhook} disabled={createLoading}>
            {#if createLoading}
              <Loader2 class="w-4 h-4 mr-2 animate-spin" />
              Creating...
            {:else}
              <Plus class="w-4 h-4 mr-2" />
              Create Webhook
            {/if}
          </Button>
        </div>
      </Card>
    </div>
  {/if}
</div>
