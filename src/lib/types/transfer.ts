/**
 * TASK-084/085/086/087: Transfer Module Types
 *
 * Type definitions for cross-project pattern transfer functionality.
 */

/**
 * A pattern that can be transferred between projects
 */
export interface TransferablePattern {
	id: string;
	name: string;
	description: string;
	keywords: string[];
	agentConfig: string[];
	topology?: string;
	projectId: string;
	projectName: string;
	createdAt: string;
	updatedAt: string;
	successRate: number;
	usageCount: number;
	isPublic: boolean;
}

/**
 * Transfer compatibility assessment
 */
export interface TransferCompatibility {
	score: number; // 0-100%
	conflicts: TransferConflict[];
	warnings: string[];
	recommendations: string[];
}

/**
 * Conflict detected during transfer
 */
export interface TransferConflict {
	type: 'key_collision' | 'namespace_collision' | 'agent_mismatch' | 'version_conflict';
	severity: 'low' | 'medium' | 'high';
	description: string;
	resolution?: string;
}

/**
 * Transfer preview data
 */
export interface TransferPreview {
	pattern: TransferablePattern;
	compatibility: TransferCompatibility;
	estimatedIntegration: {
		affectedFiles: string[];
		newDependencies: string[];
		configChanges: string[];
	};
}

/**
 * Transfer operation result
 */
export interface TransferResult {
	success: boolean;
	transferId: string;
	sourcePattern: TransferablePattern;
	targetPatternId?: string;
	timestamp: string;
	error?: string;
}

/**
 * Transfer history entry
 */
export interface TransferHistoryEntry {
	id: string;
	transferId: string;
	sourcePatternId: string;
	sourcePatternName: string;
	sourceProjectId: string;
	sourceProjectName: string;
	targetProjectId: string;
	targetProjectName: string;
	status: 'success' | 'failed' | 'rolled_back';
	error?: string;
	timestamp: string;
	performanceMetrics?: TransferPerformanceMetrics;
	canRollback: boolean;
}

/**
 * Performance metrics before/after transfer
 */
export interface TransferPerformanceMetrics {
	before: {
		successRate: number;
		avgCompletionTime: number;
		usageCount: number;
	};
	after: {
		successRate: number;
		avgCompletionTime: number;
		usageCount: number;
	};
	improvement: number; // percentage change
}

/**
 * Project sharing settings
 */
export interface ProjectSharingSettings {
	projectId: string;
	defaultVisibility: 'public' | 'private';
	allowIncomingTransfers: boolean;
	allowedSourceProjects: string[]; // empty = all, specific IDs = only those
	blockedProjects: string[];
}

/**
 * Pattern sharing settings
 */
export interface PatternSharingSettings {
	patternId: string;
	isPublic: boolean;
	sharedWithProjects: string[];
	allowTransfer: boolean;
}

/**
 * Transfer filter options
 */
export interface TransferFilterOptions {
	projectId?: string;
	minSuccessRate?: number;
	keywords?: string[];
	isPublic?: boolean;
	limit?: number;
	offset?: number;
}
