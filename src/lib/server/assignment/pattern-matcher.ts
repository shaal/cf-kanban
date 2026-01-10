/**
 * TASK-051: Agent-Task Matching with Patterns
 *
 * Queries Claude Flow memory for relevant patterns and scores them
 * using Jaccard similarity. Applies matched patterns to routing
 * and tracks pattern performance over time.
 */

import { claudeFlowCLI } from '../claude-flow/cli';
import type { AgentType } from '../analysis/ticket-analyzer';

/**
 * A stored pattern from Claude Flow memory
 */
export interface Pattern {
	/** Unique identifier for the pattern */
	id: string;
	/** Keywords associated with this pattern */
	keywords: string[];
	/** Agent configuration that worked for this pattern */
	agentConfig: AgentType[];
	/** Success rate of this pattern (0-1) */
	successRate: number;
	/** Number of times this pattern has been used */
	usageCount: number;
	/** Last time this pattern was used */
	lastUsed: string;
	/** Topology used with this pattern */
	topology?: string;
	/** Ticket type this pattern applies to */
	ticketType?: string;
}

/**
 * Result of a pattern match with similarity score
 */
export interface PatternWithSimilarity extends Pattern {
	/** Jaccard similarity score (0-1) */
	similarity: number;
}

/**
 * Result of pattern matching operation
 */
export interface MatchResult {
	/** All matching patterns sorted by similarity */
	patterns: PatternWithSimilarity[];
	/** Best matching pattern, if any meets threshold */
	bestMatch: Pattern | null;
	/** Human-readable recommendation */
	recommendation: string;
}

/**
 * Options for pattern matching
 */
export interface MatchOptions {
	/** Minimum similarity score to consider (default: 0.6) */
	minSimilarity?: number;
	/** Minimum success rate to consider (default: 0.7) */
	minSuccessRate?: number;
	/** Maximum number of patterns to return */
	limit?: number;
}

/**
 * Pattern performance tracking data
 */
export interface PatternPerformance {
	patternId: string;
	wasSuccessful: boolean;
	completionTime?: number;
	qualityScore?: number;
	timestamp: string;
}

/**
 * PatternMatcher class - finds and applies patterns for agent routing
 */
export class PatternMatcher {
	private readonly namespace = 'patterns';
	private readonly performanceNamespace = 'pattern-performance';

	/**
	 * Find patterns matching the given keywords and ticket type
	 *
	 * @param keywords - Keywords to match against
	 * @param ticketType - Type of ticket to match
	 * @param options - Matching options
	 * @returns Match result with patterns and recommendation
	 */
	async findMatchingPatterns(
		keywords: string[],
		ticketType: string,
		options: MatchOptions = {}
	): Promise<MatchResult> {
		const { minSimilarity = 0.6, minSuccessRate = 0.7, limit = 5 } = options;

		const patterns: PatternWithSimilarity[] = [];

		try {
			// Search for patterns with each keyword
			const uniquePatterns = new Map<string, PatternWithSimilarity>();

			for (const keyword of keywords) {
				const searchQuery = `${keyword} ${ticketType}`;

				const result = await claudeFlowCLI.execute(
					'memory',
					['search', '--query', searchQuery, '--namespace', this.namespace, '--limit', '5'],
					{ timeout: 10000 }
				);

				if (result.exitCode === 0 && result.stdout) {
					const parsed = this.parsePatternResults(result.stdout);

					for (const pattern of parsed) {
						const similarity = this.calculateJaccardSimilarity(keywords, pattern.keywords);
						const existing = uniquePatterns.get(pattern.id);

						// Keep the higher similarity score if pattern already seen
						if (!existing || similarity > existing.similarity) {
							uniquePatterns.set(pattern.id, { ...pattern, similarity });
						}
					}
				}
			}

			// Convert map to array and sort by similarity
			patterns.push(...uniquePatterns.values());
			patterns.sort((a, b) => b.similarity - a.similarity);

			// Filter by thresholds
			const qualifiedPatterns = patterns.filter(
				(p) => p.similarity >= minSimilarity && p.successRate >= minSuccessRate
			);

			// Find best match
			const bestMatch = qualifiedPatterns.length > 0 ? qualifiedPatterns[0] : null;

			return {
				patterns: patterns.slice(0, limit),
				bestMatch,
				recommendation: this.buildRecommendation(bestMatch, patterns.length)
			};
		} catch {
			return {
				patterns: [],
				bestMatch: null,
				recommendation: 'Pattern search unavailable - using default routing'
			};
		}
	}

