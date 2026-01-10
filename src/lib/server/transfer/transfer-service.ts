/**
 * TASK-084/085/086/087: Transfer Service
 *
 * Service for managing cross-project pattern transfers.
 */

import { claudeFlowCLI } from '$lib/server/claude-flow/cli';
import type {
	TransferablePattern,
	TransferCompatibility,
	TransferConflict,
	TransferPreview,
	TransferResult,
	TransferHistoryEntry,
	TransferPerformanceMetrics,
	ProjectSharingSettings,
	PatternSharingSettings,
	TransferFilterOptions
} from '$lib/types/transfer';
import { settingsService } from '$lib/server/admin/settings-service';

/**
 * TransferService handles cross-project pattern transfers
 */
export class TransferService {
	private namespace = 'transfers';
	private patternsNamespace = 'patterns';
	private settingsNamespace = 'transfer-settings';

	/**
	 * Get all transferable patterns
	 */
	async getTransferablePatterns(options: TransferFilterOptions = {}): Promise<TransferablePattern[]> {
		try {
			const result = await claudeFlowCLI.execute('memory', [
				'search',
				'--query',
				options.keywords?.join(' ') || 'pattern',
				'--namespace',
				this.patternsNamespace,
				'--limit',
				String(options.limit || 50)
			]);

			if (result.exitCode !== 0 || !result.stdout) {
				return [];
			}

			const patterns = this.parsePatterns(result.stdout);
			return this.filterPatterns(patterns, options);
		} catch (error) {
			console.error('Failed to get transferable patterns:', error);
			return [];
		}
	}

	/**
	 * Parse pattern results from CLI output
	 */
	parsePatterns(output: string): TransferablePattern[] {
		if (!output.trim()) {
			return [];
		}

		try {
			const parsed = JSON.parse(output);
			const patterns = Array.isArray(parsed) ? parsed : [parsed];

			return patterns.map((p: any) => this.normalizePattern(p)).filter(Boolean);
		} catch {
			// Try parsing as text format
			return this.parseTextPatterns(output);
		}
	}

	/**
	 * Parse text-format patterns
	 */
	private parseTextPatterns(output: string): TransferablePattern[] {
		const patterns: TransferablePattern[] = [];
		const lines = output.split('\n');

		for (const line of lines) {
			const match = line.match(/pattern:\s*(\S+)\s+project:\s*(\S+)/);
			if (match) {
				patterns.push({
					id: match[1],
					name: match[1],
					description: '',
					keywords: [],
					agentConfig: [],
					projectId: match[2],
					projectName: match[2],
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					successRate: 0.5,
					usageCount: 0,
					isPublic: true
				});
			}
		}

		return patterns;
	}

	/**
	 * Normalize a pattern object
	 */
	private normalizePattern(p: any): TransferablePattern | null {
		if (!p || typeof p !== 'object' || !p.id) {
			return null;
		}

		return {
			id: p.id || '',
			name: p.name || p.id || '',
			description: p.description || '',
			keywords: Array.isArray(p.keywords) ? p.keywords : [],
			agentConfig: Array.isArray(p.agentConfig) ? p.agentConfig : [],
			topology: p.topology,
			projectId: p.projectId || '',
			projectName: p.projectName || '',
			createdAt: p.createdAt || new Date().toISOString(),
			updatedAt: p.updatedAt || new Date().toISOString(),
			successRate: typeof p.successRate === 'number' ? p.successRate : 0.5,
			usageCount: typeof p.usageCount === 'number' ? p.usageCount : 0,
			isPublic: p.isPublic !== false
		};
	}

	/**
	 * Filter patterns based on options
	 */
	private filterPatterns(
		patterns: TransferablePattern[],
		options: TransferFilterOptions
	): TransferablePattern[] {
		return patterns.filter((p) => {
			if (options.projectId && p.projectId !== options.projectId) {
				return false;
			}
			if (options.minSuccessRate && p.successRate < options.minSuccessRate) {
				return false;
			}
			if (options.isPublic !== undefined && p.isPublic !== options.isPublic) {
				return false;
			}
			return true;
		});
	}

