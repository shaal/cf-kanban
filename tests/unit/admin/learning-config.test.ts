/**
 * GAP-3.1.3: Learning Preferences Configuration Tests
 *
 * Unit tests for learning configuration types and default values.
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_LEARNING_CONFIG } from '$lib/types/admin';
import type { LearningConfig } from '$lib/types/admin';

describe('LearningConfig', () => {
  describe('DEFAULT_LEARNING_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_LEARNING_CONFIG).toEqual({
        shareGlobally: false,
        allowTransfer: true,
        retentionDays: null,
        sharedWithProjects: []
      });
    });

    it('should default to private patterns (shareGlobally: false)', () => {
      expect(DEFAULT_LEARNING_CONFIG.shareGlobally).toBe(false);
    });

    it('should allow transfers by default', () => {
      expect(DEFAULT_LEARNING_CONFIG.allowTransfer).toBe(true);
    });

    it('should have indefinite retention by default', () => {
      expect(DEFAULT_LEARNING_CONFIG.retentionDays).toBeNull();
    });

    it('should have empty shared projects list by default', () => {
      expect(DEFAULT_LEARNING_CONFIG.sharedWithProjects).toEqual([]);
    });
  });

  describe('LearningConfig type', () => {
    it('should allow creating a valid learning config', () => {
      const config: LearningConfig = {
        shareGlobally: true,
        allowTransfer: true,
        retentionDays: 90,
        sharedWithProjects: ['project-1', 'project-2']
      };

      expect(config.shareGlobally).toBe(true);
      expect(config.allowTransfer).toBe(true);
      expect(config.retentionDays).toBe(90);
      expect(config.sharedWithProjects).toHaveLength(2);
    });

    it('should allow null retention days for indefinite retention', () => {
      const config: LearningConfig = {
        shareGlobally: false,
        allowTransfer: false,
        retentionDays: null,
        sharedWithProjects: []
      };

      expect(config.retentionDays).toBeNull();
    });
  });

  describe('privacy scenarios', () => {
    it('private config should not share with anyone', () => {
      const privateConfig: LearningConfig = {
        shareGlobally: false,
        allowTransfer: false,
        retentionDays: null,
        sharedWithProjects: []
      };

      expect(privateConfig.shareGlobally).toBe(false);
      expect(privateConfig.allowTransfer).toBe(false);
      expect(privateConfig.sharedWithProjects.length).toBe(0);
    });

    it('selective sharing config should only share with specified projects', () => {
      const selectiveConfig: LearningConfig = {
        shareGlobally: false,
        allowTransfer: true,
        retentionDays: 30,
        sharedWithProjects: ['trusted-project-1', 'trusted-project-2']
      };

      expect(selectiveConfig.shareGlobally).toBe(false);
      expect(selectiveConfig.sharedWithProjects).toContain('trusted-project-1');
      expect(selectiveConfig.sharedWithProjects).toContain('trusted-project-2');
    });

    it('global sharing config should be visible to all', () => {
      const globalConfig: LearningConfig = {
        shareGlobally: true,
        allowTransfer: true,
        retentionDays: null,
        sharedWithProjects: [] // Empty when global is true
      };

      expect(globalConfig.shareGlobally).toBe(true);
      // When shareGlobally is true, sharedWithProjects is ignored
    });
  });
});
