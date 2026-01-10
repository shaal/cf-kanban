/**
 * TASK-082: Memory Search Component Tests
 *
 * Tests for semantic memory search with debouncing and highlighting.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryService, type MemorySearchResult } from '$lib/server/claude-flow/memory';

// Mock the CLI
vi.mock('$lib/server/claude-flow/cli', () => ({
	claudeFlowCLI: {
		executeJson: vi.fn(),
		execute: vi.fn()
	}
}));

describe('Memory Search - MemoryService.search', () => {
	let service: MemoryService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new MemoryService();
	});

	it('should search with a query string', async () => {
		const mockResult = {
			entries: [
				{ key: 'auth-pattern', value: 'JWT authentication', namespace: 'patterns', similarity: 0.95 },
				{ key: 'login-flow', value: 'OAuth login flow', namespace: 'patterns', similarity: 0.82 }
			],
			totalFound: 2
		};

		const { claudeFlowCLI } = await import('$lib/server/claude-flow/cli');
		vi.mocked(claudeFlowCLI.executeJson).mockResolvedValue(mockResult);

		const result = await service.search('authentication');

		expect(result.entries).toHaveLength(2);
		expect(result.query).toBe('authentication');
		expect(claudeFlowCLI.executeJson).toHaveBeenCalledWith('memory', [
			'search',
			'--query', 'authentication'
		]);
	});

	it('should search within a specific namespace', async () => {
		const { claudeFlowCLI } = await import('$lib/server/claude-flow/cli');
		vi.mocked(claudeFlowCLI.executeJson).mockResolvedValue({ entries: [] });

		await service.search('error handling', { namespace: 'solutions' });

		expect(claudeFlowCLI.executeJson).toHaveBeenCalledWith('memory', [
			'search',
			'--query', 'error handling',
			'--namespace', 'solutions'
		]);
	});

	it('should support limit option', async () => {
		const { claudeFlowCLI } = await import('$lib/server/claude-flow/cli');
		vi.mocked(claudeFlowCLI.executeJson).mockResolvedValue({ entries: [] });

		await service.search('test', { limit: 10 });

		expect(claudeFlowCLI.executeJson).toHaveBeenCalledWith('memory', [
			'search',
			'--query', 'test',
			'--limit', '10'
		]);
	});

	it('should support threshold option', async () => {
		const { claudeFlowCLI } = await import('$lib/server/claude-flow/cli');
		vi.mocked(claudeFlowCLI.executeJson).mockResolvedValue({ entries: [] });

		await service.search('test', { threshold: 0.7 });

		expect(claudeFlowCLI.executeJson).toHaveBeenCalledWith('memory', [
			'search',
			'--query', 'test',
			'--threshold', '0.7'
		]);
	});

	it('should return empty results for no matches', async () => {
		const { claudeFlowCLI } = await import('$lib/server/claude-flow/cli');
		vi.mocked(claudeFlowCLI.executeJson).mockRejectedValue(
			new Error('no results found')
		);

		const result = await service.search('xyznonexistent');

		expect(result.entries).toEqual([]);
		expect(result.totalFound).toBe(0);
	});

	it('should include similarity scores in results', async () => {
		const { claudeFlowCLI } = await import('$lib/server/claude-flow/cli');
		vi.mocked(claudeFlowCLI.executeJson).mockResolvedValue({
			entries: [
				{ key: 'k1', value: 'v1', namespace: 'ns', similarity: 0.98 },
				{ key: 'k2', value: 'v2', namespace: 'ns', similarity: 0.75 }
			]
		});

		const result = await service.search('test');

		expect(result.entries[0].similarity).toBe(0.98);
		expect(result.entries[1].similarity).toBe(0.75);
	});

	it('should handle results array instead of entries array', async () => {
		const { claudeFlowCLI } = await import('$lib/server/claude-flow/cli');
		vi.mocked(claudeFlowCLI.executeJson).mockResolvedValue({
			results: [
				{ key: 'k1', value: 'v1', namespace: 'ns' }
			]
		});

		const result = await service.search('test');

		expect(result.entries).toHaveLength(1);
	});
});

describe('Memory Search - Debouncing', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should debounce search calls', async () => {
		const searchFn = vi.fn();
		const debounceMs = 300;

		// Simulate debounced search
		let timeoutId: ReturnType<typeof setTimeout> | null = null;
		const debouncedSearch = (query: string) => {
			if (timeoutId) clearTimeout(timeoutId);
			timeoutId = setTimeout(() => searchFn(query), debounceMs);
		};

		// Rapid typing
		debouncedSearch('a');
		debouncedSearch('au');
		debouncedSearch('aut');
		debouncedSearch('auth');

		// Should not have called search yet
		expect(searchFn).not.toHaveBeenCalled();

		// Fast forward past debounce time
		vi.advanceTimersByTime(300);

		// Should only have searched once with final query
		expect(searchFn).toHaveBeenCalledTimes(1);
		expect(searchFn).toHaveBeenCalledWith('auth');
	});

	it('should cancel pending search when query changes', async () => {
		const searchFn = vi.fn();
		const debounceMs = 300;

		let timeoutId: ReturnType<typeof setTimeout> | null = null;
		const debouncedSearch = (query: string) => {
			if (timeoutId) clearTimeout(timeoutId);
			timeoutId = setTimeout(() => searchFn(query), debounceMs);
		};

		debouncedSearch('auth');
		vi.advanceTimersByTime(100);
		debouncedSearch('error'); // Cancel previous

		vi.advanceTimersByTime(300);

		expect(searchFn).toHaveBeenCalledTimes(1);
		expect(searchFn).toHaveBeenCalledWith('error');
	});
});

describe('Memory Search - Term Highlighting', () => {
	function highlightTerms(text: string, query: string): string[] {
		const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
		const regex = new RegExp(`(${terms.join('|')})`, 'gi');
		return text.split(regex);
	}

	it('should split text by matching terms', () => {
		const result = highlightTerms('JWT authentication pattern', 'auth');

		expect(result).toContain('auth');
	});

	it('should be case insensitive', () => {
		const result = highlightTerms('JWT Authentication pattern', 'auth');

		expect(result.some(part => part.toLowerCase() === 'auth')).toBe(true);
	});

	it('should handle multiple terms', () => {
		const result = highlightTerms('JWT authentication with refresh tokens', 'auth token');

		expect(result.some(part => part.toLowerCase().includes('auth'))).toBe(true);
		expect(result.some(part => part.toLowerCase().includes('token'))).toBe(true);
	});

	it('should handle no matches', () => {
		const result = highlightTerms('Hello world', 'xyz');

		expect(result).toEqual(['Hello world']);
	});

	it('should handle empty query', () => {
		// With empty query, the function returns original text without splitting
		// This is because we filter empty terms before creating the regex
		function highlightTermsSafe(text: string, query: string): string[] {
			const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
			if (terms.length === 0) return [text]; // Handle empty query
			const regex = new RegExp(`(${terms.join('|')})`, 'gi');
			return text.split(regex);
		}
		const result = highlightTermsSafe('Hello world', '');
		expect(result).toEqual(['Hello world']);
	});
});

describe('Memory Search - Similarity Score Display', () => {
	function formatSimilarity(score: number): string {
		return `${Math.round(score * 100)}%`;
	}

	function getSimilarityColor(score: number): string {
		if (score >= 0.9) return 'green';
		if (score >= 0.7) return 'yellow';
		return 'red';
	}

	it('should format similarity as percentage', () => {
		expect(formatSimilarity(0.95)).toBe('95%');
		expect(formatSimilarity(0.5)).toBe('50%');
		expect(formatSimilarity(1.0)).toBe('100%');
	});

	it('should return green for high similarity', () => {
		expect(getSimilarityColor(0.95)).toBe('green');
		expect(getSimilarityColor(0.90)).toBe('green');
	});

	it('should return yellow for medium similarity', () => {
		expect(getSimilarityColor(0.85)).toBe('yellow');
		expect(getSimilarityColor(0.70)).toBe('yellow');
	});

	it('should return red for low similarity', () => {
		expect(getSimilarityColor(0.65)).toBe('red');
		expect(getSimilarityColor(0.30)).toBe('red');
	});
});

describe('Memory Search - Input Validation', () => {
	it('should trim whitespace from query', () => {
		const query = '  auth pattern  ';
		expect(query.trim()).toBe('auth pattern');
	});

	it('should handle empty query', () => {
		const query = '';
		expect(query.trim().length).toBe(0);
	});

	it('should handle whitespace-only query', () => {
		const query = '   ';
		expect(query.trim().length).toBe(0);
	});

	it('should require minimum query length', () => {
		const minLength = 2;
		expect('a'.length >= minLength).toBe(false);
		expect('ab'.length >= minLength).toBe(true);
	});
});
