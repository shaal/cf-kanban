/**
 * GAP-3.5.1: Notification Types Tests
 *
 * Tests for notification utility functions and type helpers.
 */

import { describe, it, expect } from 'vitest';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_EVENT_LABELS,
  NOTIFICATION_CHANNEL_LABELS,
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotificationCategory,
  getNotificationIcon,
  formatNotificationTime,
  isValidWebhookUrl,
  DAY_OF_WEEK_LABELS,
  HOUR_LABELS
} from '$lib/types/notifications';

describe('Notification Types', () => {
  describe('NOTIFICATION_CATEGORIES', () => {
    it('should have all expected categories', () => {
      expect(NOTIFICATION_CATEGORIES.TICKET).toBeDefined();
      expect(NOTIFICATION_CATEGORIES.PROJECT).toBeDefined();
      expect(NOTIFICATION_CATEGORIES.AGENT).toBeDefined();
      expect(NOTIFICATION_CATEGORIES.SYSTEM).toBeDefined();
    });

    it('should include ticket-related events', () => {
      expect(NOTIFICATION_CATEGORIES.TICKET).toContain('TICKET_ASSIGNED');
      expect(NOTIFICATION_CATEGORIES.TICKET).toContain('TICKET_STATUS_CHANGED');
      expect(NOTIFICATION_CATEGORIES.TICKET).toContain('TICKET_COMPLETED');
    });

    it('should include agent-related events', () => {
      expect(NOTIFICATION_CATEGORIES.AGENT).toContain('AGENT_QUESTION');
      expect(NOTIFICATION_CATEGORIES.AGENT).toContain('AGENT_COMPLETED');
      expect(NOTIFICATION_CATEGORIES.AGENT).toContain('AGENT_FAILED');
    });
  });

  describe('NOTIFICATION_EVENT_LABELS', () => {
    it('should have labels for all event types', () => {
      expect(NOTIFICATION_EVENT_LABELS.TICKET_ASSIGNED).toBe('Ticket Assigned to You');
      expect(NOTIFICATION_EVENT_LABELS.AGENT_QUESTION).toBe('Agent Asks a Question');
      expect(NOTIFICATION_EVENT_LABELS.SYSTEM_ALERT).toBe('System Alert');
    });
  });

  describe('NOTIFICATION_CHANNEL_LABELS', () => {
    it('should have labels for all channels', () => {
      expect(NOTIFICATION_CHANNEL_LABELS.IN_APP).toBe('In-App');
      expect(NOTIFICATION_CHANNEL_LABELS.EMAIL).toBe('Email');
      expect(NOTIFICATION_CHANNEL_LABELS.EMAIL_DIGEST).toBe('Email Digest');
      expect(NOTIFICATION_CHANNEL_LABELS.WEBHOOK).toBe('Webhook');
    });
  });

  describe('DEFAULT_NOTIFICATION_PREFERENCES', () => {
    it('should have defaults for all event types', () => {
      // Check that all event types have defaults
      const allEventTypes = [
        ...NOTIFICATION_CATEGORIES.TICKET,
        ...NOTIFICATION_CATEGORIES.PROJECT,
        ...NOTIFICATION_CATEGORIES.AGENT,
        ...NOTIFICATION_CATEGORIES.SYSTEM
      ];

      allEventTypes.forEach((eventType) => {
        expect(DEFAULT_NOTIFICATION_PREFERENCES[eventType as keyof typeof DEFAULT_NOTIFICATION_PREFERENCES]).toBeDefined();
      });
    });

    it('should have IN_APP enabled by default for most events', () => {
      expect(DEFAULT_NOTIFICATION_PREFERENCES.TICKET_ASSIGNED).toContain('IN_APP');
      expect(DEFAULT_NOTIFICATION_PREFERENCES.AGENT_QUESTION).toContain('IN_APP');
    });

    it('should have EMAIL enabled for important events', () => {
      expect(DEFAULT_NOTIFICATION_PREFERENCES.TICKET_ASSIGNED).toContain('EMAIL');
      expect(DEFAULT_NOTIFICATION_PREFERENCES.AGENT_FAILED).toContain('EMAIL');
      expect(DEFAULT_NOTIFICATION_PREFERENCES.SYSTEM_ALERT).toContain('EMAIL');
    });
  });

  describe('getNotificationCategory', () => {
    it('should return correct category for ticket events', () => {
      expect(getNotificationCategory('TICKET_ASSIGNED')).toBe('TICKET');
      expect(getNotificationCategory('TICKET_COMPLETED')).toBe('TICKET');
    });

    it('should return correct category for agent events', () => {
      expect(getNotificationCategory('AGENT_QUESTION')).toBe('AGENT');
      expect(getNotificationCategory('AGENT_FAILED')).toBe('AGENT');
    });

    it('should return correct category for system events', () => {
      expect(getNotificationCategory('SYSTEM_ALERT')).toBe('SYSTEM');
      expect(getNotificationCategory('HEALTH_DEGRADED')).toBe('SYSTEM');
    });

    it('should return OTHER for unknown event types', () => {
      expect(getNotificationCategory('UNKNOWN_EVENT' as any)).toBe('OTHER');
    });
  });

  describe('getNotificationIcon', () => {
    it('should return correct icons for event types', () => {
      expect(getNotificationIcon('TICKET_ASSIGNED')).toBe('user-plus');
      expect(getNotificationIcon('TICKET_COMPLETED')).toBe('check-circle');
      expect(getNotificationIcon('AGENT_QUESTION')).toBe('help-circle');
      expect(getNotificationIcon('SYSTEM_ALERT')).toBe('alert-triangle');
    });

    it('should return default bell icon for unknown types', () => {
      expect(getNotificationIcon('UNKNOWN_EVENT' as any)).toBe('bell');
    });
  });

  describe('formatNotificationTime', () => {
    it('should return "just now" for recent notifications', () => {
      const now = new Date();
      expect(formatNotificationTime(now)).toBe('just now');
    });

    it('should return minutes ago for recent notifications', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatNotificationTime(fiveMinutesAgo)).toBe('5m ago');
    });

    it('should return hours ago for older notifications', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      expect(formatNotificationTime(threeHoursAgo)).toBe('3h ago');
    });

    it('should return days ago for notifications within a week', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      expect(formatNotificationTime(threeDaysAgo)).toBe('3d ago');
    });

    it('should return formatted date for older notifications', () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const result = formatNotificationTime(twoWeeksAgo);
      // Should be a date string, not relative time
      expect(result).not.toContain('ago');
      expect(result).toMatch(/\d/);
    });
  });

  describe('isValidWebhookUrl', () => {
    it('should accept HTTPS URLs', () => {
      expect(isValidWebhookUrl('https://example.com/webhook')).toBe(true);
      expect(isValidWebhookUrl('https://hooks.slack.com/services/xxx')).toBe(true);
    });

    it('should accept HTTP URLs', () => {
      expect(isValidWebhookUrl('http://localhost:3000/webhook')).toBe(true);
      expect(isValidWebhookUrl('http://internal.example.com/hook')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidWebhookUrl('not-a-url')).toBe(false);
      expect(isValidWebhookUrl('ftp://example.com/file')).toBe(false);
      expect(isValidWebhookUrl('')).toBe(false);
    });

    it('should reject URLs with invalid protocols', () => {
      expect(isValidWebhookUrl('file:///etc/passwd')).toBe(false);
      expect(isValidWebhookUrl('javascript:alert(1)')).toBe(false);
    });
  });

  describe('DAY_OF_WEEK_LABELS', () => {
    it('should have all 7 days', () => {
      expect(DAY_OF_WEEK_LABELS).toHaveLength(7);
    });

    it('should start with Sunday', () => {
      expect(DAY_OF_WEEK_LABELS[0]).toBe('Sunday');
    });

    it('should end with Saturday', () => {
      expect(DAY_OF_WEEK_LABELS[6]).toBe('Saturday');
    });
  });

  describe('HOUR_LABELS', () => {
    it('should have all 24 hours', () => {
      expect(HOUR_LABELS).toHaveLength(24);
    });

    it('should have correct format', () => {
      expect(HOUR_LABELS[0]).toBe('12:00 AM');
      expect(HOUR_LABELS[12]).toBe('12:00 PM');
      expect(HOUR_LABELS[23]).toBe('11:00 PM');
    });
  });
});
