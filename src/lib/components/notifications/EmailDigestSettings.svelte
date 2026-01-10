<script lang="ts">
  /**
   * GAP-3.5.1: Email Digest Settings Component
   *
   * Configure email digest frequency and timing preferences.
   */
  import { onMount } from 'svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import {
    Mail,
    Clock,
    Calendar,
    CheckCircle,
    AlertCircle,
    Loader2,
    Save
  } from 'lucide-svelte';
  import type { EmailDigestSettingsData } from '$lib/types/notifications';
  import { DAY_OF_WEEK_LABELS, HOUR_LABELS } from '$lib/types/notifications';

  let loading = $state(true);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let success = $state(false);

  let settings = $state<EmailDigestSettingsData>({
    enabled: false,
    frequency: 'daily',
    preferredHour: 9,
    preferredDay: 1,
    lastSentAt: null
  });

  async function fetchSettings() {
    try {
      const response = await fetch('/api/notifications/digest');
      if (!response.ok) throw new Error('Failed to fetch digest settings');
      settings = await response.json();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load settings';
    } finally {
      loading = false;
    }
  }

  async function saveSettings() {
    saving = true;
    error = null;

    try {
      const response = await fetch('/api/notifications/digest', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error('Failed to save digest settings');
      }

      settings = await response.json();
      success = true;
      setTimeout(() => (success = false), 2000);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save settings';
    } finally {
      saving = false;
    }
  }

  function toggleEnabled() {
    settings.enabled = !settings.enabled;
  }

  onMount(fetchSettings);
</script>

<Card class="p-6">
  <div class="flex items-center justify-between mb-6">
    <div class="flex items-center gap-3">
      <div class="p-2 bg-blue-100 rounded-lg">
        <Mail class="w-5 h-5 text-blue-600" />
      </div>
      <div>
        <h3 class="text-lg font-semibold text-gray-900">Email Digest</h3>
        <p class="text-sm text-gray-500">
          Receive periodic summaries of your notifications
        </p>
      </div>
    </div>
  </div>

  <!-- Status Messages -->
  {#if success}
    <div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
      <CheckCircle class="w-4 h-4 text-green-600" />
      <span class="text-sm text-green-800">Settings saved</span>
    </div>
  {/if}

  {#if error}
    <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
      <AlertCircle class="w-4 h-4 text-red-600" />
      <span class="text-sm text-red-800">{error}</span>
    </div>
  {/if}

  {#if loading}
    <div class="flex items-center justify-center py-8">
      <Loader2 class="w-6 h-6 animate-spin text-gray-400" />
      <span class="ml-2 text-gray-500">Loading settings...</span>
    </div>
  {:else}
    <div class="space-y-6">
      <!-- Enable/Disable Toggle -->
      <div class="flex items-center justify-between py-3 border-b border-gray-100">
        <div>
          <span class="text-sm font-medium text-gray-700">Enable Email Digest</span>
          <p class="text-xs text-gray-500 mt-1">
            Get a summary of notifications sent to your email
          </p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            bind:checked={settings.enabled}
            onchange={toggleEnabled}
            class="sr-only peer"
          />
          <div
            class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
          ></div>
        </label>
      </div>

      <!-- Settings (only shown when enabled) -->
      {#if settings.enabled}
        <!-- Frequency -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            <Clock class="w-4 h-4 inline-block mr-1" />
            Frequency
          </label>
          <div class="flex gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="frequency"
                value="daily"
                bind:group={settings.frequency}
                class="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span class="text-sm text-gray-700">Daily</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="frequency"
                value="weekly"
                bind:group={settings.frequency}
                class="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span class="text-sm text-gray-700">Weekly</span>
            </label>
          </div>
        </div>

        <!-- Preferred Time -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700" for="preferred-hour">
            <Clock class="w-4 h-4 inline-block mr-1" />
            Preferred Time (UTC)
          </label>
          <select
            id="preferred-hour"
            bind:value={settings.preferredHour}
            class="w-48 h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {#each HOUR_LABELS as label, i}
              <option value={i}>{label}</option>
            {/each}
          </select>
        </div>

        <!-- Preferred Day (for weekly) -->
        {#if settings.frequency === 'weekly'}
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700" for="preferred-day">
              <Calendar class="w-4 h-4 inline-block mr-1" />
              Preferred Day
            </label>
            <select
              id="preferred-day"
              bind:value={settings.preferredDay}
              class="w-48 h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {#each DAY_OF_WEEK_LABELS as label, i}
                <option value={i}>{label}</option>
              {/each}
            </select>
          </div>
        {/if}

        <!-- Last Sent Info -->
        {#if settings.lastSentAt}
          <div class="text-sm text-gray-500">
            Last digest sent: {new Date(settings.lastSentAt).toLocaleString()}
          </div>
        {/if}
      {:else}
        <div class="text-center py-4 text-gray-500">
          <p class="text-sm">Enable email digest to configure delivery settings.</p>
        </div>
      {/if}

      <!-- Save Button -->
      <div class="flex justify-end pt-4 border-t border-gray-100">
        <Button onclick={saveSettings} disabled={saving}>
          {#if saving}
            <Loader2 class="w-4 h-4 mr-2 animate-spin" />
            Saving...
          {:else}
            <Save class="w-4 h-4 mr-2" />
            Save Settings
          {/if}
        </Button>
      </div>
    </div>
  {/if}
</Card>
