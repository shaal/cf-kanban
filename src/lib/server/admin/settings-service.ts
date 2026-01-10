/**
 * TASK-103: System Settings Service
 *
 * Handles global configuration, default project settings,
 * Claude Flow integration settings, and external integrations.
 */

import { prisma } from '$lib/server/prisma';
import type {
  SystemSetting,
  UpdateSettingRequest,
  DefaultProjectSettings,
  ClaudeFlowSettings,
  SettingsCategory
} from '$lib/types/admin';
import { auditService } from './audit-service';

/**
 * Default values for project settings
 */
export const DEFAULT_PROJECT_SETTINGS: DefaultProjectSettings = {
  defaultPriority: 'MEDIUM',
  enableAutoAssignment: true,
  maxConcurrentAgents: 5,
  defaultLabels: [],
  autoArchiveAfterDays: null
};

/**
 * Default values for Claude Flow settings
 */
export const DEFAULT_CLAUDE_FLOW_SETTINGS: ClaudeFlowSettings = {
  enabled: true,
  apiEndpoint: null,
  maxAgents: 15,
  topology: 'hierarchical-mesh',
  enableNeuralLearning: true,
  enableHNSW: true,
  memoryBackend: 'hybrid'
};

export class SettingsService {
  /**
   * Get all settings, optionally filtered by category
   */
  async listSettings(category?: SettingsCategory): Promise<SystemSetting[]> {
    const where = category ? { category } : {};

    const settings = await prisma.systemSettings.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }]
    });

    return settings.map((s) => ({
      id: s.id,
      key: s.key,
      value: s.isSensitive ? this.maskSensitiveValue(s.value) : s.value,
      description: s.description,
      category: s.category,
      isSensitive: s.isSensitive,
      updatedBy: s.updatedBy,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    }));
  }

  /**
   * Get a single setting by key
   */
  async getSetting(key: string): Promise<SystemSetting | null> {
    const setting = await prisma.systemSettings.findUnique({
      where: { key }
    });

    if (!setting) return null;

    return {
      id: setting.id,
      key: setting.key,
      value: setting.isSensitive
        ? this.maskSensitiveValue(setting.value)
        : setting.value,
      description: setting.description,
      category: setting.category,
      isSensitive: setting.isSensitive,
      updatedBy: setting.updatedBy,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt
    };
  }

  /**
   * Get raw setting value (for internal use, doesn't mask sensitive values)
   */
  async getSettingValue<T>(key: string, defaultValue: T): Promise<T> {
    const setting = await prisma.systemSettings.findUnique({
      where: { key }
    });

    if (!setting) return defaultValue;

    return setting.value as T;
  }

  /**
   * Update or create a setting
   */
  async updateSetting(
    request: UpdateSettingRequest,
    updaterId: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<SystemSetting> {
    const existing = await prisma.systemSettings.findUnique({
      where: { key: request.key }
    });

    const setting = await prisma.systemSettings.upsert({
      where: { key: request.key },
      update: {
        value: request.value as object,
        description: request.description,
        category: request.category,
        isSensitive: request.isSensitive,
        updatedBy: updaterId
      },
      create: {
        key: request.key,
        value: request.value as object,
        description: request.description || null,
        category: request.category || 'general',
        isSensitive: request.isSensitive || false,
        updatedBy: updaterId
      }
    });

    await auditService.log({
      userId: updaterId,
      action: 'SETTINGS_UPDATED',
      entityType: 'SystemSettings',
      entityId: setting.id,
      description: `Updated setting: ${request.key}`,
      metadata: {
        key: request.key,
        category: request.category || setting.category,
        oldValue: existing?.isSensitive
          ? '[REDACTED]'
          : existing?.value || null,
        newValue: setting.isSensitive ? '[REDACTED]' : request.value
      },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
      isSensitive: setting.isSensitive
    });

    return {
      id: setting.id,
      key: setting.key,
      value: setting.isSensitive
        ? this.maskSensitiveValue(setting.value)
        : setting.value,
      description: setting.description,
      category: setting.category,
      isSensitive: setting.isSensitive,
      updatedBy: setting.updatedBy,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt
    };
  }

  /**
   * Delete a setting
   */
  async deleteSetting(
    key: string,
    deleterId: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const setting = await prisma.systemSettings.findUnique({
      where: { key }
    });

    if (!setting) {
      throw new Error('Setting not found');
    }

    await prisma.systemSettings.delete({ where: { key } });

    await auditService.log({
      userId: deleterId,
      action: 'SETTINGS_UPDATED',
      entityType: 'SystemSettings',
      entityId: setting.id,
      description: `Deleted setting: ${key}`,
      metadata: {
        key,
        category: setting.category,
        action: 'delete'
      },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
      isSensitive: setting.isSensitive
    });
  }

  /**
   * Get default project settings
   */
  async getDefaultProjectSettings(): Promise<DefaultProjectSettings> {
    return this.getSettingValue(
      'defaults.project',
      DEFAULT_PROJECT_SETTINGS
    );
  }

  /**
   * Update default project settings
   */
  async updateDefaultProjectSettings(
    settings: Partial<DefaultProjectSettings>,
    updaterId: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<DefaultProjectSettings> {
    const current = await this.getDefaultProjectSettings();
    const updated = { ...current, ...settings };

    await this.updateSetting(
      {
        key: 'defaults.project',
        value: updated,
        description: 'Default settings for new projects',
        category: 'defaults'
      },
      updaterId,
      requestInfo
    );

    return updated;
  }

  /**
   * Get Claude Flow settings
   */
  async getClaudeFlowSettings(): Promise<ClaudeFlowSettings> {
    return this.getSettingValue(
      'claude-flow.config',
      DEFAULT_CLAUDE_FLOW_SETTINGS
    );
  }

  /**
   * Update Claude Flow settings
   */
  async updateClaudeFlowSettings(
    settings: Partial<ClaudeFlowSettings>,
    updaterId: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<ClaudeFlowSettings> {
    const current = await this.getClaudeFlowSettings();
    const updated = { ...current, ...settings };

    await this.updateSetting(
      {
        key: 'claude-flow.config',
        value: updated,
        description: 'Claude Flow integration configuration',
        category: 'claude-flow'
      },
      updaterId,
      requestInfo
    );

    return updated;
  }

  /**
   * Get settings by category for admin UI
   */
  async getSettingsByCategory(): Promise<
    Record<SettingsCategory, SystemSetting[]>
  > {
    const settings = await this.listSettings();

    const byCategory: Record<string, SystemSetting[]> = {};
    settings.forEach((s) => {
      if (!byCategory[s.category]) {
        byCategory[s.category] = [];
      }
      byCategory[s.category].push(s);
    });

    return byCategory as Record<SettingsCategory, SystemSetting[]>;
  }

  /**
   * Initialize default settings if they don't exist
   */
  async initializeDefaults(
    adminId: string
  ): Promise<void> {
    const defaults = [
      {
        key: 'defaults.project',
        value: DEFAULT_PROJECT_SETTINGS,
        description: 'Default settings for new projects',
        category: 'defaults'
      },
      {
        key: 'claude-flow.config',
        value: DEFAULT_CLAUDE_FLOW_SETTINGS,
        description: 'Claude Flow integration configuration',
        category: 'claude-flow'
      }
    ];

    for (const setting of defaults) {
      const existing = await prisma.systemSettings.findUnique({
        where: { key: setting.key }
      });

      if (!existing) {
        await prisma.systemSettings.create({
          data: {
            key: setting.key,
            value: setting.value,
            description: setting.description,
            category: setting.category,
            updatedBy: adminId
          }
        });
      }
    }
  }

  /**
   * Mask sensitive values for display
   */
  private maskSensitiveValue(value: unknown): unknown {
    if (typeof value === 'string') {
      if (value.length <= 4) return '****';
      return value.substring(0, 2) + '****' + value.substring(value.length - 2);
    }
    if (typeof value === 'object' && value !== null) {
      const masked: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        if (
          key.toLowerCase().includes('key') ||
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('token')
        ) {
          masked[key] = typeof val === 'string' ? '****' : '[REDACTED]';
        } else {
          masked[key] = val;
        }
      }
      return masked;
    }
    return '[REDACTED]';
  }
}

export const settingsService = new SettingsService();