	/**
	 * Calculate transfer compatibility
	 */
	calculateCompatibility(
		pattern: TransferablePattern,
		targetProjectId: string,
		existingPatterns: TransferablePattern[] = []
	): TransferCompatibility {
		const conflicts: TransferConflict[] = [];
		const warnings: string[] = [];
		const recommendations: string[] = [];

		// Check for key collisions
		const keyCollisions = existingPatterns.filter((p) => p.id === pattern.id);
		if (keyCollisions.length > 0) {
			conflicts.push({
				type: 'key_collision',
				severity: 'high',
				description: `Pattern with ID "${pattern.id}" already exists in target project`,
				resolution: 'Rename the pattern or merge with existing'
			});
		}

		// Check for namespace collisions (same name, different id)
		const namespaceCollisions = existingPatterns.filter(
			(p) => p.name === pattern.name && p.id !== pattern.id
		);
		if (namespaceCollisions.length > 0) {
			conflicts.push({
				type: 'namespace_collision',
				severity: 'medium',
				description: `Pattern with name "${pattern.name}" already exists with different ID`,
				resolution: 'Consider renaming to avoid confusion'
			});
		}

		// Check agent compatibility
		const targetAgentTypes = new Set(existingPatterns.flatMap((p) => p.agentConfig));
		const missingAgents = pattern.agentConfig.filter((a) => !targetAgentTypes.has(a));
		if (missingAgents.length > 0) {
			warnings.push(`Pattern uses agents not commonly used in target project: ${missingAgents.join(', ')}`);
		}

		// Generate recommendations
		if (pattern.successRate > 0.8) {
			recommendations.push('High success rate pattern - recommended for transfer');
		}
		if (pattern.usageCount > 10) {
			recommendations.push('Well-tested pattern with significant usage');
		}

		// Calculate overall compatibility score (mock algorithm: random 70-100%)
		const baseScore = 70;
		const conflictPenalty = conflicts.reduce((sum, c) => {
			switch (c.severity) {
				case 'high': return sum + 20;
				case 'medium': return sum + 10;
				case 'low': return sum + 5;
				default: return sum;
			}
		}, 0);
		const warningPenalty = warnings.length * 3;
		const successRateBonus = pattern.successRate * 15;

		const score = Math.max(0, Math.min(100, baseScore - conflictPenalty - warningPenalty + successRateBonus));

		return {
			score: Math.round(score),
			conflicts,
			warnings,
			recommendations
		};
	}

	/**
	 * Get transfer preview
	 */
	async getTransferPreview(
		patternId: string,
		targetProjectId: string
	): Promise<TransferPreview | null> {
		try {
			// Get the pattern
			const result = await claudeFlowCLI.execute('memory', [
				'retrieve',
				'--key',
				patternId,
				'--namespace',
				this.patternsNamespace
			]);

			if (result.exitCode !== 0 || !result.stdout) {
				return null;
			}

			const patterns = this.parsePatterns(result.stdout);
			if (patterns.length === 0) {
				return null;
			}

			const pattern = patterns[0];

			// Get existing patterns in target project
			const existingResult = await claudeFlowCLI.execute('memory', [
				'search',
				'--query',
				`projectId:${targetProjectId}`,
				'--namespace',
				this.patternsNamespace
			]);

			const existingPatterns = existingResult.stdout
				? this.parsePatterns(existingResult.stdout)
				: [];

			// Calculate compatibility
			const compatibility = this.calculateCompatibility(pattern, targetProjectId, existingPatterns);

			return {
				pattern,
				compatibility,
				estimatedIntegration: {
					affectedFiles: ['src/lib/patterns/' + pattern.id + '.ts'],
					newDependencies: pattern.agentConfig.filter(
						(a) => !existingPatterns.some((p) => p.agentConfig.includes(a))
					),
					configChanges: compatibility.conflicts.length > 0
						? ['Update pattern configuration to resolve conflicts']
						: []
				}
			};
		} catch (error) {
			console.error('Failed to get transfer preview:', error);
			return null;
		}
	}

