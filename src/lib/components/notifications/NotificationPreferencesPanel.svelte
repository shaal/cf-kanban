<script lang="ts">
  /**
   * GAP-3.5.1: Notification Preferences Panel
   *
   * Settings UI for configuring notification preferences per event type.
   */
  import { onMount } from 'svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import {
    Bell,
    Mail,
    Clock,
    Webhook,
    CheckCircle,
    AlertCircle,
    Loader2
  } from 'lucide-svelte';
  import type { NotificationEventType, NotificationChannel } from '@prisma/client';
  import type { NotificationPreferenceItem } from '$lib/types/notifications';
  import {
    NOTIFICATION_CATEGORIES,
    NOTIFICATION_EVENT_LABELS,
    NOTIFICATION_CHANNEL_LABELS
  } from '$lib/types/notifications';
  import {
    notificationPreferences,
    fetchNotificationPreferences,
    updateNotificationPreference
  } from '$lib/stores';

  let loading = $state(true);
  let saving = $state<string | null>(null);
  let error = $state<string | null>(null);
  let success = $state(false);

  // Channel icons
  const channelIcons = {
    IN_APP: Bell,
    EMAIL: Mail,
    EMAIL_DIGEST: Clock,
    WEBHOOK: Webhook
  };

  // Channel order
  const channelOrder: NotificationChannel[] = ['IN_APP', 'EMAIL', 'EMAIL_DIGEST', 'WEBHOOK'];

  // Get preferences by event type
  function getPreferenceByType(eventType: NotificationEventType): NotificationPreferenceItem | undefined {
    return $notificationPreferences.find((p) => p.eventType === eventType);
  }

  // Toggle a channel for an event type
  async function toggleChannel(eventType: NotificationEventType, channel: NotificationChannel) {
    const pref = getPreferenceByType(eventType);
    if (!pref) return;

    saving = `${eventType}-${channel}`;
    error = null;

    try {
      const hasChannel = pref.channels.includes(channel);
      const newChannels = hasChannel
        ? pref.channels.filter((c) => c !== channel)
        : [...pref.channels, channel];

      await updateNotificationPreference({
        eventType,
        channels: newChannels,
        enabled: pref.enabled
      });

      success = true;
      setTimeout(() => (success = false), 2000);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to update preference';
    } finally {
      saving = null;
    }
  }

  // Toggle enabled state for an event type
  async function toggleEnabled(eventType: NotificationEventType) {
    const pref = getPreferenceByType(eventType);
    if (!pref) return;

    saving = eventType;
    error = null;

    try {
      await updateNotificationPreference({
        eventType,
        channels: pref.channels,
        enabled: !pref.enabled
      });

      success = true;
      setTimeout(() => (success = false), 2000);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to update preference';
    } finally {
      saving = null;
    }
  }

  onMount(async () => {
    await fetchNotificationPreferences();
    loading = false;
  });
</script>

<div class="notification-preferences">
  <!-- Status Messages -->
  {#if success}
    <div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
      <CheckCircle class="w-4 h-4 text-green-600" />
      <span class="text-sm text-green-800">Preferences saved</span>
    </div>
  {/if}

  {#if error}
    <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
      <AlertCircle class="w-4 h-4 text-red-600" />
      <span class="text-sm text-red-800">{error}</span>
    </div>
  {/if}

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <Loader2 class="w-6 h-6 animate-spin text-gray-400" />
      <span class="ml-2 text-gray-500">Loading preferences...</span>
    </div>
  {:else}
    <!-- Channel Legend -->
    <div class="mb-6 flex items-center gap-4 text-sm text-gray-600">
      <span class="font-medium">Channels:</span>
      {#each channelOrder as channel}
        {@const Icon = channelIcons[channel]}
        <div class="flex items-center gap-1">
          <Icon class="w-4 h-4" />
          <span>{NOTIFICATION_CHANNEL_LABELS[channel]}</span>
        </div>
      {/each}
    </div>

    <!-- Preferences by Category -->
    {#each Object.entries(NOTIFICATION_CATEGORIES) as [category, eventTypes]}
      <Card class="mb-4 p-4">
        <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          {category.replace('_', ' ')} Notifications
        </h3>

        <div class="space-y-3">
          {#each eventTypes as eventType}
            {@const pref = getPreferenceByType(eventType as NotificationEventType)}
            {#if pref}
              <div
                class="flex items-center justify-between py-2 px-3 rounded-lg
                  {pref.enabled ? 'bg-gray-50' : 'bg-gray-100 opacity-60'}"
              >
                <!-- Event Type Label -->
                <div class="flex items-center gap-3">
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pref.enabled}
                      onchange={() => toggleEnabled(eventType as NotificationEventType)}
                      class="sr-only peer"
                      disabled={saving === eventType}
                    />
                    <div
                      class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"
                    ></div>
                  </label>
                  <span class="text-sm font-medium text-gray-700">
                    {NOTIFICATION_EVENT_LABELS[eventType as NotificationEventType]}
                  </span>
                  {#if saving === eventType}
                    <Loader2 class="w-4 h-4 animate-spin text-gray-400" />
                  {/if}
                </div>

                <!-- Channel Toggles -->
                <div class="flex items-center gap-2">
                  {#each channelOrder as channel}
                    {@const Icon = channelIcons[channel]}
                    {@const isActive = pref.channels.includes(channel)}
                    {@const isSaving = saving === `${eventType}-${channel}`}
                    <button
                      type="button"
                      class="p-2 rounded-md transition-colors
                        {isActive
                          ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}
                        {!pref.enabled ? 'pointer-events-none' : ''}"
                      onclick={() => toggleChannel(eventType as NotificationEventType, channel)}
                      disabled={!pref.enabled || isSaving}
                      title="{NOTIFICATION_CHANNEL_LABELS[channel]} {isActive ? 'enabled' : 'disabled'}"
                    >
                      {#if isSaving}
                        <Loader2 class="w-4 h-4 animate-spin" />
                      {:else}
                        <Icon class="w-4 h-4" />
                      {/if}
                    </button>
                  {/each}
                </div>
              </div>
            {/if}
          {/each}
        </div>
      </Card>
    {/each}
  {/if}
</div>
