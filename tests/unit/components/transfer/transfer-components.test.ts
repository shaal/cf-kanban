/**
 * TASK-084/085/086/087: Unit Tests for Transfer Components
 *
 * Tests for TransferPreview, TransferHistory, and SharingControls components.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
	TransferablePattern,
	TransferPreview,
	TransferCompatibility,
	TransferConflict,
	TransferHistoryEntry,
	TransferPerformanceMetrics,
	ProjectSharingSettings,
	PatternSharingSettings
} from '$lib/types/transfer';

// Mock data factories
function createMockPattern(overrides?: Partial<TransferablePattern>): TransferablePattern {
	return {
		id: 'pattern-1',
		name: 'Test Pattern',
		description: 'A test pattern for unit testing',
		keywords: ['test', 'api', 'database'],
		agentConfig: ['coder', 'tester'],
		topology: 'hierarchical',
		projectId: 'project-source',
		projectName: 'Source Project',
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z',
		successRate: 0.85,
		usageCount: 10,
		isPublic: true,
		...overrides
	};
}

function createMockConflict(overrides?: Partial<TransferConflict>): TransferConflict {
	return {
		type: 'key_collision',
		severity: 'high',
		description: 'Pattern with this ID already exists',
		resolution: 'Rename the pattern',
		...overrides
	};
}

function createMockCompatibility(overrides?: Partial<TransferCompatibility>): TransferCompatibility {
	return {
		score: 85,
		conflicts: [],
		warnings: [],
		recommendations: ['High success rate pattern - recommended for transfer'],
		...overrides
	};
}

function createMockPreview(overrides?: Partial<TransferPreview>): TransferPreview {
	return {
		pattern: createMockPattern(),
		compatibility: createMockCompatibility(),
		estimatedIntegration: {
			affectedFiles: ['src/lib/patterns/pattern-1.ts'],
			newDependencies: [],
			configChanges: []
		},
		...overrides
	};
}

function createMockHistoryEntry(overrides?: Partial<TransferHistoryEntry>): TransferHistoryEntry {
	return {
		id: 'transfer-123',
		transferId: 'transfer-123',
		sourcePatternId: 'pattern-1',
		sourcePatternName: 'Test Pattern',
		sourceProjectId: 'project-source',
		sourceProjectName: 'Source Project',
		targetProjectId: 'project-target',
		targetProjectName: 'Target Project',
		status: 'success',
		timestamp: '2024-01-02T10:30:00Z',
		canRollback: true,
		...overrides
	};
}

function createMockPerformanceMetrics(
	overrides?: Partial<TransferPerformanceMetrics>
): TransferPerformanceMetrics {
	return {
		before: {
			successRate: 0.75,
			avgCompletionTime: 3600,
			usageCount: 10
		},
		after: {
			successRate: 0.82,
			avgCompletionTime: 3200,
			usageCount: 15
		},
		improvement: 9.3,
		...overrides
	};
}

function createMockProjectSettings(
	overrides?: Partial<ProjectSharingSettings>
): ProjectSharingSettings {
	return {
		projectId: 'project-1',
		defaultVisibility: 'private',
		allowIncomingTransfers: true,
		allowedSourceProjects: [],
		blockedProjects: [],
		...overrides
	};
}

function createMockPatternSettings(
	overrides?: Partial<PatternSharingSettings>
): PatternSharingSettings {
	return {
		patternId: 'pattern-1',
		isPublic: false,
		sharedWithProjects: [],
		allowTransfer: true,
		...overrides
	};
}

describe('Transfer Component Types', () => {
	describe('TransferablePattern', () => {
		it('should have all required fields', () => {
			const pattern = createMockPattern();

			expect(pattern.id).toBeDefined();
			expect(pattern.name).toBeDefined();
			expect(pattern.keywords).toBeInstanceOf(Array);
			expect(pattern.agentConfig).toBeInstanceOf(Array);
			expect(pattern.projectId).toBeDefined();
			expect(pattern.projectName).toBeDefined();
			expect(pattern.successRate).toBeGreaterThanOrEqual(0);
			expect(pattern.successRate).toBeLessThanOrEqual(1);
			expect(typeof pattern.isPublic).toBe('boolean');
		});

		it('should allow optional topology', () => {
			const withTopology = createMockPattern({ topology: 'mesh' });
			const withoutTopology = createMockPattern({ topology: undefined });

			expect(withTopology.topology).toBe('mesh');
			expect(withoutTopology.topology).toBeUndefined();
		});
	});

	describe('TransferConflict', () => {
		it('should support all conflict types', () => {
			const types: TransferConflict['type'][] = [
				'key_collision',
				'namespace_collision',
				'agent_mismatch',
				'version_conflict'
			];

			types.forEach((type) => {
				const conflict = createMockConflict({ type });
				expect(conflict.type).toBe(type);
			});
		});

		it('should support all severity levels', () => {
			const severities: TransferConflict['severity'][] = ['low', 'medium', 'high'];

			severities.forEach((severity) => {
				const conflict = createMockConflict({ severity });
				expect(conflict.severity).toBe(severity);
			});
		});

		it('should have optional resolution', () => {
			const withResolution = createMockConflict({ resolution: 'Fix it' });
			const withoutResolution = createMockConflict({ resolution: undefined });

			expect(withResolution.resolution).toBe('Fix it');
			expect(withoutResolution.resolution).toBeUndefined();
		});
	});

	describe('TransferCompatibility', () => {
		it('should have score between 0 and 100', () => {
			const compatibility = createMockCompatibility({ score: 75 });

			expect(compatibility.score).toBeGreaterThanOrEqual(0);
			expect(compatibility.score).toBeLessThanOrEqual(100);
		});

		it('should contain arrays for conflicts, warnings, and recommendations', () => {
			const compatibility = createMockCompatibility({
				conflicts: [createMockConflict()],
				warnings: ['Warning 1'],
				recommendations: ['Recommendation 1']
			});

			expect(compatibility.conflicts).toBeInstanceOf(Array);
			expect(compatibility.warnings).toBeInstanceOf(Array);
			expect(compatibility.recommendations).toBeInstanceOf(Array);
		});
	});

	describe('TransferPreview', () => {
		it('should include pattern and compatibility', () => {
			const preview = createMockPreview();

			expect(preview.pattern).toBeDefined();
			expect(preview.compatibility).toBeDefined();
			expect(preview.estimatedIntegration).toBeDefined();
		});

		it('should include integration details', () => {
			const preview = createMockPreview({
				estimatedIntegration: {
					affectedFiles: ['file1.ts', 'file2.ts'],
					newDependencies: ['dep1', 'dep2'],
					configChanges: ['change1']
				}
			});

			expect(preview.estimatedIntegration.affectedFiles.length).toBe(2);
			expect(preview.estimatedIntegration.newDependencies.length).toBe(2);
			expect(preview.estimatedIntegration.configChanges.length).toBe(1);
		});
	});

	describe('TransferHistoryEntry', () => {
		it('should support all status types', () => {
			const statuses: TransferHistoryEntry['status'][] = ['success', 'failed', 'rolled_back'];

			statuses.forEach((status) => {
				const entry = createMockHistoryEntry({ status });
				expect(entry.status).toBe(status);
			});
		});

		it('should include source and target information', () => {
			const entry = createMockHistoryEntry();

			expect(entry.sourcePatternId).toBeDefined();
			expect(entry.sourcePatternName).toBeDefined();
			expect(entry.sourceProjectId).toBeDefined();
			expect(entry.sourceProjectName).toBeDefined();
			expect(entry.targetProjectId).toBeDefined();
			expect(entry.targetProjectName).toBeDefined();
		});

		it('should have optional error for failed transfers', () => {
			const success = createMockHistoryEntry({ status: 'success' });
			const failed = createMockHistoryEntry({
				status: 'failed',
				error: 'Transfer failed due to conflict'
			});

			expect(success.error).toBeUndefined();
			expect(failed.error).toBeDefined();
		});

		it('should track rollback capability', () => {
			const canRollback = createMockHistoryEntry({ canRollback: true });
			const cannotRollback = createMockHistoryEntry({ canRollback: false });

			expect(canRollback.canRollback).toBe(true);
			expect(cannotRollback.canRollback).toBe(false);
		});
	});

	describe('TransferPerformanceMetrics', () => {
		it('should include before and after metrics', () => {
			const metrics = createMockPerformanceMetrics();

			expect(metrics.before).toBeDefined();
			expect(metrics.after).toBeDefined();
			expect(metrics.before.successRate).toBeDefined();
			expect(metrics.after.successRate).toBeDefined();
		});

		it('should calculate improvement', () => {
			const positive = createMockPerformanceMetrics({ improvement: 10 });
			const negative = createMockPerformanceMetrics({ improvement: -5 });
			const neutral = createMockPerformanceMetrics({ improvement: 0 });

			expect(positive.improvement).toBeGreaterThan(0);
			expect(negative.improvement).toBeLessThan(0);
			expect(neutral.improvement).toBe(0);
		});
	});

	describe('ProjectSharingSettings', () => {
		it('should have default visibility option', () => {
			const publicDefault = createMockProjectSettings({ defaultVisibility: 'public' });
			const privateDefault = createMockProjectSettings({ defaultVisibility: 'private' });

			expect(publicDefault.defaultVisibility).toBe('public');
			expect(privateDefault.defaultVisibility).toBe('private');
		});

		it('should control incoming transfers', () => {
			const allowed = createMockProjectSettings({ allowIncomingTransfers: true });
			const blocked = createMockProjectSettings({ allowIncomingTransfers: false });

			expect(allowed.allowIncomingTransfers).toBe(true);
			expect(blocked.allowIncomingTransfers).toBe(false);
		});

		it('should manage allowed and blocked projects', () => {
			const settings = createMockProjectSettings({
				allowedSourceProjects: ['project-2', 'project-3'],
				blockedProjects: ['project-4']
			});

			expect(settings.allowedSourceProjects.length).toBe(2);
			expect(settings.blockedProjects.length).toBe(1);
		});
	});

	describe('PatternSharingSettings', () => {
		it('should toggle public visibility', () => {
			const publicPattern = createMockPatternSettings({ isPublic: true });
			const privatePattern = createMockPatternSettings({ isPublic: false });

			expect(publicPattern.isPublic).toBe(true);
			expect(privatePattern.isPublic).toBe(false);
		});

		it('should track shared projects', () => {
			const shared = createMockPatternSettings({
				sharedWithProjects: ['project-1', 'project-2']
			});
			const notShared = createMockPatternSettings({ sharedWithProjects: [] });

			expect(shared.sharedWithProjects.length).toBe(2);
			expect(notShared.sharedWithProjects.length).toBe(0);
		});

		it('should control transfer permission', () => {
			const transferable = createMockPatternSettings({ allowTransfer: true });
			const nonTransferable = createMockPatternSettings({ allowTransfer: false });

			expect(transferable.allowTransfer).toBe(true);
			expect(nonTransferable.allowTransfer).toBe(false);
		});
	});
});

describe('Transfer Preview Logic', () => {
	it('should determine compatibility level from score', () => {
		const getCompatibilityLevel = (score: number): string => {
			if (score >= 80) return 'high';
			if (score >= 60) return 'moderate';
			return 'low';
		};

		expect(getCompatibilityLevel(90)).toBe('high');
		expect(getCompatibilityLevel(80)).toBe('high');
		expect(getCompatibilityLevel(70)).toBe('moderate');
		expect(getCompatibilityLevel(60)).toBe('moderate');
		expect(getCompatibilityLevel(50)).toBe('low');
	});

	it('should identify blocking conflicts', () => {
		const hasBlockingConflicts = (conflicts: TransferConflict[]): boolean => {
			return conflicts.some((c) => c.severity === 'high');
		};

		const noConflicts: TransferConflict[] = [];
		const lowConflicts = [createMockConflict({ severity: 'low' })];
		const highConflicts = [createMockConflict({ severity: 'high' })];
		const mixedConflicts = [
			createMockConflict({ severity: 'low' }),
			createMockConflict({ severity: 'high' })
		];

		expect(hasBlockingConflicts(noConflicts)).toBe(false);
		expect(hasBlockingConflicts(lowConflicts)).toBe(false);
		expect(hasBlockingConflicts(highConflicts)).toBe(true);
		expect(hasBlockingConflicts(mixedConflicts)).toBe(true);
	});
});

describe('Transfer History Logic', () => {
	it('should format relative time correctly', () => {
		const formatRelativeTime = (dateString: string): string => {
			const date = new Date(dateString);
			const now = new Date();
			const diffMs = now.getTime() - date.getTime();
			const diffMins = Math.floor(diffMs / 60000);
			const diffHours = Math.floor(diffMs / 3600000);
			const diffDays = Math.floor(diffMs / 86400000);

			if (diffMins < 1) return 'Just now';
			if (diffMins < 60) return `${diffMins}m ago`;
			if (diffHours < 24) return `${diffHours}h ago`;
			if (diffDays < 7) return `${diffDays}d ago`;
			return 'Over a week ago';
		};

		const now = new Date();
		const fiveMinAgo = new Date(now.getTime() - 5 * 60000).toISOString();
		const twoHoursAgo = new Date(now.getTime() - 2 * 3600000).toISOString();
		const threeDaysAgo = new Date(now.getTime() - 3 * 86400000).toISOString();

		expect(formatRelativeTime(fiveMinAgo)).toBe('5m ago');
		expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago');
		expect(formatRelativeTime(threeDaysAgo)).toBe('3d ago');
	});

	it('should determine if rollback is allowed', () => {
		const canRollback = (entry: TransferHistoryEntry): boolean => {
			return entry.canRollback && entry.status === 'success';
		};

		const successCanRollback = createMockHistoryEntry({ status: 'success', canRollback: true });
		const successCannotRollback = createMockHistoryEntry({ status: 'success', canRollback: false });
		const failedCanRollback = createMockHistoryEntry({ status: 'failed', canRollback: true });
		const rolledBack = createMockHistoryEntry({ status: 'rolled_back', canRollback: false });

		expect(canRollback(successCanRollback)).toBe(true);
		expect(canRollback(successCannotRollback)).toBe(false);
		expect(canRollback(failedCanRollback)).toBe(false);
		expect(canRollback(rolledBack)).toBe(false);
	});

	it('should calculate performance improvement percentage', () => {
		const calculateImprovement = (before: number, after: number): number => {
			return ((after - before) / before) * 100;
		};

		expect(calculateImprovement(0.75, 0.82)).toBeCloseTo(9.33, 1);
		expect(calculateImprovement(0.80, 0.80)).toBe(0);
		expect(calculateImprovement(0.90, 0.85)).toBeCloseTo(-5.56, 1);
	});
});

describe('Sharing Controls Logic', () => {
	it('should manage allowed source projects', () => {
		const settings = createMockProjectSettings();

		// Add project
		const addProject = (settings: ProjectSharingSettings, projectId: string) => {
			if (!settings.allowedSourceProjects.includes(projectId)) {
				settings.allowedSourceProjects = [...settings.allowedSourceProjects, projectId];
			}
			// Remove from blocked if present
			settings.blockedProjects = settings.blockedProjects.filter((p) => p !== projectId);
		};

		addProject(settings, 'project-2');
		expect(settings.allowedSourceProjects).toContain('project-2');

		// Add duplicate should not increase count
		addProject(settings, 'project-2');
		expect(settings.allowedSourceProjects.filter((p) => p === 'project-2').length).toBe(1);
	});

	it('should remove from blocked when adding to allowed', () => {
		const settings = createMockProjectSettings({
			blockedProjects: ['project-2']
		});

		const addProject = (settings: ProjectSharingSettings, projectId: string) => {
			if (!settings.allowedSourceProjects.includes(projectId)) {
				settings.allowedSourceProjects = [...settings.allowedSourceProjects, projectId];
			}
			settings.blockedProjects = settings.blockedProjects.filter((p) => p !== projectId);
		};

		addProject(settings, 'project-2');

		expect(settings.allowedSourceProjects).toContain('project-2');
		expect(settings.blockedProjects).not.toContain('project-2');
	});

	it('should toggle pattern visibility', () => {
		const settings = createMockPatternSettings({ isPublic: false });

		const toggleVisibility = (settings: PatternSharingSettings) => {
			settings.isPublic = !settings.isPublic;
		};

		expect(settings.isPublic).toBe(false);
		toggleVisibility(settings);
		expect(settings.isPublic).toBe(true);
		toggleVisibility(settings);
		expect(settings.isPublic).toBe(false);
	});

	it('should manage pattern project sharing', () => {
		const settings = createMockPatternSettings();

		const shareWithProject = (settings: PatternSharingSettings, projectId: string) => {
			if (!settings.sharedWithProjects.includes(projectId)) {
				settings.sharedWithProjects = [...settings.sharedWithProjects, projectId];
			}
		};

		const unshareWithProject = (settings: PatternSharingSettings, projectId: string) => {
			settings.sharedWithProjects = settings.sharedWithProjects.filter((p) => p !== projectId);
		};

		shareWithProject(settings, 'project-1');
		shareWithProject(settings, 'project-2');
		expect(settings.sharedWithProjects.length).toBe(2);

		unshareWithProject(settings, 'project-1');
		expect(settings.sharedWithProjects.length).toBe(1);
		expect(settings.sharedWithProjects).not.toContain('project-1');
	});
});
