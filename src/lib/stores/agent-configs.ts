/**
 * Agent Configuration Store
 * GAP-3.3.5: Custom Agent Configuration
 *
 * State management for custom agent configurations with localStorage persistence.
 * Allows users to create, save, and manage agent configuration presets.
 */

import { writable, derived, get } from 'svelte/store';
import type {
	CustomAgentConfig,
	CreateCustomAgentConfigPayload,
	UpdateCustomAgentConfigPayload,
	ProjectAgentSettings
} from '$lib/types/agents';
import {
	createConfigId,
	validateCustomAgentConfig,
	DEFAULT_PROJECT_AGENT_SETTINGS
} from '$lib/types/agents';
import { browser } from '$app/environment';

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEY_PREFIX = 'cf-kanban-agent-configs';
const PROJECT_SETTINGS_KEY = (projectId: string) => `${STORAGE_KEY_PREFIX}-project-${projectId}`;
const GLOBAL_CONFIGS_KEY = `${STORAGE_KEY_PREFIX}-global`;

// ============================================================================
// Internal Stores
// ============================================================================

/**
 * Map of project ID to ProjectAgentSettings
 */
const projectSettingsMap = writable<Map<string, ProjectAgentSettings>>(new Map());

/**
 * Global (non-project-specific) configurations
 */
const globalConfigs = writable<CustomAgentConfig[]>([]);

/**
 * Currently active project ID
 */
const activeProjectId = writable<string | null>(null);

// ============================================================================
// Derived Stores
// ============================================================================

/**
 * Get settings for the currently active project
 */
export const currentProjectSettings = derived(
	[projectSettingsMap, activeProjectId],
	([$settings, $projectId]) => {
		if (!$projectId) return null;
		return $settings.get($projectId) ?? { ...DEFAULT_PROJECT_AGENT_SETTINGS };
	}
);

/**
 * Get all custom configs for the current project
 */
export const currentProjectConfigs = derived(currentProjectSettings, ($settings) => {
	return $settings?.customConfigs ?? [];
});

/**
 * Get all configs (global + current project)
 */
export const allConfigs = derived(
	[globalConfigs, currentProjectConfigs],
	([$global, $project]) => {
		return [...$global, ...$project];
	}
);

/**
 * Get configs grouped by agent type
 */
export const configsByAgentType = derived(allConfigs, ($configs) => {
	const map = new Map<string, CustomAgentConfig[]>();
	for (const config of $configs) {
		const existing = map.get(config.agentTypeId) ?? [];
		existing.push(config);
		map.set(config.agentTypeId, existing);
	}
	return map;
});

/**
 * Get the default config for each agent type
 */
export const defaultConfigs = derived(allConfigs, ($configs) => {
	const map = new Map<string, CustomAgentConfig>();
	for (const config of $configs) {
		if (config.isDefault) {
			map.set(config.agentTypeId, config);
		}
	}
	return map;
});

// ============================================================================
// Actions
// ============================================================================

/**
 * Set the active project ID
 * @param projectId - Project ID to set as active
 */
export function setActiveProject(projectId: string | null): void {
	activeProjectId.set(projectId);
	if (projectId) {
		loadProjectSettings(projectId);
	}
}

/**
 * Create a new custom agent configuration
 * @param payload - Configuration data
 * @param projectId - Optional project ID (null for global config)
 * @returns The created config or validation errors
 */
