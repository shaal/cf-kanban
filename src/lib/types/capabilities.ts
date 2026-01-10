/**
 * GAP-8.4: Capabilities Browser Types
 *
 * Type definitions for the capabilities browser in the sidebar,
 * including agents, hooks, and workers.
 */

/**
 * Hook definition for the capabilities browser
 */
export interface HookDefinition {
	id: string;
	name: string;
	category: HookCategory;
	description: string;
	keyOptions: string[];
}

/**
 * Hook categories
 */
export type HookCategory =
	| 'core'
	| 'session'
	| 'intelligence'
	| 'neural'
	| 'coverage'
	| 'background';

/**
 * Worker definition for the capabilities browser
 */
export interface WorkerDefinition {
	id: string;
	name: string;
	priority: WorkerPriority;
	description: string;
}

/**
 * Worker priority levels
 */
export type WorkerPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Hook category configuration
 */
export const HOOK_CATEGORIES: Record<HookCategory, { label: string; color: string }> = {
	core: { label: 'Core Hooks', color: '#4f46e5' },
	session: { label: 'Session Management', color: '#7c3aed' },
	intelligence: { label: 'Intelligence Routing', color: '#0891b2' },
	neural: { label: 'Neural Learning', color: '#059669' },
	coverage: { label: 'Coverage Analysis', color: '#d97706' },
	background: { label: 'Background Workers', color: '#dc2626' }
};

/**
 * Worker priority configuration
 */
export const WORKER_PRIORITIES: Record<WorkerPriority, { label: string; color: string }> = {
	critical: { label: 'Critical', color: '#dc2626' },
	high: { label: 'High', color: '#d97706' },
	normal: { label: 'Normal', color: '#059669' },
	low: { label: 'Low', color: '#6b7280' }
};
