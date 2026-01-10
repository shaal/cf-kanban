/**
 * TASK-103: System Settings Service Tests
 *
 * Tests for system settings CRUD, default values, and sensitive data masking.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma - define mock functions inline in vi.mock
vi.mock('$lib/server/prisma', () => ({
  prisma: {
    systemSettings: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      create: vi.fn(),
      delete: vi.fn()
    }
  }
}));

// Mock audit service
vi.mock('$lib/server/admin/audit-service', () => ({
  auditService: {
    log: vi.fn()
  }
}));

// Import after mocks
import {
  SettingsService,
  DEFAULT_PROJECT_SETTINGS,
  DEFAULT_CLAUDE_FLOW_SETTINGS
} from '$lib/server/admin/settings-service';
import { prisma } from '$lib/server/prisma';

// Get references to mocked functions
const mockPrisma = prisma as unknown as {
  systemSettings: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    service = new SettingsService();
    vi.clearAllMocks();
  });

  describe('listSettings', () => {
    it('should return all settings', async () => {
      mockPrisma.systemSettings.findMany.mockResolvedValue([
        {
          id: 'setting-1',
          key: 'general.theme',
          value: 'dark',
          description: 'UI Theme',
          category: 'general',
          isSensitive: false,
          updatedBy: 'admin-1',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'setting-2',
          key: 'api.key',
          value: 'sk-secret-key-12345',
          description: 'API Key',
          category: 'integrations',
          isSensitive: true,
          updatedBy: 'admin-1',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);

      const settings = await service.listSettings();

      expect(settings).toHaveLength(2);
      expect(settings[0].key).toBe('general.theme');
      expect(settings[0].value).toBe('dark');
      // Sensitive value should be masked
      expect(settings[1].value).not.toBe('sk-secret-key-12345');
    });

    it('should filter by category', async () => {
      mockPrisma.systemSettings.findMany.mockResolvedValue([]);

      await service.listSettings('security');

      expect(mockPrisma.systemSettings.findMany).toHaveBeenCalledWith({
        where: { category: 'security' },
        orderBy: [{ category: 'asc' }, { key: 'asc' }]
      });
    });
  });

  describe('getSetting', () => {
    it('should return setting by key', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'setting-1',
        key: 'general.theme',
        value: 'dark',
        description: 'UI Theme',
        category: 'general',
        isSensitive: false,
        updatedBy: 'admin-1',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const setting = await service.getSetting('general.theme');

      expect(setting).not.toBeNull();
      expect(setting?.key).toBe('general.theme');
      expect(setting?.value).toBe('dark');
    });

    it('should return null for non-existent setting', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue(null);

      const setting = await service.getSetting('non.existent');

      expect(setting).toBeNull();
    });

    it('should mask sensitive values', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'setting-1',
        key: 'api.secret',
        value: 'super-secret-value-12345',
        description: 'API Secret',
        category: 'integrations',
        isSensitive: true,
        updatedBy: 'admin-1',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const setting = await service.getSetting('api.secret');

      expect(setting?.value).not.toBe('super-secret-value-12345');
      expect(setting?.value).toContain('****');
    });
  });

  describe('getSettingValue', () => {
    it('should return raw value without masking', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'setting-1',
        key: 'api.secret',
        value: 'actual-secret-value',
        isSensitive: true
      });

      const value = await service.getSettingValue('api.secret', 'default');

      expect(value).toBe('actual-secret-value');
    });

    it('should return default value if not found', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue(null);

      const value = await service.getSettingValue('non.existent', 'default-value');

      expect(value).toBe('default-value');
    });
  });

  describe('updateSetting', () => {
    it('should create or update setting', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue(null);
      mockPrisma.systemSettings.upsert.mockResolvedValue({
        id: 'setting-1',
        key: 'new.setting',
        value: { enabled: true },
        description: 'New setting',
        category: 'general',
        isSensitive: false,
        updatedBy: 'admin-1',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await service.updateSetting(
        {
          key: 'new.setting',
          value: { enabled: true },
          description: 'New setting',
          category: 'general'
        },
        'admin-1'
      );

      expect(result.key).toBe('new.setting');
      expect(result.value).toEqual({ enabled: true });
      expect(mockPrisma.systemSettings.upsert).toHaveBeenCalled();
    });

    it('should update existing setting', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'setting-1',
        key: 'existing.setting',
        value: { old: 'value' },
        isSensitive: false
      });
      mockPrisma.systemSettings.upsert.mockResolvedValue({
        id: 'setting-1',
        key: 'existing.setting',
        value: { new: 'value' },
        description: 'Updated',
        category: 'general',
        isSensitive: false,
        updatedBy: 'admin-1',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await service.updateSetting(
        {
          key: 'existing.setting',
          value: { new: 'value' }
        },
        'admin-1'
      );

      expect(mockPrisma.systemSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'existing.setting' },
          update: expect.objectContaining({
            value: { new: 'value' }
          })
        })
      );
    });
  });

  describe('deleteSetting', () => {
    it('should delete setting', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'setting-1',
        key: 'to.delete',
        category: 'general',
        isSensitive: false
      });
      mockPrisma.systemSettings.delete.mockResolvedValue({});

      await service.deleteSetting('to.delete', 'admin-1');

      expect(mockPrisma.systemSettings.delete).toHaveBeenCalledWith({
        where: { key: 'to.delete' }
      });
    });

    it('should throw error if setting not found', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteSetting('non.existent', 'admin-1')
      ).rejects.toThrow('Setting not found');
    });
  });

  describe('getDefaultProjectSettings', () => {
    it('should return default project settings', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue(null);

      const settings = await service.getDefaultProjectSettings();

      expect(settings).toEqual(DEFAULT_PROJECT_SETTINGS);
    });

    it('should return stored settings if available', async () => {
      const customSettings = {
        ...DEFAULT_PROJECT_SETTINGS,
        defaultPriority: 'HIGH',
        maxConcurrentAgents: 10
      };

      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'setting-1',
        key: 'defaults.project',
        value: customSettings
      });

      const settings = await service.getDefaultProjectSettings();

      expect(settings.defaultPriority).toBe('HIGH');
      expect(settings.maxConcurrentAgents).toBe(10);
    });
  });

  describe('updateDefaultProjectSettings', () => {
    it('should merge with existing settings', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'setting-1',
        key: 'defaults.project',
        value: DEFAULT_PROJECT_SETTINGS
      });
      mockPrisma.systemSettings.upsert.mockResolvedValue({
        id: 'setting-1',
        key: 'defaults.project',
        value: { ...DEFAULT_PROJECT_SETTINGS, defaultPriority: 'HIGH' },
        description: 'Default settings for new projects',
        category: 'defaults',
        isSensitive: false,
        updatedBy: 'admin-1',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await service.updateDefaultProjectSettings(
        { defaultPriority: 'HIGH' },
        'admin-1'
      );

      expect(result.defaultPriority).toBe('HIGH');
      expect(result.enableAutoAssignment).toBe(DEFAULT_PROJECT_SETTINGS.enableAutoAssignment);
    });
  });

  describe('getClaudeFlowSettings', () => {
    it('should return default Claude Flow settings', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue(null);

      const settings = await service.getClaudeFlowSettings();

      expect(settings).toEqual(DEFAULT_CLAUDE_FLOW_SETTINGS);
    });

    it('should return stored settings if available', async () => {
      const customSettings = {
        ...DEFAULT_CLAUDE_FLOW_SETTINGS,
        maxAgents: 25,
        topology: 'mesh' as const
      };

      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'setting-1',
        key: 'claude-flow.config',
        value: customSettings
      });

      const settings = await service.getClaudeFlowSettings();

      expect(settings.maxAgents).toBe(25);
      expect(settings.topology).toBe('mesh');
    });
  });

  describe('initializeDefaults', () => {
    it('should create default settings if not exist', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue(null);
      mockPrisma.systemSettings.create.mockResolvedValue({});

      await service.initializeDefaults('admin-1');

      expect(mockPrisma.systemSettings.create).toHaveBeenCalledTimes(2);
    });

    it('should not overwrite existing settings', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'existing',
        key: 'defaults.project',
        value: DEFAULT_PROJECT_SETTINGS
      });

      await service.initializeDefaults('admin-1');

      expect(mockPrisma.systemSettings.create).not.toHaveBeenCalled();
    });
  });

  describe('sensitive value masking', () => {
    it('should mask short strings completely', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'setting-1',
        key: 'short.key',
        value: 'abc',
        isSensitive: true,
        description: null,
        category: 'security',
        updatedBy: 'admin-1',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const setting = await service.getSetting('short.key');

      expect(setting?.value).toBe('****');
    });

    it('should mask object properties containing key/secret/password', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'setting-1',
        key: 'api.config',
        value: {
          apiKey: 'secret-api-key',
          secret: 'super-secret',
          password: 'my-password',
          endpoint: 'https://api.example.com',
          enabled: true
        },
        isSensitive: true,
        description: null,
        category: 'integrations',
        updatedBy: 'admin-1',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const setting = await service.getSetting('api.config');
      const value = setting?.value as Record<string, unknown>;

      expect(value.apiKey).toBe('****');
      expect(value.secret).toBe('****');
      expect(value.password).toBe('****');
      expect(value.endpoint).toBe('https://api.example.com');
      expect(value.enabled).toBe(true);
    });
  });
});

describe('Default Settings', () => {
  it('should have valid DEFAULT_PROJECT_SETTINGS', () => {
    expect(DEFAULT_PROJECT_SETTINGS.defaultPriority).toBeDefined();
    expect(DEFAULT_PROJECT_SETTINGS.enableAutoAssignment).toBe(true);
    expect(DEFAULT_PROJECT_SETTINGS.maxConcurrentAgents).toBeGreaterThan(0);
    expect(DEFAULT_PROJECT_SETTINGS.defaultLabels).toEqual([]);
    expect(DEFAULT_PROJECT_SETTINGS.autoArchiveAfterDays).toBeNull();
  });

  it('should have valid DEFAULT_CLAUDE_FLOW_SETTINGS', () => {
    expect(DEFAULT_CLAUDE_FLOW_SETTINGS.enabled).toBe(true);
    expect(DEFAULT_CLAUDE_FLOW_SETTINGS.maxAgents).toBeGreaterThan(0);
    expect(DEFAULT_CLAUDE_FLOW_SETTINGS.topology).toBe('hierarchical-mesh');
    expect(DEFAULT_CLAUDE_FLOW_SETTINGS.enableNeuralLearning).toBe(true);
    expect(DEFAULT_CLAUDE_FLOW_SETTINGS.enableHNSW).toBe(true);
  });
});
