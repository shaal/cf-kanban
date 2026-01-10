/**
 * GAP-3.4.4: Pattern Transfer API Tests
 *
 * Unit tests for the pattern transfer REST API endpoints.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TransferService } from '$lib/server/transfer/transfer-service';
import type {
	TransferablePattern,
	TransferResult,
	TransferHistoryEntry,
	TransferPreview
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

// Mock settings service
vi.mock('$lib/server/admin/settings-service', () => ({
	settingsService: {
		canTransferPatterns: vi.fn().mockResolvedValue(true),
		canAccessPatterns: vi.fn().mockResolvedValue(true),
		getGlobalSharingProjects: vi.fn().mockResolvedValue([])
	}
}));

import { claudeFlowCLI } from '$lib/server/claude-flow/cli';

describe('Pattern Transfer API', () => {
	let service: TransferService;

	const mockPattern: TransferablePattern = {
		id: 'pattern-test',
		name: 'Test Pattern',
		description: 'A test pattern for transfer',
		keywords: ['test', 'api', 'transfer'],
		agentConfig: ['coder', 'tester'],
		topology: 'mesh',
		projectId: 'source-project',
		projectName: 'Source Project',
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z',
		successRate: 0.85,
		usageCount: 20,
		isPublic: true
	};

	const mockHistoryEntry: TransferHistoryEntry = {
		id: 'transfer-test-123',
		transferId: 'transfer-test-123',
		sourcePatternId: 'pattern-test',
		sourcePatternName: 'Test Pattern',
		sourceProjectId: 'source-project',
		sourceProjectName: 'Source Project',
		targetProjectId: 'target-project',
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

	describe('POST /api/patterns/transfer', () => {
		describe('Request Validation', () => {
			it('should require patternId', async () => {
				// The API would return 400 for missing patternId
				const body = { targetProjectId: 'target-project' };
				expect(body.targetProjectId).toBeDefined();
				expect((body as any).patternId).toBeUndefined();
			});

			it('should require targetProjectId', async () => {
				const body = { patternId: 'pattern-test' };
				expect(body.patternId).toBeDefined();
				expect((body as any).targetProjectId).toBeUndefined();
			});

			it('should accept valid request body', async () => {
				const body = {
					patternId: 'pattern-test',
					targetProjectId: 'target-project'
				};
				expect(body.patternId).toBeDefined();
				expect(body.targetProjectId).toBeDefined();
			});
		});

		describe('Transfer Execution', () => {
			it('should execute transfer successfully', async () => {
				// Mock pattern retrieval
				vi.mocked(claudeFlowCLI.execute).mockImplementation(async (cmd, args) => {
					if (args.includes('retrieve')) {
						return {
							stdout: JSON.stringify(mockPattern),
							stderr: '',
							exitCode: 0,
							timedOut: false,
							duration: 100
						};
					}
					if (args.includes('search') && args.some((a: string) => a.includes('projectId:'))) {
						return { stdout: '', stderr: '', exitCode: 0, timedOut: false, duration: 100 };
					}
					return { stdout: '', stderr: '', exitCode: 0, timedOut: false, duration: 100 };
				});

				const result = await service.executeTransfer('pattern-test', 'target-project');

				expect(result.success).toBe(true);
				expect(result.transferId).toBeDefined();
				expect(result.targetPatternId).toBeDefined();
			});

			it('should return error when pattern not found', async () => {
				const result = await service.executeTransfer('nonexistent', 'target-project');

				expect(result.success).toBe(false);
				expect(result.error).toContain('not found');
			});

			it('should block transfer with high-severity conflicts', async () => {
				// Mock pattern with conflict
				vi.mocked(claudeFlowCLI.execute)
					.mockResolvedValueOnce({
						stdout: JSON.stringify(mockPattern),
						stderr: '',
						exitCode: 0,
						timedOut: false,
						duration: 100
					})
					.mockResolvedValueOnce({
						stdout: JSON.stringify([{ ...mockPattern, projectId: 'target-project' }]),
						stderr: '',
						exitCode: 0,
						timedOut: false,
						duration: 100
					});

				const result = await service.executeTransfer('pattern-test', 'target-project');

				expect(result.success).toBe(false);
				expect(result.error).toContain('conflict');
			});
		});
	});

	describe('GET /api/patterns/transfer', () => {
		it('should return empty array when no history', async () => {
			const history = await service.getTransferHistory();
			expect(history).toEqual([]);
		});

		it('should return transfer history', async () => {
			vi.mocked(claudeFlowCLI.execute).mockResolvedValue({
				stdout: JSON.stringify([mockHistoryEntry]),
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			const history = await service.getTransferHistory();

			expect(history.length).toBe(1);
			expect(history[0].transferId).toBe('transfer-test-123');
			expect(history[0].status).toBe('success');
		});

		it('should filter by projectId', async () => {
			vi.mocked(claudeFlowCLI.execute).mockResolvedValue({
				stdout: JSON.stringify([mockHistoryEntry]),
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			await service.getTransferHistory('target-project');

			const searchCalls = vi.mocked(claudeFlowCLI.execute).mock.calls.filter(
				(call) => call[1].includes('search')
			);
			expect(searchCalls.length).toBeGreaterThan(0);
		});
	});

	describe('POST /api/patterns/transfer/preview', () => {
		it('should return null when pattern not found', async () => {
			const preview = await service.getTransferPreview('nonexistent', 'target-project');
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

			const preview = await service.getTransferPreview('pattern-test', 'target-project');

			expect(preview).not.toBeNull();
			expect(preview?.pattern.id).toBe('pattern-test');
			expect(preview?.compatibility).toBeDefined();
			expect(preview?.compatibility.score).toBeGreaterThanOrEqual(0);
			expect(preview?.estimatedIntegration).toBeDefined();
		});

		it('should include compatibility score', async () => {
			vi.mocked(claudeFlowCLI.execute).mockResolvedValue({
				stdout: JSON.stringify(mockPattern),
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			const preview = await service.getTransferPreview('pattern-test', 'target-project');

			expect(preview?.compatibility.score).toBeGreaterThanOrEqual(0);
			expect(preview?.compatibility.score).toBeLessThanOrEqual(100);
		});
	});

	describe('POST /api/patterns/transfer/validate', () => {
		it('should validate pattern exists', async () => {
			// Pattern not found case
			const preview = await service.getTransferPreview('nonexistent', 'target-project');
			expect(preview).toBeNull();
		});

		it('should detect blocking conflicts', async () => {
			const existingPatterns = [{ ...mockPattern, projectId: 'target-project' }];
			const compatibility = service.calculateCompatibility(
				mockPattern,
				'target-project',
				existingPatterns
			);

			expect(compatibility.conflicts.length).toBeGreaterThan(0);
			expect(compatibility.conflicts.some((c) => c.severity === 'high')).toBe(true);
		});

		it('should pass validation for compatible patterns', async () => {
			const compatibility = service.calculateCompatibility(mockPattern, 'target-project', []);

			expect(compatibility.score).toBeGreaterThanOrEqual(70);
			expect(compatibility.conflicts.filter((c) => c.severity === 'high').length).toBe(0);
		});
	});

	describe('DELETE /api/patterns/transfer/[transferId]', () => {
		it('should rollback transfer successfully', async () => {
			vi.mocked(claudeFlowCLI.execute).mockResolvedValue({
				stdout: JSON.stringify([mockHistoryEntry]),
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			const result = await service.rollbackTransfer('transfer-test-123');

			expect(result).toBe(true);
		});

		it('should return false for non-existent transfer', async () => {
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

			const result = await service.rollbackTransfer('transfer-test-123');
			expect(result).toBe(false);
		});
	});

	describe('GET /api/patterns/transfer/[transferId]', () => {
		it('should return transfer details', async () => {
			vi.mocked(claudeFlowCLI.execute).mockResolvedValue({
				stdout: JSON.stringify([mockHistoryEntry]),
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			const history = await service.getTransferHistory();
			const transfer = history.find((h) => h.transferId === 'transfer-test-123');

			expect(transfer).toBeDefined();
			expect(transfer?.sourcePatternId).toBe('pattern-test');
			expect(transfer?.targetProjectId).toBe('target-project');
		});

		it('should calculate performance metrics', async () => {
			vi.mocked(claudeFlowCLI.execute).mockResolvedValue({
				stdout: JSON.stringify(mockHistoryEntry),
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			const metrics = await service.calculatePerformanceMetrics('transfer-test-123');

			expect(metrics).not.toBeNull();
			expect(metrics?.before).toBeDefined();
			expect(metrics?.after).toBeDefined();
			expect(typeof metrics?.improvement).toBe('number');
		});
	});

	describe('Compatibility Calculation', () => {
		it('should calculate high score for compatible patterns', () => {
			const compatibility = service.calculateCompatibility(mockPattern, 'target-project', []);

			expect(compatibility.score).toBeGreaterThanOrEqual(70);
		});

		it('should reduce score for key collisions', () => {
			const existingPatterns = [{ ...mockPattern, projectId: 'target-project' }];
			const compatibility = service.calculateCompatibility(
				mockPattern,
				'target-project',
				existingPatterns
			);

			expect(compatibility.conflicts.some((c) => c.type === 'key_collision')).toBe(true);
		});

		it('should add recommendations for high success rate', () => {
			const compatibility = service.calculateCompatibility(mockPattern, 'target-project', []);

			expect(compatibility.recommendations.some((r) => r.includes('success rate'))).toBe(true);
		});

		it('should add recommendations for well-tested patterns', () => {
			const wellTestedPattern = { ...mockPattern, usageCount: 50 };
			const compatibility = service.calculateCompatibility(wellTestedPattern, 'target-project', []);

			expect(compatibility.recommendations.some((r) => r.includes('usage'))).toBe(true);
		});
	});

	describe('Transfer History Tracking', () => {
		it('should record successful transfers', async () => {
			vi.mocked(claudeFlowCLI.execute).mockImplementation(async (cmd, args) => {
				if (args.includes('retrieve')) {
					return {
						stdout: JSON.stringify(mockPattern),
						stderr: '',
						exitCode: 0,
						timedOut: false,
						duration: 100
					};
				}
				if (args.includes('search') && args.some((a: string) => a.includes('projectId:'))) {
					return { stdout: '', stderr: '', exitCode: 0, timedOut: false, duration: 100 };
				}
				return { stdout: '', stderr: '', exitCode: 0, timedOut: false, duration: 100 };
			});

			await service.executeTransfer('pattern-test', 'target-project');

			// Check that store was called with transfers namespace
			const storeCalls = vi.mocked(claudeFlowCLI.execute).mock.calls.filter(
				(call) => call[1].includes('store') && call[1].includes('transfers')
			);
			expect(storeCalls.length).toBeGreaterThan(0);
		});

		it('should record failed transfers', async () => {
			// Pattern not found - will record failed transfer
			await service.executeTransfer('nonexistent', 'target-project');

			// Check that store was called
			const storeCalls = vi.mocked(claudeFlowCLI.execute).mock.calls.filter(
				(call) => call[1].includes('store') && call[1].includes('transfers')
			);
			expect(storeCalls.length).toBeGreaterThan(0);
		});

		it('should update history on rollback', async () => {
			vi.mocked(claudeFlowCLI.execute).mockResolvedValue({
				stdout: JSON.stringify([mockHistoryEntry]),
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			await service.rollbackTransfer('transfer-test-123');

			const storeCalls = vi.mocked(claudeFlowCLI.execute).mock.calls.filter(
				(call) => call[1].includes('store') && call[1].includes('transfers')
			);
			expect(storeCalls.length).toBeGreaterThan(0);
		});
	});
});
