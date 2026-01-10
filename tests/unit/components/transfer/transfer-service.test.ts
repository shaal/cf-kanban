/**
 * TASK-084/085/086/087: Unit Tests for Transfer Service
 *
 * Tests for cross-project pattern transfer functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TransferService, transferService } from '$lib/server/transfer/transfer-service';
import type {
	TransferablePattern,
	TransferHistoryEntry,
	ProjectSharingSettings,
	PatternSharingSettings
} from '$lib/types/transfer';

// Mock the Claude Flow CLI
vi.mock('$lib/server/claude-flow/cli', () => ({
	claudeFlowCLI: {
		execute: vi.fn().mockResolvedValue({
			stdout: '',
			stderr: '',
			exitCode: 0,
			timedOut: false,
			duration: 100
		})
	}
}));

import { claudeFlowCLI } from '$lib/server/claude-flow/cli';

describe('TransferService', () => {
	let service: TransferService;

	const mockPattern: TransferablePattern = {
		id: 'pattern-1',
		name: 'API Pattern',
		description: 'Pattern for API development',
		keywords: ['api', 'rest', 'http'],
		agentConfig: ['coder', 'tester', 'reviewer'],
		topology: 'hierarchical',
		projectId: 'project-source',
		projectName: 'Source Project',
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z',
		successRate: 0.85,
		usageCount: 15,
		isPublic: true
	};

	const mockHistoryEntry: TransferHistoryEntry = {
		id: 'transfer-123',
		transferId: 'transfer-123',
		sourcePatternId: 'pattern-1',
		sourcePatternName: 'API Pattern',
		sourceProjectId: 'project-source',
		sourceProjectName: 'Source Project',
		targetProjectId: 'project-target',
		targetProjectName: 'Target Project',
		status: 'success',
		timestamp: '2024-01-02T00:00:00Z',
		canRollback: true
	};

	beforeEach(() => {
		service = new TransferService();
		vi.clearAllMocks();
		vi.mocked(claudeFlowCLI.execute).mockResolvedValue({
			stdout: '',
			stderr: '',
			exitCode: 0,
			timedOut: false,
			duration: 100
		});
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('getTransferablePatterns', () => {
		it('should return empty array when no patterns found', async () => {
			const patterns = await service.getTransferablePatterns();
			expect(patterns).toEqual([]);
		});

		it('should return patterns from memory search', async () => {
			vi.mocked(claudeFlowCLI.execute).mockResolvedValue({
				stdout: JSON.stringify([mockPattern]),
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			const patterns = await service.getTransferablePatterns();

			expect(patterns.length).toBe(1);
			expect(patterns[0].id).toBe('pattern-1');
			expect(patterns[0].name).toBe('API Pattern');
		});

		it('should filter by projectId', async () => {
			const patterns = [
				mockPattern,
				{ ...mockPattern, id: 'pattern-2', projectId: 'other-project' }
			];

			vi.mocked(claudeFlowCLI.execute).mockResolvedValue({
				stdout: JSON.stringify(patterns),
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			const result = await service.getTransferablePatterns({
				projectId: 'project-source'
			});

			expect(result.length).toBe(1);
			expect(result[0].projectId).toBe('project-source');
		});

		it('should filter by minSuccessRate', async () => {
			const patterns = [
				mockPattern,
				{ ...mockPattern, id: 'pattern-2', successRate: 0.5 }
			];

			vi.mocked(claudeFlowCLI.execute).mockResolvedValue({
				stdout: JSON.stringify(patterns),
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			const result = await service.getTransferablePatterns({
				minSuccessRate: 0.7
			});

			expect(result.length).toBe(1);
			expect(result[0].successRate).toBeGreaterThanOrEqual(0.7);
		});

		it('should filter by isPublic', async () => {
			const patterns = [
				mockPattern,
				{ ...mockPattern, id: 'pattern-2', isPublic: false }
			];

			vi.mocked(claudeFlowCLI.execute).mockResolvedValue({
				stdout: JSON.stringify(patterns),
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			const result = await service.getTransferablePatterns({
				isPublic: true
			});

			expect(result.length).toBe(1);
			expect(result[0].isPublic).toBe(true);
		});

		it('should handle CLI errors gracefully', async () => {
			vi.mocked(claudeFlowCLI.execute).mockRejectedValue(new Error('CLI error'));

			const patterns = await service.getTransferablePatterns();

			expect(patterns).toEqual([]);
		});
	});

	describe('parsePatterns', () => {
		it('should parse JSON object pattern', () => {
			const output = JSON.stringify(mockPattern);
			const patterns = service.parsePatterns(output);

			expect(patterns.length).toBe(1);
			expect(patterns[0].id).toBe('pattern-1');
		});

		it('should parse JSON array patterns', () => {
			const output = JSON.stringify([mockPattern, { ...mockPattern, id: 'pattern-2' }]);
			const patterns = service.parsePatterns(output);

			expect(patterns.length).toBe(2);
		});

		it('should handle empty output', () => {
			const patterns = service.parsePatterns('');
			expect(patterns).toEqual([]);
		});

		it('should handle malformed JSON gracefully', () => {
			const patterns = service.parsePatterns('{ invalid json }');
			expect(patterns).toEqual([]);
		});

		it('should normalize patterns with missing fields', () => {
			const output = JSON.stringify({ id: 'minimal' });
			const patterns = service.parsePatterns(output);

			expect(patterns.length).toBe(1);
			expect(patterns[0].name).toBe('minimal');
			expect(patterns[0].keywords).toEqual([]);
			expect(patterns[0].successRate).toBe(0.5);
		});

		it('should parse text-format patterns', () => {
			const output = 'pattern: test-pattern project: test-project';
			const patterns = service.parsePatterns(output);

			expect(patterns.length).toBe(1);
			expect(patterns[0].id).toBe('test-pattern');
			expect(patterns[0].projectId).toBe('test-project');
		});
	});

	describe('calculateCompatibility', () => {
		it('should return high score for compatible pattern', () => {
			const compatibility = service.calculateCompatibility(
				mockPattern,
				'project-target',
				[]
			);

			expect(compatibility.score).toBeGreaterThanOrEqual(70);
			expect(compatibility.conflicts).toEqual([]);
		});

		it('should detect key collisions', () => {
			const existingPatterns = [{ ...mockPattern, projectId: 'project-target' }];

			const compatibility = service.calculateCompatibility(
				mockPattern,
				'project-target',
				existingPatterns
			);

			expect(compatibility.conflicts.length).toBeGreaterThan(0);
			expect(compatibility.conflicts[0].type).toBe('key_collision');
			expect(compatibility.conflicts[0].severity).toBe('high');
		});

		it('should detect namespace collisions', () => {
			const existingPatterns = [{
				...mockPattern,
				id: 'different-id',
				projectId: 'project-target'
			}];

			const compatibility = service.calculateCompatibility(
				mockPattern,
				'project-target',
				existingPatterns
			);

			expect(compatibility.conflicts.some((c) => c.type === 'namespace_collision')).toBe(true);
		});

		it('should warn about missing agent types', () => {
			const existingPatterns = [{
				...mockPattern,
				id: 'other',
				agentConfig: ['coder'],
				projectId: 'project-target'
			}];

			const compatibility = service.calculateCompatibility(
				mockPattern,
				'project-target',
				existingPatterns
			);

			expect(compatibility.warnings.length).toBeGreaterThan(0);
		});

		it('should add recommendations for high success rate patterns', () => {
			const compatibility = service.calculateCompatibility(
				mockPattern,
				'project-target',
				[]
			);

			expect(compatibility.recommendations.some((r) => r.includes('success rate'))).toBe(true);
		});

		it('should reduce score for conflicts', () => {
			const existingPatterns = [{ ...mockPattern, projectId: 'project-target' }];

			const withConflict = service.calculateCompatibility(
				mockPattern,
				'project-target',
				existingPatterns
			);

			const withoutConflict = service.calculateCompatibility(
				mockPattern,
				'project-target',
				[]
			);

			expect(withConflict.score).toBeLessThan(withoutConflict.score);
		});
	});

	describe('getTransferPreview', () => {
		it('should return null when pattern not found', async () => {
			const preview = await service.getTransferPreview('nonexistent', 'project-target');
			expect(preview).toBeNull();
		});

		it('should return preview with compatibility info', async () => {
			vi.mocked(claudeFlowCLI.execute).mockResolvedValue({
				stdout: JSON.stringify(mockPattern),
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			const preview = await service.getTransferPreview('pattern-1', 'project-target');

			expect(preview).not.toBeNull();
			expect(preview?.pattern.id).toBe('pattern-1');
			expect(preview?.compatibility).toBeDefined();
			expect(preview?.compatibility.score).toBeGreaterThanOrEqual(0);
		});

		it('should include estimated integration info', async () => {
			vi.mocked(claudeFlowCLI.execute).mockResolvedValue({
				stdout: JSON.stringify(mockPattern),
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			const preview = await service.getTransferPreview('pattern-1', 'project-target');

			expect(preview?.estimatedIntegration).toBeDefined();
			expect(preview?.estimatedIntegration.affectedFiles).toBeDefined();
			expect(preview?.estimatedIntegration.newDependencies).toBeDefined();
		});
	});

	describe('executeTransfer', () => {
		beforeEach(() => {
			vi.mocked(claudeFlowCLI.execute).mockResolvedValue({
				stdout: JSON.stringify(mockPattern),
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});
		});

		it('should execute transfer successfully', async () => {
			const result = await service.executeTransfer('pattern-1', 'project-target');

			expect(result.success).toBe(true);
			expect(result.transferId).toBeDefined();
			expect(result.targetPatternId).toBeDefined();
		});

		it('should fail when pattern not found', async () => {
			vi.mocked(claudeFlowCLI.execute).mockResolvedValue({
				stdout: '',
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			const result = await service.executeTransfer('nonexistent', 'project-target');

			expect(result.success).toBe(false);
			expect(result.error).toContain('not found');
		});

		it('should block transfer with high-severity conflicts', async () => {
			// First call returns pattern, second returns existing pattern with same ID
			vi.mocked(claudeFlowCLI.execute)
				.mockResolvedValueOnce({
					stdout: JSON.stringify(mockPattern),
					stderr: '',
					exitCode: 0,
					timedOut: false,
					duration: 100
				})
				.mockResolvedValueOnce({
					stdout: JSON.stringify([{ ...mockPattern, projectId: 'project-target' }]),
					stderr: '',
					exitCode: 0,
					timedOut: false,
					duration: 100
				});

			const result = await service.executeTransfer('pattern-1', 'project-target');

			expect(result.success).toBe(false);
			expect(result.error).toContain('conflict');
		});

		it('should store transferred pattern with new ID', async () => {
			await service.executeTransfer('pattern-1', 'project-target');

			expect(vi.mocked(claudeFlowCLI.execute)).toHaveBeenCalledWith(
				'memory',
				expect.arrayContaining([
					'store',
					'--key',
					expect.stringContaining('pattern-1'),
					'--namespace',
					'patterns'
				]),
				undefined
			);
		});

		it('should record transfer history', async () => {
			await service.executeTransfer('pattern-1', 'project-target');

			expect(vi.mocked(claudeFlowCLI.execute)).toHaveBeenCalledWith(
				'memory',
				expect.arrayContaining([
					'store',
					'--namespace',
					'transfers'
				]),
				undefined
			);
		});
	});

	describe('getTransferHistory', () => {
		it('should return empty array when no history', async () => {
			const history = await service.getTransferHistory();
			expect(history).toEqual([]);
		});

		it('should return transfer history entries', async () => {
			vi.mocked(claudeFlowCLI.execute).mockResolvedValue({
				stdout: JSON.stringify([mockHistoryEntry]),
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			const history = await service.getTransferHistory();

			expect(history.length).toBe(1);
			expect(history[0].transferId).toBe('transfer-123');
		});

		it('should filter by projectId', async () => {
			await service.getTransferHistory('project-target');

			expect(vi.mocked(claudeFlowCLI.execute)).toHaveBeenCalledWith(
				'memory',
				expect.arrayContaining([
					'search',
					'--query',
					expect.stringContaining('project-target')
				]),
				undefined
			);
		});
	});

	describe('parseTransferHistory', () => {
		it('should parse JSON history entries', () => {
			const output = JSON.stringify([mockHistoryEntry]);
			const entries = service.parseTransferHistory(output);

			expect(entries.length).toBe(1);
			expect(entries[0].transferId).toBe('transfer-123');
		});

		it('should handle empty output', () => {
			const entries = service.parseTransferHistory('');
			expect(entries).toEqual([]);
		});

		it('should filter out invalid entries', () => {
			const output = JSON.stringify([mockHistoryEntry, { invalid: true }]);
			const entries = service.parseTransferHistory(output);

			expect(entries.length).toBe(1);
		});
	});

	describe('rollbackTransfer', () => {
		it('should rollback a transfer', async () => {
			vi.mocked(claudeFlowCLI.execute).mockResolvedValue({
				stdout: JSON.stringify([mockHistoryEntry]),
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			const result = await service.rollbackTransfer('transfer-123');

			expect(result).toBe(true);
		});

		it('should return false when transfer not found', async () => {
			const result = await service.rollbackTransfer('nonexistent');
			expect(result).toBe(false);
		});

		it('should return false when canRollback is false', async () => {
			vi.mocked(claudeFlowCLI.execute).mockResolvedValue({
				stdout: JSON.stringify([{ ...mockHistoryEntry, canRollback: false }]),
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			const result = await service.rollbackTransfer('transfer-123');

			expect(result).toBe(false);
		});

		it('should delete the transferred pattern', async () => {
			vi.mocked(claudeFlowCLI.execute).mockResolvedValue({
				stdout: JSON.stringify([mockHistoryEntry]),
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			await service.rollbackTransfer('transfer-123');

			expect(vi.mocked(claudeFlowCLI.execute)).toHaveBeenCalledWith(
				'memory',
				expect.arrayContaining(['delete']),
				undefined
			);
		});

		it('should update history entry status', async () => {
			vi.mocked(claudeFlowCLI.execute).mockResolvedValue({
				stdout: JSON.stringify([mockHistoryEntry]),
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			await service.rollbackTransfer('transfer-123');

			// Check that store was called with rolled_back status
			const storeCalls = vi.mocked(claudeFlowCLI.execute).mock.calls.filter(
				(call) => call[1].includes('store') && call[1].includes('transfers')
			);
			expect(storeCalls.length).toBeGreaterThan(0);
		});
	});

	describe('getProjectSharingSettings', () => {
		it('should return default settings when not found', async () => {
			const settings = await service.getProjectSharingSettings('project-1');

			expect(settings.projectId).toBe('project-1');
			expect(settings.defaultVisibility).toBe('private');
			expect(settings.allowIncomingTransfers).toBe(true);
		});

		it('should return stored settings', async () => {
			const storedSettings: ProjectSharingSettings = {
				projectId: 'project-1',
				defaultVisibility: 'public',
				allowIncomingTransfers: false,
				allowedSourceProjects: ['project-2'],
				blockedProjects: ['project-3']
			};

			vi.mocked(claudeFlowCLI.execute).mockResolvedValue({
				stdout: JSON.stringify(storedSettings),
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			const settings = await service.getProjectSharingSettings('project-1');

			expect(settings.defaultVisibility).toBe('public');
			expect(settings.allowIncomingTransfers).toBe(false);
		});
	});

	describe('updateProjectSharingSettings', () => {
		it('should store project sharing settings', async () => {
			const settings: ProjectSharingSettings = {
				projectId: 'project-1',
				defaultVisibility: 'public',
				allowIncomingTransfers: true,
				allowedSourceProjects: [],
				blockedProjects: []
			};

			const result = await service.updateProjectSharingSettings(settings);

			expect(result).toBe(true);
			expect(vi.mocked(claudeFlowCLI.execute)).toHaveBeenCalledWith(
				'memory',
				expect.arrayContaining([
					'store',
					'--key',
					'project-settings-project-1'
				]),
				undefined
			);
		});

		it('should return false on error', async () => {
			vi.mocked(claudeFlowCLI.execute).mockRejectedValue(new Error('Storage failed'));

			const settings: ProjectSharingSettings = {
				projectId: 'project-1',
				defaultVisibility: 'public',
				allowIncomingTransfers: true,
				allowedSourceProjects: [],
				blockedProjects: []
			};

			const result = await service.updateProjectSharingSettings(settings);

			expect(result).toBe(false);
		});
	});

	describe('getPatternSharingSettings', () => {
		it('should return default settings when not found', async () => {
			const settings = await service.getPatternSharingSettings('pattern-1');

			expect(settings.patternId).toBe('pattern-1');
			expect(settings.isPublic).toBe(false);
			expect(settings.allowTransfer).toBe(true);
		});

		it('should return stored settings', async () => {
			const storedSettings: PatternSharingSettings = {
				patternId: 'pattern-1',
				isPublic: true,
				sharedWithProjects: ['project-2'],
				allowTransfer: false
			};

			vi.mocked(claudeFlowCLI.execute).mockResolvedValue({
				stdout: JSON.stringify(storedSettings),
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			const settings = await service.getPatternSharingSettings('pattern-1');

			expect(settings.isPublic).toBe(true);
			expect(settings.allowTransfer).toBe(false);
		});
	});

	describe('updatePatternSharingSettings', () => {
		it('should store pattern sharing settings', async () => {
			const settings: PatternSharingSettings = {
				patternId: 'pattern-1',
				isPublic: true,
				sharedWithProjects: ['project-2'],
				allowTransfer: true
			};

			const result = await service.updatePatternSharingSettings(settings);

			expect(result).toBe(true);
			expect(vi.mocked(claudeFlowCLI.execute)).toHaveBeenCalledWith(
				'memory',
				expect.arrayContaining([
					'store',
					'--key',
					'pattern-settings-pattern-1'
				]),
				undefined
			);
		});
	});

	describe('calculatePerformanceMetrics', () => {
		it('should return performance metrics', async () => {
			vi.mocked(claudeFlowCLI.execute).mockResolvedValue({
				stdout: JSON.stringify(mockHistoryEntry),
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			const metrics = await service.calculatePerformanceMetrics('transfer-123');

			expect(metrics).not.toBeNull();
			expect(metrics?.before).toBeDefined();
			expect(metrics?.after).toBeDefined();
			expect(typeof metrics?.improvement).toBe('number');
		});

		it('should return null when transfer not found', async () => {
			const metrics = await service.calculatePerformanceMetrics('nonexistent');
			expect(metrics).toBeNull();
		});
	});

	describe('singleton instance', () => {
		it('should export a singleton instance', () => {
			expect(transferService).toBeInstanceOf(TransferService);
		});

		it('should have all methods available', () => {
			expect(typeof transferService.getTransferablePatterns).toBe('function');
			expect(typeof transferService.getTransferPreview).toBe('function');
			expect(typeof transferService.executeTransfer).toBe('function');
			expect(typeof transferService.getTransferHistory).toBe('function');
			expect(typeof transferService.rollbackTransfer).toBe('function');
			expect(typeof transferService.getProjectSharingSettings).toBe('function');
			expect(typeof transferService.updateProjectSharingSettings).toBe('function');
		});
	});
});
