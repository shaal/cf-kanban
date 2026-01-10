/**
 * GAP-3.2.3: Unit Tests for Time Estimates Store
 *
 * Tests for client-side time estimate caching and management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getTimeEstimate,
  getTicketTimeEstimate,
  prefetchEstimates,
  clearEstimate,
  clearAllEstimates,
  recordCompletion,
  formatDuration,
  getConfidenceLabel,
  getConfidenceColor
} from '$lib/stores/time-estimates';
import { get } from 'svelte/store';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Time Estimates Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAllEstimates();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getTimeEstimate', () => {
    it('should fetch estimate from API', async () => {
      const mockEstimate = {
        hours: 5,
        confidence: 0.7,
        range: { min: 2.5, max: 10 },
        basedOn: 'complexity',
        formatted: '5.0h',
        formattedRange: '2.5h - 10h'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEstimate
      });

      const result = await getTimeEstimate('ticket-123');

      expect(mockFetch).toHaveBeenCalledWith('/api/tickets/ticket-123/time-estimate');
      expect(result).toMatchObject(mockEstimate);
      expect(result?.fetchedAt).toBeDefined();
    });

    it('should cache estimates', async () => {
      const mockEstimate = {
        hours: 5,
        confidence: 0.7,
        range: { min: 2.5, max: 10 },
        basedOn: 'complexity',
        formatted: '5.0h',
        formattedRange: '2.5h - 10h'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEstimate
      });

      // First call - should fetch
      await getTimeEstimate('ticket-123');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await getTimeEstimate('ticket-123');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should force refresh when requested', async () => {
      const mockEstimate = {
        hours: 5,
        confidence: 0.7,
        range: { min: 2.5, max: 10 },
        basedOn: 'complexity',
        formatted: '5.0h',
        formattedRange: '2.5h - 10h'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockEstimate
      });

      // First call
      await getTimeEstimate('ticket-123');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Force refresh
      await getTimeEstimate('ticket-123', true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Not found' })
      });

      const result = await getTimeEstimate('ticket-123');

      expect(result).toBeNull();
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getTimeEstimate('ticket-123');

      expect(result).toBeNull();
    });
  });

  describe('getTicketTimeEstimate', () => {
    it('should return a derived store', () => {
      const store = getTicketTimeEstimate('ticket-123');
      const value = get(store);

      expect(value).toHaveProperty('estimate');
      expect(value).toHaveProperty('loading');
      expect(value).toHaveProperty('error');
    });

    it('should initially have null estimate', () => {
      const store = getTicketTimeEstimate('ticket-123');
      const value = get(store);

      expect(value.estimate).toBeNull();
      expect(value.loading).toBe(false);
      expect(value.error).toBeNull();
    });
  });

  describe('prefetchEstimates', () => {
    it('should fetch multiple estimates in parallel', async () => {
      const mockEstimate = {
        hours: 5,
        confidence: 0.7,
        range: { min: 2.5, max: 10 },
        basedOn: 'complexity',
        formatted: '5.0h',
        formattedRange: '2.5h - 10h'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockEstimate
      });

      await prefetchEstimates(['ticket-1', 'ticket-2', 'ticket-3']);

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should skip already cached estimates', async () => {
      const mockEstimate = {
        hours: 5,
        confidence: 0.7,
        range: { min: 2.5, max: 10 },
        basedOn: 'complexity',
        formatted: '5.0h',
        formattedRange: '2.5h - 10h'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockEstimate
      });

      // Prefetch first
      await getTimeEstimate('ticket-1');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Prefetch multiple including cached one
      await prefetchEstimates(['ticket-1', 'ticket-2', 'ticket-3']);
      expect(mockFetch).toHaveBeenCalledTimes(3); // Only 2 new calls
    });
  });

  describe('clearEstimate', () => {
    it('should clear a specific ticket estimate', async () => {
      const mockEstimate = {
        hours: 5,
        confidence: 0.7,
        range: { min: 2.5, max: 10 },
        basedOn: 'complexity',
        formatted: '5.0h',
        formattedRange: '2.5h - 10h'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockEstimate
      });

      await getTimeEstimate('ticket-123');
      clearEstimate('ticket-123');

      // Should fetch again after clearing
      await getTimeEstimate('ticket-123');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearAllEstimates', () => {
    it('should clear all cached estimates', async () => {
      const mockEstimate = {
        hours: 5,
        confidence: 0.7,
        range: { min: 2.5, max: 10 },
        basedOn: 'complexity',
        formatted: '5.0h',
        formattedRange: '2.5h - 10h'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockEstimate
      });

      await getTimeEstimate('ticket-1');
      await getTimeEstimate('ticket-2');
      expect(mockFetch).toHaveBeenCalledTimes(2);

      clearAllEstimates();

      await getTimeEstimate('ticket-1');
      await getTimeEstimate('ticket-2');
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('recordCompletion', () => {
    it('should clear estimate for completed ticket', async () => {
      const mockEstimate = {
        hours: 5,
        confidence: 0.7,
        range: { min: 2.5, max: 10 },
        basedOn: 'complexity',
        formatted: '5.0h',
        formattedRange: '2.5h - 10h'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockEstimate
      });

      await getTimeEstimate('ticket-123');
      recordCompletion('ticket-123', 4.5);

      // Should fetch again after completion
      await getTimeEstimate('ticket-123');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('formatDuration', () => {
    it('should format minutes', () => {
      expect(formatDuration(0.5)).toBe('30m');
    });

    it('should format hours', () => {
      expect(formatDuration(2.5)).toBe('2.5h');
    });

    it('should format days', () => {
      expect(formatDuration(16)).toBe('2.0d');
    });

    it('should format weeks', () => {
      expect(formatDuration(80)).toBe('2.0w');
    });
  });

  describe('getConfidenceLabel', () => {
    it('should return High for >= 0.8', () => {
      expect(getConfidenceLabel(0.85)).toBe('High');
    });

    it('should return Medium for >= 0.6', () => {
      expect(getConfidenceLabel(0.65)).toBe('Medium');
    });

    it('should return Low for >= 0.4', () => {
      expect(getConfidenceLabel(0.45)).toBe('Low');
    });

    it('should return Very Low for < 0.4', () => {
      expect(getConfidenceLabel(0.3)).toBe('Very Low');
    });
  });

  describe('getConfidenceColor', () => {
    it('should return green for high confidence', () => {
      expect(getConfidenceColor(0.85)).toContain('green');
    });

    it('should return blue for medium confidence', () => {
      expect(getConfidenceColor(0.65)).toContain('blue');
    });

    it('should return yellow for low confidence', () => {
      expect(getConfidenceColor(0.45)).toContain('yellow');
    });

    it('should return gray for very low confidence', () => {
      expect(getConfidenceColor(0.3)).toContain('gray');
    });
  });
});
