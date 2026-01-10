<script lang="ts">
  /**
   * GAP-3.5.1: Notification Center Component
   *
   * Dropdown panel showing in-app notifications with:
   * - Notification list with pagination
   * - Mark as read functionality
   * - Quick actions (delete, navigate)
   */
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import Button from '$lib/components/ui/Button.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import {
    Bell,
    Check,
    CheckCheck,
    Trash2,
    ExternalLink,
    Loader2,
    ChevronDown,
    User,
    Ticket,
    FolderGit2,
    Bot,
    AlertTriangle,
    Megaphone
  } from 'lucide-svelte';
  import type { NotificationItem } from '$lib/types/notifications';
  import {
    formatNotificationTime,
    getNotificationCategory
  } from '$lib/types/notifications';
  import {
    notifications,
    unreadNotificationCount,
    isNotificationsLoading,
    fetchNotifications,
    loadMoreNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification
  } from '$lib/stores';

  interface Props {
    isOpen?: boolean;
    onClose?: () => void;
  }

  let { isOpen = false, onClose }: Props = $props();

  let hasMore = $state(false);
  let initialLoaded = $state(false);

  // Category icons
  const categoryIcons = {
    TICKET: Ticket,
    PROJECT: FolderGit2,
    AGENT: Bot,
    SYSTEM: AlertTriangle
  };

  // Handle clicking outside to close
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-center')) {
      onClose?.();
    }
  }

  // Navigate to related entity
  function navigateToEntity(notification: NotificationItem) {
    if (notification.entityType && notification.entityId) {
      // Mark as read before navigating
      if (!notification.read) {
        markNotificationAsRead(notification.id);
      }

      // Build URL based on entity type
      let url = '';
      switch (notification.entityType) {
        case 'Ticket':
          // TODO: Navigate to ticket detail
          url = `/projects/${notification.metadata?.projectId || ''}`;
          break;
        case 'Project':
          url = `/projects/${notification.entityId}`;
          break;
        default:
          return;
      }

      if (url) {
        window.location.href = url;
      }
    }
  }

  onMount(async () => {
    if (!initialLoaded) {
      await fetchNotifications();
      initialLoaded = true;
    }
  });

  $effect(() => {
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  });
</script>

{#if isOpen}
  <div
    class="notification-center absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
    transition:fly={{ y: -10, duration: 150 }}
  >
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-100">
      <div class="flex items-center gap-2">
        <Bell class="w-5 h-5 text-gray-600" />
        <h3 class="font-semibold text-gray-900">Notifications</h3>
        {#if $unreadNotificationCount > 0}
          <Badge variant="default">{$unreadNotificationCount}</Badge>
        {/if}
      </div>
      {#if $unreadNotificationCount > 0}
        <button
          type="button"
          class="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          onclick={() => markAllNotificationsAsRead()}
        >
          <CheckCheck class="w-4 h-4" />
          Mark all read
        </button>
      {/if}
    </div>

    <!-- Notification List -->
    <div class="max-h-96 overflow-y-auto">
      {#if $isNotificationsLoading && !initialLoaded}
        <div class="flex items-center justify-center py-12">
          <Loader2 class="w-6 h-6 animate-spin text-gray-400" />
        </div>
      {:else if $notifications.length === 0}
        <div class="text-center py-12">
          <Bell class="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p class="text-gray-500">No notifications yet</p>
        </div>
      {:else}
        {#each $notifications as notification (notification.id)}
          {@const category = getNotificationCategory(notification.eventType)}
          {@const CategoryIcon = categoryIcons[category as keyof typeof categoryIcons] || Bell}
          <div
            class="relative flex items-start gap-3 p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors
              {notification.read ? 'opacity-70' : ''}"
            onclick={() => navigateToEntity(notification)}
          >
            <!-- Unread indicator -->
            {#if !notification.read}
              <div class="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>
            {/if}

            <!-- Icon -->
            <div
              class="flex-shrink-0 p-2 rounded-full
                {category === 'SYSTEM' ? 'bg-yellow-100 text-yellow-600' :
                category === 'AGENT' ? 'bg-purple-100 text-purple-600' :
                category === 'PROJECT' ? 'bg-green-100 text-green-600' :
                'bg-blue-100 text-blue-600'}"
            >
              <CategoryIcon class="w-4 h-4" />
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">
                {notification.title}
              </p>
              <p class="text-sm text-gray-500 line-clamp-2 mt-0.5">
                {notification.message}
              </p>
              <p class="text-xs text-gray-400 mt-1">
                {formatNotificationTime(notification.createdAt)}
              </p>
            </div>

            <!-- Actions -->
            <div class="flex-shrink-0 flex items-center gap-1">
              {#if !notification.read}
                <button
                  type="button"
                  class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                  onclick={(e) => {
                    e.stopPropagation();
                    markNotificationAsRead(notification.id);
                  }}
                  title="Mark as read"
                >
                  <Check class="w-4 h-4" />
                </button>
              {/if}
              <button
                type="button"
                class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                onclick={(e) => {
                  e.stopPropagation();
                  deleteNotification(notification.id);
                }}
                title="Delete"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        {/each}

        <!-- Load More -->
        {#if hasMore}
          <div class="p-4 text-center">
            <button
              type="button"
              class="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mx-auto"
              onclick={() => loadMoreNotifications()}
              disabled={$isNotificationsLoading}
            >
              {#if $isNotificationsLoading}
                <Loader2 class="w-4 h-4 animate-spin" />
                Loading...
              {:else}
                <ChevronDown class="w-4 h-4" />
                Load more
              {/if}
            </button>
          </div>
        {/if}
      {/if}
    </div>

    <!-- Footer -->
    <div class="p-3 border-t border-gray-100 text-center">
      <a
        href="/settings/notifications"
        class="text-sm text-gray-600 hover:text-gray-900"
      >
        Notification Settings
      </a>
    </div>
  </div>
{/if}