	/**
	 * GAP-3.1.3: Get transferable patterns respecting privacy settings
	 * Only returns patterns from projects that allow transfer
	 */
	async getTransferablePatternsWithPrivacy(
		requestingProjectId: string,
		options: TransferFilterOptions = {}
	): Promise<TransferablePattern[]> {
		try {
			// Get all patterns first
			const allPatterns = await this.getTransferablePatterns(options);

			// Filter based on privacy settings
			const accessiblePatterns: TransferablePattern[] = [];

			for (const pattern of allPatterns) {
				// If pattern is from the requesting project, include it
				if (pattern.projectId === requestingProjectId) {
					accessiblePatterns.push(pattern);
					continue;
				}

				// Check if source project allows transfers
				const allowsTransfer = await settingsService.canTransferPatterns(pattern.projectId);
				if (!allowsTransfer) {
					continue;
				}

				// Check if source project shares with requesting project
				const canAccess = await settingsService.canAccessPatterns(
					pattern.projectId,
					requestingProjectId
				);

				if (canAccess) {
					accessiblePatterns.push(pattern);
				}
			}

			return accessiblePatterns;
		} catch (error) {
			console.error('Failed to get transferable patterns with privacy:', error);
			return [];
		}
	}

	/**
	 * GAP-3.1.3: Check if transfer is allowed between projects
	 */
	async canTransfer(
		sourceProjectId: string,
		targetProjectId: string
	): Promise<{ allowed: boolean; reason?: string }> {
		try {
			// Check if source allows transfers
			const sourceAllowsTransfer = await settingsService.canTransferPatterns(sourceProjectId);
			if (!sourceAllowsTransfer) {
				return {
					allowed: false,
					reason: 'Source project does not allow pattern transfers'
				};
			}

			// Check if target allows incoming transfers
			const targetAllowsTransfer = await settingsService.canTransferPatterns(targetProjectId);
			if (!targetAllowsTransfer) {
				return {
					allowed: false,
					reason: 'Target project does not allow incoming pattern transfers'
				};
			}

			// Check if source shares with target
			const canAccess = await settingsService.canAccessPatterns(sourceProjectId, targetProjectId);
			if (!canAccess) {
				return {
					allowed: false,
					reason: 'Source project does not share patterns with target project'
				};
			}

			return { allowed: true };
		} catch (error) {
			console.error('Failed to check transfer permission:', error);
			return {
				allowed: false,
				reason: 'Failed to verify transfer permissions'
			};
		}
	}