export function createConfig(
	payload: CreateCustomAgentConfigPayload,
	projectId: string | null = null
): { config?: CustomAgentConfig; errors?: string[] } {
	const errors = validateCustomAgentConfig(payload);
	if (errors.length > 0) {
		return { errors };
	}

	const now = new Date();
	const config: CustomAgentConfig = {
		id: createConfigId(),
		name: payload.name.trim(),
		agentTypeId: payload.agentTypeId,
		prompt: payload.prompt,
		model: payload.model,
		maxTokens: payload.maxTokens,
		temperature: payload.temperature,
		env: payload.env,
		tags: payload.tags ?? [],
		description: payload.description,
		createdAt: now,
		updatedAt: now,
		isDefault: payload.isDefault ?? false
	};

	if (projectId) {
		// Add to project-specific configs
		projectSettingsMap.update((map) => {
			const settings = map.get(projectId) ?? { ...DEFAULT_PROJECT_AGENT_SETTINGS };

			// If this is set as default, unset other defaults for this agent type
			if (config.isDefault) {
				settings.customConfigs = settings.customConfigs.map((c) =>
					c.agentTypeId === config.agentTypeId ? { ...c, isDefault: false } : c
				);
			}

			settings.customConfigs.push(config);
			map.set(projectId, settings);
			saveProjectSettings(projectId, settings);
			return new Map(map);
		});
	} else {
		// Add to global configs
		globalConfigs.update((configs) => {
			// If this is set as default, unset other defaults for this agent type
			if (config.isDefault) {
				configs = configs.map((c) =>
					c.agentTypeId === config.agentTypeId ? { ...c, isDefault: false } : c
				);
			}
			const updated = [...configs, config];
			saveGlobalConfigs(updated);
			return updated;
		});
	}

	return { config };
}

/**
 * Update an existing custom agent configuration
 * @param configId - ID of the config to update
 * @param payload - Updated configuration data
 * @param projectId - Optional project ID (null for global config)
 * @returns The updated config or errors
 */
export function updateConfig(
	configId: string,
	payload: UpdateCustomAgentConfigPayload,
	projectId: string | null = null
): { config?: CustomAgentConfig; errors?: string[] } {
	const errors: string[] = [];

	if (payload.name !== undefined && payload.name.trim().length === 0) {
		errors.push('Name cannot be empty');
	}
	if (payload.name && payload.name.length > 100) {
		errors.push('Name must be 100 characters or less');
	}
	if (payload.temperature !== undefined && (payload.temperature < 0 || payload.temperature > 1)) {
		errors.push('Temperature must be between 0 and 1');
	}
	if (
		payload.maxTokens !== undefined &&
		(payload.maxTokens < 100 || payload.maxTokens > 100000)
	) {
		errors.push('Max tokens must be between 100 and 100000');
	}
	if (payload.prompt && payload.prompt.length > 10000) {
		errors.push('Prompt must be 10000 characters or less');
	}

	if (errors.length > 0) {
		return { errors };
	}

	let updatedConfig: CustomAgentConfig | undefined;

	if (projectId) {
		projectSettingsMap.update((map) => {
			const settings = map.get(projectId);
			if (!settings) return map;

			const configIndex = settings.customConfigs.findIndex((c) => c.id === configId);
			if (configIndex === -1) return map;

			const existing = settings.customConfigs[configIndex];
			updatedConfig = {
				...existing,
				...payload,
				updatedAt: new Date()
			};

			// If this is set as default, unset other defaults for this agent type
			if (payload.isDefault) {
				settings.customConfigs = settings.customConfigs.map((c) =>
					c.agentTypeId === updatedConfig!.agentTypeId && c.id !== configId
						? { ...c, isDefault: false }
						: c
				);
			}

			settings.customConfigs[configIndex] = updatedConfig;
			map.set(projectId, settings);
			saveProjectSettings(projectId, settings);
			return new Map(map);
		});
	} else {
		globalConfigs.update((configs) => {
			const configIndex = configs.findIndex((c) => c.id === configId);
			if (configIndex === -1) return configs;

			const existing = configs[configIndex];
			updatedConfig = {
				...existing,
				...payload,
				updatedAt: new Date()
			};

			// If this is set as default, unset other defaults for this agent type
			if (payload.isDefault) {
				configs = configs.map((c) =>
					c.agentTypeId === updatedConfig!.agentTypeId && c.id !== configId
						? { ...c, isDefault: false }
						: c
				);
			}

			configs[configIndex] = updatedConfig;
			saveGlobalConfigs(configs);
			return [...configs];
		});
	}

	return { config: updatedConfig };
}

