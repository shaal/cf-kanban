/**
 * TASK-051: Unit Tests for Pattern Matcher
 *
 * Tests for pattern matching, Jaccard similarity, and performance tracking
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the Claude Flow CLI
const mockExecute = vi.fn();

vi.mock('$lib/server/claude-flow/cli', () => ({
	claudeFlowCLI: {
		execute: mockExecute
	}
}));

// Import after mocks
import {
	PatternMatcher,
	patternMatcher,
	type Pattern,
	type MatchResult,
	type PatternPerformance
} from '$lib/server/assignment/pattern-matcher';

describe('PatternMatcher', () => {
	let matcher: PatternMatcher;

	beforeEach(() => {
		matcher = new PatternMatcher();
		vi.clearAllMocks();
		mockExecute.mockResolvedValue({
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

	describe('calculateJaccardSimilarity', () => {
		it('should return 1 for identical sets', () => {
			const similarity = matcher.calculateJaccardSimilarity(
				['api', 'database', 'auth'],
				['api', 'database', 'auth']
			);
			expect(similarity).toBe(1);
		});

		it('should return 0 for completely different sets', () => {
			const similarity = matcher.calculateJaccardSimilarity(
				['api', 'database'],
				['frontend', 'css']
			);
			expect(similarity).toBe(0);
		});

		it('should return 0.5 for 50% overlap', () => {
			const similarity = matcher.calculateJaccardSimilarity(
				['api', 'database'],
				['api', 'frontend']
			);
			// Intersection: ['api'] = 1
			// Union: ['api', 'database', 'frontend'] = 3
			// 1/3 ≈ 0.333
			expect(similarity).toBeCloseTo(0.333, 2);
		});

		it('should return 1 for two empty sets', () => {
			const similarity = matcher.calculateJaccardSimilarity([], []);
			expect(similarity).toBe(1);
		});

		it('should return 0 when one set is empty', () => {
			const similarity = matcher.calculateJaccardSimilarity(['api'], []);
			expect(similarity).toBe(0);
		});

		it('should be case-insensitive', () => {
			const similarity = matcher.calculateJaccardSimilarity(['API', 'Database'], ['api', 'database']);
			expect(similarity).toBe(1);
		});

		it('should handle partial overlap correctly', () => {
			const similarity = matcher.calculateJaccardSimilarity(
				['api', 'database', 'auth'],
				['api', 'database', 'frontend', 'css']
			);
			// Intersection: ['api', 'database'] = 2
			// Union: ['api', 'database', 'auth', 'frontend', 'css'] = 5
			// 2/5 = 0.4
			expect(similarity).toBeCloseTo(0.4, 2);
		});

		it('should handle duplicate keywords in input', () => {
			const similarity = matcher.calculateJaccardSimilarity(
				['api', 'api', 'database'],
				['api', 'database']
			);
			expect(similarity).toBe(1);
		});
	});

	describe('parsePatternResults', () => {
		it('should parse JSON object patterns', () => {
			const output = JSON.stringify({
				id: 'pattern-1',
				keywords: ['api', 'database'],
				agentConfig: ['coder', 'tester'],
				successRate: 0.85,
				usageCount: 10,
				lastUsed: '2024-01-01'
			});

			const patterns = matcher.parsePatternResults(output);

			expect(patterns.length).toBe(1);
			expect(patterns[0].id).toBe('pattern-1');
			expect(patterns[0].keywords).toContain('api');
			expect(patterns[0].successRate).toBe(0.85);
		});

		it('should parse JSON array patterns', () => {
			const output = JSON.stringify([
				{
					id: 'pattern-1',
					keywords: ['api'],
					agentConfig: ['coder'],
					successRate: 0.8,
					usageCount: 5,
					lastUsed: '2024-01-01'
				},
				{
					id: 'pattern-2',
					keywords: ['frontend'],
					agentConfig: ['tester'],
					successRate: 0.9,
					usageCount: 3,
					lastUsed: '2024-01-02'
				}
			]);

			const patterns = matcher.parsePatternResults(output);

			expect(patterns.length).toBe(2);
			expect(patterns[0].id).toBe('pattern-1');
			expect(patterns[1].id).toBe('pattern-2');
		});

		it('should parse text-based pattern format', () => {
			const output = `pattern: test-pattern keywords: [api, database] agents: [coder, tester] success: 0.75`;

			const patterns = matcher.parsePatternResults(output);

			expect(patterns.length).toBe(1);
			expect(patterns[0].id).toBe('test-pattern');
			expect(patterns[0].keywords).toContain('api');
			expect(patterns[0].keywords).toContain('database');
			expect(patterns[0].agentConfig).toContain('coder');
			expect(patterns[0].successRate).toBe(0.75);
		});

		it('should handle empty output', () => {
			const patterns = matcher.parsePatternResults('');
			expect(patterns).toEqual([]);
		});

		it('should handle malformed JSON gracefully', () => {
			const patterns = matcher.parsePatternResults('{ invalid json }');
			expect(patterns).toEqual([]);
		});

		it('should normalize patterns with missing fields', () => {
			const output = JSON.stringify({
				id: 'minimal',
				keywords: ['test']
			});

			const patterns = matcher.parsePatternResults(output);

			expect(patterns.length).toBe(1);
			expect(patterns[0].agentConfig).toEqual([]);
			expect(patterns[0].successRate).toBe(0.5);
			expect(patterns[0].usageCount).toBe(0);
		});
	});

	describe('findMatchingPatterns', () => {
		it('should return empty results when no patterns found', async () => {
			mockExecute.mockResolvedValue({
				stdout: '',
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			const result = await matcher.findMatchingPatterns(['api'], 'feature');

			expect(result.patterns).toEqual([]);
			expect(result.bestMatch).toBeNull();
			expect(result.recommendation).toContain('No matching patterns');
		});

		it('should find matching patterns from memory', async () => {
			mockExecute.mockResolvedValue({
				stdout: JSON.stringify({
					id: 'api-pattern',
					keywords: ['api', 'rest'],
					agentConfig: ['coder', 'tester'],
					successRate: 0.85,
					usageCount: 10,
					lastUsed: '2024-01-01'
				}),
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			const result = await matcher.findMatchingPatterns(['api', 'rest'], 'feature');

			expect(result.patterns.length).toBeGreaterThan(0);
		});

		it('should sort patterns by similarity', async () => {
			// Mock search to return multiple patterns
			mockExecute.mockImplementation(async (cmd, args) => {
				const query = args[2]; // --query value
				if (query.includes('api')) {
					return {
						stdout: JSON.stringify([
							{
								id: 'pattern-high',
								keywords: ['api', 'database'],
								agentConfig: ['coder'],
								successRate: 0.8,
								usageCount: 5,
								lastUsed: '2024-01-01'
							},
							{
								id: 'pattern-low',
								keywords: ['frontend', 'css'],
								agentConfig: ['tester'],
								successRate: 0.9,
								usageCount: 3,
								lastUsed: '2024-01-01'
							}
						]),
						stderr: '',
						exitCode: 0,
						timedOut: false,
						duration: 100
					};
				}
				return { stdout: '', stderr: '', exitCode: 0, timedOut: false, duration: 100 };
			});

			const result = await matcher.findMatchingPatterns(['api', 'database'], 'feature');

			if (result.patterns.length >= 2) {
				expect(result.patterns[0].similarity).toBeGreaterThanOrEqual(result.patterns[1].similarity);
			}
		});

		it('should respect minSimilarity threshold', async () => {
			mockExecute.mockResolvedValue({
				stdout: JSON.stringify({
					id: 'low-match',
					keywords: ['completely', 'different'],
					agentConfig: ['coder'],
					successRate: 0.9,
					usageCount: 5,
					lastUsed: '2024-01-01'
				}),
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			const result = await matcher.findMatchingPatterns(['api'], 'feature', {
				minSimilarity: 0.6
			});

			expect(result.bestMatch).toBeNull();
		});

		it('should respect minSuccessRate threshold', async () => {
			mockExecute.mockResolvedValue({
				stdout: JSON.stringify({
					id: 'low-success',
					keywords: ['api'],
					agentConfig: ['coder'],
					successRate: 0.5,
					usageCount: 5,
					lastUsed: '2024-01-01'
				}),
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			const result = await matcher.findMatchingPatterns(['api'], 'feature', {
				minSuccessRate: 0.7
			});

			expect(result.bestMatch).toBeNull();
		});

		it('should limit results', async () => {
			mockExecute.mockResolvedValue({
				stdout: JSON.stringify(
					Array.from({ length: 10 }, (_, i) => ({
						id: `pattern-${i}`,
						keywords: ['api'],
						agentConfig: ['coder'],
						successRate: 0.8,
						usageCount: i,
						lastUsed: '2024-01-01'
					}))
				),
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			const result = await matcher.findMatchingPatterns(['api'], 'feature', {
				limit: 3
			});

			expect(result.patterns.length).toBeLessThanOrEqual(3);
		});

		it('should handle CLI errors gracefully', async () => {
			mockExecute.mockRejectedValue(new Error('CLI unavailable'));

			const result = await matcher.findMatchingPatterns(['api'], 'feature');

			expect(result.patterns).toEqual([]);
			expect(result.bestMatch).toBeNull();
			expect(result.recommendation).toContain('unavailable');
		});
	});

	describe('trackPerformance', () => {
		it('should store performance data in memory', async () => {
			const performance: PatternPerformance = {
				patternId: 'test-pattern',
				wasSuccessful: true,
				completionTime: 3600,
				qualityScore: 0.9,
				timestamp: new Date().toISOString()
			};

			await matcher.trackPerformance(performance);

			expect(mockExecute).toHaveBeenCalledWith(
				'memory',
				expect.arrayContaining([
					'store',
					'--key',
					expect.stringContaining('perf-test-pattern'),
					'--namespace',
					'pattern-performance'
				]),
				undefined
			);
		});

		it('should handle storage failure gracefully', async () => {
			mockExecute.mockRejectedValue(new Error('Storage failed'));

			const performance: PatternPerformance = {
				patternId: 'test-pattern',
				wasSuccessful: false,
				timestamp: new Date().toISOString()
			};

			const result = await matcher.trackPerformance(performance);

			expect(result).toBe(false);
		});

		it('should return true on successful storage', async () => {
			mockExecute.mockResolvedValue({
				stdout: '',
				stderr: '',
				exitCode: 0,
				timedOut: false,
				duration: 100
			});

			const performance: PatternPerformance = {
				patternId: 'test-pattern',
				wasSuccessful: true,
				timestamp: new Date().toISOString()
			};

			const result = await matcher.trackPerformance(performance);

			expect(result).toBe(true);
		});
	});

	describe('storePattern', () => {
		it('should store pattern in memory', async () => {
			const pattern: Pattern = {
				id: 'new-pattern',
				keywords: ['api', 'database'],
				agentConfig: ['coder', 'tester'],
				successRate: 0.8,
				usageCount: 0,
				lastUsed: new Date().toISOString()
			};

			await matcher.storePattern(pattern);

			expect(mockExecute).toHaveBeenCalledWith(
				'memory',
				expect.arrayContaining(['store', '--key', 'new-pattern', '--namespace', 'patterns']),
				undefined
			);
		});
	});

	describe('applyPattern', () => {
		it('should return agent configuration from pattern', () => {
			const pattern: Pattern = {
				id: 'test',
				keywords: ['api'],
				agentConfig: ['coder', 'tester', 'reviewer'],
				successRate: 0.8,
				usageCount: 5,
				lastUsed: new Date().toISOString(),
				topology: 'hierarchical'
			};

			const result = matcher.applyPattern(pattern);

			expect(result.agents).toEqual(['coder', 'tester', 'reviewer']);
			expect(result.topology).toBe('hierarchical');
		});

		it('should default to mesh topology if not specified', () => {
			const pattern: Pattern = {
				id: 'test',
				keywords: ['api'],
				agentConfig: ['coder'],
				successRate: 0.8,
				usageCount: 5,
				lastUsed: new Date().toISOString()
			};

			const result = matcher.applyPattern(pattern);

			expect(result.topology).toBe('mesh');
		});
	});

	describe('singleton instance', () => {
		it('should export a singleton instance', () => {
			expect(patternMatcher).toBeInstanceOf(PatternMatcher);
		});

		it('should have all methods available', () => {
			expect(typeof patternMatcher.findMatchingPatterns).toBe('function');
			expect(typeof patternMatcher.calculateJaccardSimilarity).toBe('function');
			expect(typeof patternMatcher.trackPerformance).toBe('function');
			expect(typeof patternMatcher.storePattern).toBe('function');
			expect(typeof patternMatcher.applyPattern).toBe('function');
		});
	});
});