	/**
	 * Execute pattern transfer
	 * GAP-3.1.3: Now respects privacy settings before allowing transfer
	 */
	async executeTransfer(
		patternId: string,
		targetProjectId: string
	): Promise<TransferResult> {
		const transferId = `transfer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		const timestamp = new Date().toISOString();

		try {
			// Get the source pattern
			const preview = await this.getTransferPreview(patternId, targetProjectId);
			if (!preview) {
				return {
					success: false,
					transferId,
					sourcePattern: {} as TransferablePattern,
					timestamp,
					error: 'Pattern not found or transfer preview failed'
				};
			}

			// GAP-3.1.3: Check privacy settings before transfer
			const transferCheck = await this.canTransfer(preview.pattern.projectId, targetProjectId);
			if (!transferCheck.allowed) {
				return {
					success: false,
					transferId,
					sourcePattern: preview.pattern,
					timestamp,
					error: transferCheck.reason || 'Transfer not allowed due to privacy settings'
				};
			}

			// Check for high-severity conflicts
			const highConflicts = preview.compatibility.conflicts.filter((c) => c.severity === 'high');
			if (highConflicts.length > 0) {
				return {
					success: false,
					transferId,
					sourcePattern: preview.pattern,
					timestamp,
					error: `Transfer blocked by ${highConflicts.length} high-severity conflict(s)`
				};
			}

			// Create new pattern in target project
			const newPatternId = `${patternId}-${targetProjectId.slice(0, 8)}`;
			const newPattern = {
				...preview.pattern,
				id: newPatternId,
				projectId: targetProjectId,
				createdAt: timestamp,
				updatedAt: timestamp,
				usageCount: 0
			};

			await claudeFlowCLI.execute('memory', [
				'store',
				'--key',
				newPatternId,
				'--value',
				JSON.stringify(newPattern),
				'--namespace',
				this.patternsNamespace
			]);

			// Record transfer history
			const historyEntry: TransferHistoryEntry = {
				id: transferId,
				transferId,
				sourcePatternId: patternId,
				sourcePatternName: preview.pattern.name,
				sourceProjectId: preview.pattern.projectId,
				sourceProjectName: preview.pattern.projectName,
				targetProjectId,
				targetProjectName: targetProjectId,
				status: 'success',
				timestamp,
				canRollback: true
			};

			await this.recordTransferHistory(historyEntry);

			return {
				success: true,
				transferId,
				sourcePattern: preview.pattern,
				targetPatternId: newPatternId,
				timestamp
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';

			// Record failed transfer
			await this.recordTransferHistory({
				id: transferId,
				transferId,
				sourcePatternId: patternId,
				sourcePatternName: patternId,
				sourceProjectId: '',
				sourceProjectName: '',
				targetProjectId,
				targetProjectName: targetProjectId,
				status: 'failed',
				error: errorMessage,
				timestamp,
				canRollback: false
			});

			return {
				success: false,
				transferId,
				sourcePattern: {} as TransferablePattern,
				timestamp,
				error: errorMessage
			};
		}
	}

	/**
	 * Record transfer history
	 */
	async recordTransferHistory(entry: TransferHistoryEntry): Promise<void> {
		try {
			await claudeFlowCLI.execute('memory', [
				'store',
				'--key',
				entry.id,
				'--value',
				JSON.stringify(entry),
				'--namespace',
				this.namespace
			]);
		} catch (error) {
			console.error('Failed to record transfer history:', error);
		}
	}

	/**
	 * Get transfer history
	 */
	async getTransferHistory(projectId?: string): Promise<TransferHistoryEntry[]> {
		try {
			const result = await claudeFlowCLI.execute('memory', [
				'search',
				'--query',
				projectId ? `projectId:${projectId}` : 'transfer',
				'--namespace',
				this.namespace
			]);

			if (result.exitCode !== 0 || !result.stdout) {
				return [];
			}

			return this.parseTransferHistory(result.stdout);
		} catch (error) {
			console.error('Failed to get transfer history:', error);
			return [];
		}
	}

	/**
	 * Parse transfer history from CLI output
	 */
	parseTransferHistory(output: string): TransferHistoryEntry[] {
		if (!output.trim()) {
			return [];
		}

		try {
			const parsed = JSON.parse(output);
			const entries = Array.isArray(parsed) ? parsed : [parsed];

			return entries.filter((e: any) => e && e.transferId);
		} catch {
			return [];
		}
	}

	/**
	 * Rollback a transfer
	 */
	async rollbackTransfer(transferId: string): Promise<boolean> {
		try {
			// Get transfer entry
			const result = await claudeFlowCLI.execute('memory', [
				'retrieve',
				'--key',
				transferId,
				'--namespace',
				this.namespace
			]);

			if (result.exitCode !== 0 || !result.stdout) {
				return false;
			}

			const entries = this.parseTransferHistory(result.stdout);
			if (entries.length === 0 || !entries[0].canRollback) {
				return false;
			}

			const entry = entries[0];

			// Delete the transferred pattern
			const targetPatternId = `${entry.sourcePatternId}-${entry.targetProjectId.slice(0, 8)}`;
			await claudeFlowCLI.execute('memory', [
				'delete',
				'--key',
				targetPatternId,
				'--namespace',
				this.patternsNamespace
			]);

			// Update history entry
			entry.status = 'rolled_back';
			entry.canRollback = false;
			await this.recordTransferHistory(entry);

			return true;
		} catch (error) {
			console.error('Failed to rollback transfer:', error);
			return false;
		}
	}

	/**
	 * Get project sharing settings
	 */
	async getProjectSharingSettings(projectId: string): Promise<ProjectSharingSettings> {
		try {
			const result = await claudeFlowCLI.execute('memory', [
				'retrieve',
				'--key',
				`project-settings-${projectId}`,
				'--namespace',
				this.settingsNamespace
			]);

			if (result.exitCode === 0 && result.stdout) {
				const parsed = JSON.parse(result.stdout);
				return parsed as ProjectSharingSettings;
			}
		} catch {
			// Return defaults
		}

		return {
			projectId,
			defaultVisibility: 'private',
			allowIncomingTransfers: true,
			allowedSourceProjects: [],
			blockedProjects: []
		};
	}

	/**
	 * Update project sharing settings
	 */
	async updateProjectSharingSettings(settings: ProjectSharingSettings): Promise<boolean> {
		try {
			await claudeFlowCLI.execute('memory', [
				'store',
				'--key',
				`project-settings-${settings.projectId}`,
				'--value',
				JSON.stringify(settings),
				'--namespace',
				this.settingsNamespace
			]);
			return true;
		} catch (error) {
			console.error('Failed to update project sharing settings:', error);
			return false;
		}
	}

	/**
	 * Get pattern sharing settings
	 */
	async getPatternSharingSettings(patternId: string): Promise<PatternSharingSettings> {
		try {
			const result = await claudeFlowCLI.execute('memory', [
				'retrieve',
				'--key',
				`pattern-settings-${patternId}`,
				'--namespace',
				this.settingsNamespace
			]);

			if (result.exitCode === 0 && result.stdout) {
				const parsed = JSON.parse(result.stdout);
				return parsed as PatternSharingSettings;
			}
		} catch {
			// Return defaults
		}

		return {
			patternId,
			isPublic: false,
			sharedWithProjects: [],
			allowTransfer: true
		};
	}

	/**
	 * Update pattern sharing settings
	 */
	async updatePatternSharingSettings(settings: PatternSharingSettings): Promise<boolean> {
		try {
			await claudeFlowCLI.execute('memory', [
				'store',
				'--key',
				`pattern-settings-${settings.patternId}`,
				'--value',
				JSON.stringify(settings),
				'--namespace',
				this.settingsNamespace
			]);
			return true;
		} catch (error) {
			console.error('Failed to update pattern sharing settings:', error);
			return false;
		}
	}

	/**
	 * Calculate performance metrics after transfer
	 */
	async calculatePerformanceMetrics(
		transferId: string
	): Promise<TransferPerformanceMetrics | null> {
		try {
			const result = await claudeFlowCLI.execute('memory', [
				'retrieve',
				'--key',
				transferId,
				'--namespace',
				this.namespace
			]);

			if (result.exitCode !== 0 || !result.stdout) {
				return null;
			}

			// Mock performance data - in real implementation would track actual usage
			const before = {
				successRate: 0.75,
				avgCompletionTime: 3600,
				usageCount: 10
			};

			const after = {
				successRate: 0.82,
				avgCompletionTime: 3200,
				usageCount: 15
			};

			const improvement = ((after.successRate - before.successRate) / before.successRate) * 100;

			return { before, after, improvement };
		} catch (error) {
			console.error('Failed to calculate performance metrics:', error);
			return null;
		}
	}
}

// Export singleton instance
export const transferService = new TransferService();