/**
 * Delete a custom agent configuration
 * @param configId - ID of the config to delete
 * @param projectId - Optional project ID (null for global config)
 * @returns True if deleted successfully
 */
export function deleteConfig(configId: string, projectId: string | null = null): boolean {
	let deleted = false;

	if (projectId) {
		projectSettingsMap.update((map) => {
			const settings = map.get(projectId);
			if (!settings) return map;

			const originalLength = settings.customConfigs.length;
			settings.customConfigs = settings.customConfigs.filter((c) => c.id !== configId);
			deleted = settings.customConfigs.length < originalLength;

			if (deleted) {
				map.set(projectId, settings);
				saveProjectSettings(projectId, settings);
			}
			return new Map(map);
		});
	} else {
		globalConfigs.update((configs) => {
			const originalLength = configs.length;
			const updated = configs.filter((c) => c.id !== configId);
			deleted = updated.length < originalLength;

			if (deleted) {
				saveGlobalConfigs(updated);
			}
			return updated;
		});
	}

	return deleted;
}

/**
 * Get a specific config by ID
 * @param configId - Config ID to find
 * @returns The config or undefined
 */
export function getConfigById(configId: string): CustomAgentConfig | undefined {
	const all = get(allConfigs);
	return all.find((c) => c.id === configId);
}

/**
 * Get configs for a specific agent type
 * @param agentTypeId - Agent type ID
 * @returns Array of configs for that agent type
 */
export function getConfigsForAgentType(agentTypeId: string): CustomAgentConfig[] {
	const all = get(allConfigs);
	return all.filter((c) => c.agentTypeId === agentTypeId);
}

/**
 * Get the default config for an agent type
 * @param agentTypeId - Agent type ID
 * @returns The default config or undefined
 */
export function getDefaultConfigForAgentType(agentTypeId: string): CustomAgentConfig | undefined {
	const defaults = get(defaultConfigs);
	return defaults.get(agentTypeId);
}

/**
 * Duplicate an existing config
 * @param configId - ID of config to duplicate
 * @param newName - Name for the duplicate
 * @param projectId - Optional project ID
 * @returns The duplicated config or errors
 */
export function duplicateConfig(
	configId: string,
	newName: string,
	projectId: string | null = null
): { config?: CustomAgentConfig; errors?: string[] } {
	const original = getConfigById(configId);
	if (!original) {
		return { errors: ['Config not found'] };
	}

	return createConfig(
		{
			name: newName,
			agentTypeId: original.agentTypeId,
			prompt: original.prompt,
			model: original.model,
			maxTokens: original.maxTokens,
			temperature: original.temperature,
			env: original.env ? { ...original.env } : undefined,
			tags: original.tags ? [...original.tags] : undefined,
			description: original.description,
			isDefault: false // Duplicates are never default
		},
		projectId
	);
}

/**
 * Update project agent settings (non-config settings)
 * @param projectId - Project ID
 * @param settings - Partial settings to update
 */
export function updateProjectAgentSettings(
	projectId: string,
	settings: Partial<Omit<ProjectAgentSettings, 'customConfigs'>>
): void {
	projectSettingsMap.update((map) => {
		const existing = map.get(projectId) ?? { ...DEFAULT_PROJECT_AGENT_SETTINGS };
		const updated = {
			...existing,
			...settings
		};
		map.set(projectId, updated);
		saveProjectSettings(projectId, updated);
		return new Map(map);
	});
}

/**
 * Export configs to JSON
 * @param projectId - Optional project ID (null for global)
 * @returns JSON string of configs
 */
export function exportConfigs(projectId: string | null = null): string {
	if (projectId) {
		const settings = get(projectSettingsMap).get(projectId);
		return JSON.stringify(settings?.customConfigs ?? [], null, 2);
	}
	return JSON.stringify(get(globalConfigs), null, 2);
}

