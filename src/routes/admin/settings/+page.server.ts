/**
 * TASK-103: System Settings Page Server
 *
 * Server-side data loading for system settings.
 */

import type { PageServerLoad } from './$types';
import { settingsService } from '$lib/server/admin/settings-service';
import type {
  DefaultProjectSettings,
  ClaudeFlowSettings
} from '$lib/types/admin';

export interface SettingsPageData {
  projectSettings: DefaultProjectSettings;
  claudeFlowSettings: ClaudeFlowSettings;
}

export const load: PageServerLoad = async (): Promise<SettingsPageData> => {
  const [projectSettings, claudeFlowSettings] = await Promise.all([
    settingsService.getDefaultProjectSettings(),
    settingsService.getClaudeFlowSettings()
  ]);

  return {
    projectSettings,
    claudeFlowSettings
  };
};
