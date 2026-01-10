/**
 * GAP-3.5.1: Notification Store
 *
 * Client-side state management for notifications:
 * - In-app notification list
 * - Unread count
 * - Notification preferences
 * - Real-time updates via WebSocket
 */

import { writable, derived, get } from 'svelte/store';
import type {
  NotificationItem,
  NotificationPreferenceItem,
  UserNotificationPreferences,
  UpdateNotificationPreferenceRequest,
  PaginatedNotifications
} from '$lib/types/notifications';

/**
 * Notification store state
 */
interface NotificationStoreState {
  notifications: NotificationItem[];
  unreadCount: number;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  preferences: NotificationPreferenceItem[];
  preferencesLoaded: boolean;
}

const initialState: NotificationStoreState = {
  notifications: [],
  unreadCount: 0,
  total: 0,
  page: 1,
  limit: 20,
  hasMore: false,
  isLoading: false,
  error: null,
  preferences: [],
  preferencesLoaded: false
};

/**
 * Main notification store
 */
export const notificationStore = writable<NotificationStoreState>(initialState);

/**
 * Derived store for unread count
 */
export const unreadNotificationCount = derived(
  notificationStore,
  ($store) => $store.unreadCount
);

/**
 * Derived store for notification list
 */
export const notifications = derived(
  notificationStore,
  ($store) => $store.notifications
);

/**
 * Derived store for loading state
 */
export const isNotificationsLoading = derived(
  notificationStore,
  ($store) => $store.isLoading
);

/**
 * Derived store for preferences
 */
export const notificationPreferences = derived(
  notificationStore,
  ($store) => $store.preferences
);

/**
 * Fetch notifications from API
 */
export async function fetchNotifications(
  page: number = 1,
  append: boolean = false
): Promise<void> {
  notificationStore.update((s) => ({ ...s, isLoading: true, error: null }));

  try {
    const response = await fetch(`/api/notifications?page=${page}&limit=20`);
    if (!response.ok) {
      throw new Error('Failed to fetch notifications');
    }

    const data: PaginatedNotifications = await response.json();

    notificationStore.update((s) => ({
      ...s,
      notifications: append
        ? [...s.notifications, ...data.notifications]
        : data.notifications,
      unreadCount: data.unreadCount,
      total: data.total,
      page: data.page,
      hasMore: data.hasMore,
      isLoading: false
    }));
  } catch (error) {
    notificationStore.update((s) => ({
      ...s,
      isLoading: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }));
  }
}

/**
 * Load more notifications (pagination)
 */
export async function loadMoreNotifications(): Promise<void> {
  const state = get(notificationStore);
  if (state.isLoading || !state.hasMore) return;

  await fetchNotifications(state.page + 1, true);
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });

    if (!response.ok) {
      throw new Error('Failed to mark notification as read');
    }

    notificationStore.update((s) => ({
      ...s,
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true, readAt: new Date() } : n
      ),
      unreadCount: Math.max(0, s.unreadCount - 1)
    }));
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true })
    });

    if (!response.ok) {
      throw new Error('Failed to mark all notifications as read');
    }

    notificationStore.update((s) => ({
      ...s,
      notifications: s.notifications.map((n) => ({
        ...n,
        read: true,
        readAt: n.readAt || new Date()
      })),
      unreadCount: 0
    }));
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/notifications?id=${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete notification');
    }

    notificationStore.update((s) => {
      const notification = s.notifications.find((n) => n.id === id);
      return {
        ...s,
        notifications: s.notifications.filter((n) => n.id !== id),
        total: s.total - 1,
        unreadCount: notification && !notification.read ? s.unreadCount - 1 : s.unreadCount
      };
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
  }
}

/**
 * Add a new notification (from real-time updates)
 */
export function addNotification(notification: NotificationItem): void {
  notificationStore.update((s) => ({
    ...s,
    notifications: [notification, ...s.notifications],
    total: s.total + 1,
    unreadCount: s.unreadCount + 1
  }));
}

/**
 * Fetch notification preferences
 */
export async function fetchNotificationPreferences(): Promise<void> {
  try {
    const response = await fetch('/api/notifications/preferences');
    if (!response.ok) {
      throw new Error('Failed to fetch notification preferences');
    }

    const data: UserNotificationPreferences = await response.json();

    notificationStore.update((s) => ({
      ...s,
      preferences: data.preferences,
      preferencesLoaded: true
    }));
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
  }
}

/**
 * Update a notification preference
 */
export async function updateNotificationPreference(
  request: UpdateNotificationPreferenceRequest
): Promise<void> {
  try {
    const response = await fetch('/api/notifications/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error('Failed to update notification preference');
    }

    const updated: NotificationPreferenceItem = await response.json();

    notificationStore.update((s) => ({
      ...s,
      preferences: s.preferences.map((p) =>
        p.eventType === updated.eventType ? updated : p
      )
    }));
  } catch (error) {
    console.error('Error updating notification preference:', error);
    throw error;
  }
}

/**
 * Bulk update notification preferences
 */
export async function bulkUpdateNotificationPreferences(
  preferences: UpdateNotificationPreferenceRequest[]
): Promise<void> {
  try {
    const response = await fetch('/api/notifications/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences })
    });

    if (!response.ok) {
      throw new Error('Failed to update notification preferences');
    }

    const data: UserNotificationPreferences = await response.json();

    notificationStore.update((s) => ({
      ...s,
      preferences: data.preferences
    }));
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }
}

/**
 * Reset notification store to initial state
 */
export function resetNotificationStore(): void {
  notificationStore.set(initialState);
}

/**
 * Get unread count (for initial load without full notification list)
 */
export async function fetchUnreadCount(): Promise<number> {
  try {
    const response = await fetch('/api/notifications?page=1&limit=1');
    if (!response.ok) return 0;

    const data: PaginatedNotifications = await response.json();

    notificationStore.update((s) => ({
      ...s,
      unreadCount: data.unreadCount
    }));

    return data.unreadCount;
  } catch {
    return 0;
  }
}