/**
 * Import configs from JSON
 * @param json - JSON string of configs
 * @param projectId - Optional project ID (null for global)
 * @returns Number of configs imported or errors
 */
export function importConfigs(
	json: string,
	projectId: string | null = null
): { count?: number; errors?: string[] } {
	try {
		const configs = JSON.parse(json) as CustomAgentConfig[];

		if (!Array.isArray(configs)) {
			return { errors: ['Invalid format: expected array of configs'] };
		}

		let importedCount = 0;
		const errors: string[] = [];

		for (const config of configs) {
			// Validate required fields
			if (!config.name || !config.agentTypeId) {
				errors.push(`Invalid config: missing required fields`);
				continue;
			}

			// Create new config with fresh ID and timestamps
			const result = createConfig(
				{
					name: config.name,
					agentTypeId: config.agentTypeId,
					prompt: config.prompt,
					model: config.model,
					maxTokens: config.maxTokens,
					temperature: config.temperature,
					env: config.env,
					tags: config.tags,
					description: config.description,
					isDefault: false // Imported configs are never default
				},
				projectId
			);

			if (result.config) {
				importedCount++;
			} else if (result.errors) {
				errors.push(...result.errors);
			}
		}

		return { count: importedCount, errors: errors.length > 0 ? errors : undefined };
	} catch {
		return { errors: ['Invalid JSON format'] };
	}
}

// ============================================================================
// Persistence Functions
// ============================================================================

/**
 * Load project settings from localStorage
 */
function loadProjectSettings(projectId: string): void {
	if (!browser) return;

	try {
		const stored = localStorage.getItem(PROJECT_SETTINGS_KEY(projectId));
		if (stored) {
			const settings = JSON.parse(stored) as ProjectAgentSettings;
			// Convert date strings back to Date objects
			settings.customConfigs = settings.customConfigs.map((c) => ({
				...c,
				createdAt: new Date(c.createdAt),
				updatedAt: new Date(c.updatedAt)
			}));
			projectSettingsMap.update((map) => {
				map.set(projectId, settings);
				return new Map(map);
			});
		}
	} catch (error) {
		console.error(`Failed to load project settings for ${projectId}:`, error);
	}
}

/**
 * Save project settings to localStorage
 */
function saveProjectSettings(projectId: string, settings: ProjectAgentSettings): void {
	if (!browser) return;

	try {
		localStorage.setItem(PROJECT_SETTINGS_KEY(projectId), JSON.stringify(settings));
	} catch (error) {
		console.error(`Failed to save project settings for ${projectId}:`, error);
	}
}

/**
 * Load global configs from localStorage
 */
function loadGlobalConfigs(): void {
	if (!browser) return;

	try {
		const stored = localStorage.getItem(GLOBAL_CONFIGS_KEY);
		if (stored) {
			const configs = JSON.parse(stored) as CustomAgentConfig[];
			// Convert date strings back to Date objects
			const processedConfigs = configs.map((c) => ({
				...c,
				createdAt: new Date(c.createdAt),
				updatedAt: new Date(c.updatedAt)
			}));
			globalConfigs.set(processedConfigs);
		}
	} catch (error) {
		console.error('Failed to load global configs:', error);
	}
}

/**
 * Save global configs to localStorage
 */
function saveGlobalConfigs(configs: CustomAgentConfig[]): void {
	if (!browser) return;

	try {
		localStorage.setItem(GLOBAL_CONFIGS_KEY, JSON.stringify(configs));
	} catch (error) {
		console.error('Failed to save global configs:', error);
	}
}

/**
 * Initialize the store (call on app startup)
 */
export function initializeAgentConfigStore(): void {
	loadGlobalConfigs();
}

// Auto-initialize in browser
if (browser) {
	initializeAgentConfigStore();
}