	/**
	 * Parse pattern results from Claude Flow memory search output
	 */
	parsePatternResults(output: string): Pattern[] {
		const patterns: Pattern[] = [];

		// Try to parse JSON array or objects
		try {
			// Check for JSON array
			const arrayMatch = output.match(/\[[\s\S]*\]/);
			if (arrayMatch) {
				const parsed = JSON.parse(arrayMatch[0]);
				if (Array.isArray(parsed)) {
					return parsed.map((p, i) => this.normalizePattern(p, `pattern-${i}`));
				}
			}

			// Check for individual JSON objects
			const objectMatches = output.matchAll(/\{[\s\S]*?\}/g);
			for (const match of objectMatches) {
				try {
					const parsed = JSON.parse(match[0]);
					patterns.push(this.normalizePattern(parsed, `pattern-${patterns.length}`));
				} catch {
					// Skip malformed JSON
				}
			}

			if (patterns.length > 0) {
				return patterns;
			}
		} catch {
			// JSON parsing failed, try text parsing
		}

		// Fall back to text-based parsing
		const textPatterns = output.matchAll(
			/(?:pattern|id):\s*['"]?(\w+)['"]?.*?keywords:\s*\[(.*?)\].*?agents:\s*\[(.*?)\].*?success(?:Rate)?:\s*([\d.]+)/gi
		);

		for (const match of textPatterns) {
			patterns.push({
				id: match[1],
				keywords: match[2].split(',').map((s) => s.trim().replace(/['"]/g, '')),
				agentConfig: match[3].split(',').map((s) => s.trim().replace(/['"]/g, '')) as AgentType[],
				successRate: parseFloat(match[4]),
				usageCount: 0,
				lastUsed: new Date().toISOString()
			});
		}

		return patterns;
	}

	/**
	 * Normalize a parsed pattern object to the Pattern interface
	 */
	private normalizePattern(obj: Record<string, unknown>, defaultId: string): Pattern {
		return {
			id: (obj.id as string) || defaultId,
			keywords: Array.isArray(obj.keywords) ? (obj.keywords as string[]) : [],
			agentConfig: Array.isArray(obj.agents || obj.agentConfig)
				? ((obj.agents || obj.agentConfig) as AgentType[])
				: [],
			successRate:
				typeof obj.successRate === 'number'
					? obj.successRate
					: typeof obj.success === 'number'
						? obj.success
						: 0.5,
			usageCount: typeof obj.usageCount === 'number' ? obj.usageCount : 0,
			lastUsed: typeof obj.lastUsed === 'string' ? obj.lastUsed : new Date().toISOString(),
			topology: typeof obj.topology === 'string' ? obj.topology : undefined,
			ticketType: typeof obj.ticketType === 'string' ? obj.ticketType : undefined
		};
	}

	/**
	 * Calculate Jaccard similarity between two sets of keywords
	 *
	 * Jaccard Index = |A ∩ B| / |A ∪ B|
	 *
	 * @param keywords1 - First set of keywords
	 * @param keywords2 - Second set of keywords
	 * @returns Similarity score between 0 and 1
	 */
	calculateJaccardSimilarity(keywords1: string[], keywords2: string[]): number {
		if (keywords1.length === 0 && keywords2.length === 0) {
			return 1; // Both empty = identical
		}

		if (keywords1.length === 0 || keywords2.length === 0) {
			return 0; // One empty = no similarity
		}

		// Normalize keywords to lowercase
		const set1 = new Set(keywords1.map((k) => k.toLowerCase()));
		const set2 = new Set(keywords2.map((k) => k.toLowerCase()));

		// Calculate intersection
		const intersection = [...set1].filter((k) => set2.has(k)).length;

		// Calculate union
		const union = new Set([...set1, ...set2]).size;

		return intersection / union;
	}

	/**
	 * Build a human-readable recommendation string
	 */
	private buildRecommendation(bestMatch: Pattern | null, totalFound: number): string {
		if (!bestMatch) {
			if (totalFound > 0) {
				return `Found ${totalFound} patterns but none met quality thresholds - using default routing`;
			}
			return 'No matching patterns found - using default routing';
		}

		const similarityPercent = Math.round(
			(bestMatch as PatternWithSimilarity).similarity * 100
		);
		const successPercent = Math.round(bestMatch.successRate * 100);

		return `Use pattern "${bestMatch.id}" (${similarityPercent}% match, ${successPercent}% success rate)`;
	}

	/**
	 * Track pattern performance after task completion
	 *
	 * @param performance - Performance data to record
	 */
	async trackPerformance(performance: PatternPerformance): Promise<boolean> {
		try {
			const key = `perf-${performance.patternId}-${Date.now()}`;

			const result = await claudeFlowCLI.execute('memory', [
				'store',
				'--key',
				key,
				'--value',
				JSON.stringify(performance),
				'--namespace',
				this.performanceNamespace
			]);

			if (result.exitCode === 0) {
				// Update pattern success rate if we have enough data
				await this.updatePatternSuccessRate(performance.patternId);
			}

			return result.exitCode === 0;
		} catch {
			return false;
		}
	}

	/**
	 * Update pattern success rate based on performance history
	 */
	private async updatePatternSuccessRate(patternId: string): Promise<void> {
		try {
			// Search for performance records for this pattern
			const result = await claudeFlowCLI.execute('memory', [
				'search',
				'--query',
				patternId,
				'--namespace',
				this.performanceNamespace,
				'--limit',
				'20'
			]);

			if (result.exitCode !== 0) return;

			// Parse performance records
			const records = this.parsePerformanceRecords(result.stdout);
			if (records.length < 3) return; // Need at least 3 records

			// Calculate new success rate
			const successCount = records.filter((r) => r.wasSuccessful).length;
			const newSuccessRate = successCount / records.length;

			// Update the pattern with new success rate
			await claudeFlowCLI.execute('memory', [
				'store',
				'--key',
				`${patternId}-updated`,
				'--value',
				JSON.stringify({ successRate: newSuccessRate, sampleSize: records.length }),
				'--namespace',
				this.namespace
			]);
		} catch {
			// Ignore update failures
		}
	}

	/**
	 * Parse performance records from memory search output
	 */
	private parsePerformanceRecords(output: string): PatternPerformance[] {
		const records: PatternPerformance[] = [];

		try {
			const objectMatches = output.matchAll(/\{[\s\S]*?\}/g);
			for (const match of objectMatches) {
				try {
					const parsed = JSON.parse(match[0]) as PatternPerformance;
					if (parsed.patternId && typeof parsed.wasSuccessful === 'boolean') {
						records.push(parsed);
					}
				} catch {
					// Skip malformed records
				}
			}
		} catch {
			// Parsing failed
		}

		return records;
	}

	/**
	 * Store a new pattern in memory
	 *
	 * @param pattern - Pattern to store
	 * @returns Whether storage succeeded
	 */
	async storePattern(pattern: Pattern): Promise<boolean> {
		try {
			const result = await claudeFlowCLI.execute('memory', [
				'store',
				'--key',
				pattern.id,
				'--value',
				JSON.stringify(pattern),
				'--namespace',
				this.namespace
			]);

			return result.exitCode === 0;
		} catch {
			return false;
		}
	}

	/**
	 * Apply a matched pattern to get agent configuration
	 *
	 * @param pattern - Pattern to apply
	 * @returns Agent configuration from the pattern
	 */
	applyPattern(pattern: Pattern): {
		agents: AgentType[];
		topology: string;
	} {
		return {
			agents: pattern.agentConfig,
			topology: pattern.topology || 'mesh'
		};
	}
}

// Singleton instance
export const patternMatcher = new PatternMatcher();
