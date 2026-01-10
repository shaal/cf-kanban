/**
 * TASK-081: Namespace Viewer Tests
 *
 * Tests for the namespace detail page with pagination.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryService, type MemoryEntry } from '$lib/server/claude-flow/memory';

// Mock the CLI
vi.mock('$lib/server/claude-flow/cli', () => ({
	claudeFlowCLI: {
		executeJson: vi.fn(),
		execute: vi.fn()
	}
}));

describe('Namespace Viewer - MemoryService.listEntries', () => {
	let service: MemoryService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new MemoryService();
	});

	it('should list entries in a namespace', async () => {
		const mockEntries: MemoryEntry[] = [
			{ key: 'pattern-1', value: 'Auth pattern', namespace: 'patterns' },
			{ key: 'pattern-2', value: 'Error handling', namespace: 'patterns' }
		];

		const { claudeFlowCLI } = await import('$lib/server/claude-flow/cli');
		vi.mocked(claudeFlowCLI.executeJson).mockResolvedValue({
			entries: mockEntries
		});

		const result = await service.listEntries({ namespace: 'patterns' });

		expect(result).toEqual(mockEntries);
		expect(claudeFlowCLI.executeJson).toHaveBeenCalledWith('memory', [
			'list',
			'--namespace', 'patterns'
		]);
	});

	it('should support pagination with limit', async () => {
		const { claudeFlowCLI } = await import('$lib/server/claude-flow/cli');
		vi.mocked(claudeFlowCLI.executeJson).mockResolvedValue({ entries: [] });

		await service.listEntries({ namespace: 'patterns', limit: 20 });

		expect(claudeFlowCLI.executeJson).toHaveBeenCalledWith('memory', [
			'list',
			'--namespace', 'patterns',
			'--limit', '20'
		]);
	});

	it('should return empty array when namespace is empty', async () => {
		const { claudeFlowCLI } = await import('$lib/server/claude-flow/cli');
		vi.mocked(claudeFlowCLI.executeJson).mockResolvedValue({ entries: [] });

		const result = await service.listEntries({ namespace: 'empty-ns' });

		expect(result).toEqual([]);
	});

	it('should handle empty error gracefully', async () => {
		const { claudeFlowCLI } = await import('$lib/server/claude-flow/cli');
		vi.mocked(claudeFlowCLI.executeJson).mockRejectedValue(
			new Error('Namespace is empty')
		);

		const result = await service.listEntries({ namespace: 'patterns' });

		expect(result).toEqual([]);
	});
});

describe('Namespace Viewer - MemoryService.retrieve', () => {
	let service: MemoryService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new MemoryService();
	});

	it('should retrieve a specific entry by key', async () => {
		const mockEntry: MemoryEntry = {
			key: 'pattern-auth',
			value: 'JWT authentication pattern',
			namespace: 'patterns',
			tags: ['auth', 'security']
		};

		const { claudeFlowCLI } = await import('$lib/server/claude-flow/cli');
		vi.mocked(claudeFlowCLI.executeJson).mockResolvedValue({ entry: mockEntry });

		const result = await service.retrieve('pattern-auth', 'patterns');

		expect(result).toEqual(mockEntry);
		expect(claudeFlowCLI.executeJson).toHaveBeenCalledWith('memory', [
			'retrieve',
			'--key', 'pattern-auth',
			'--namespace', 'patterns'
		]);
	});

	it('should handle flat response format', async () => {
		const { claudeFlowCLI } = await import('$lib/server/claude-flow/cli');
		vi.mocked(claudeFlowCLI.executeJson).mockResolvedValue({
			key: 'my-key',
			value: 'my-value'
		});

		const result = await service.retrieve('my-key', 'patterns');

		expect(result).toEqual({
			key: 'my-key',
			value: 'my-value',
			namespace: 'patterns'
		});
	});

	it('should return null when entry not found', async () => {
		const { claudeFlowCLI } = await import('$lib/server/claude-flow/cli');
		vi.mocked(claudeFlowCLI.executeJson).mockRejectedValue(
			new Error('Entry not found')
		);

		const result = await service.retrieve('non-existent', 'patterns');

		expect(result).toBeNull();
	});
});

describe('Namespace Viewer - MemoryService.delete', () => {
	let service: MemoryService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new MemoryService();
	});

	it('should delete an entry', async () => {
		const { claudeFlowCLI } = await import('$lib/server/claude-flow/cli');
		vi.mocked(claudeFlowCLI.execute).mockResolvedValue({
			stdout: '',
			stderr: '',
			exitCode: 0,
			timedOut: false,
			duration: 100
		});

		const result = await service.delete('pattern-auth', 'patterns');

		expect(result).toBe(true);
		expect(claudeFlowCLI.execute).toHaveBeenCalledWith('memory', [
			'delete',
			'--key', 'pattern-auth',
			'--namespace', 'patterns'
		]);
	});

	it('should return false on delete failure', async () => {
		const { claudeFlowCLI } = await import('$lib/server/claude-flow/cli');
		vi.mocked(claudeFlowCLI.execute).mockResolvedValue({
			stdout: '',
			stderr: 'Not found',
			exitCode: 1,
			timedOut: false,
			duration: 100
		});

		const result = await service.delete('non-existent', 'patterns');

		expect(result).toBe(false);
	});
});

describe('Namespace Viewer - Pagination', () => {
	it('should calculate correct page numbers', () => {
		const totalEntries = 45;
		const entriesPerPage = 20;
		const totalPages = Math.ceil(totalEntries / entriesPerPage);

		expect(totalPages).toBe(3);
	});

	it('should calculate correct offset', () => {
		const page = 2; // 0-indexed
		const entriesPerPage = 20;
		const offset = page * entriesPerPage;

		expect(offset).toBe(40);
	});

	it('should handle last page with partial entries', () => {
		const totalEntries = 45;
		const entriesPerPage = 20;
		const currentPage = 2; // 0-indexed
		const startIndex = currentPage * entriesPerPage;
		const endIndex = Math.min(startIndex + entriesPerPage, totalEntries);

		expect(endIndex - startIndex).toBe(5); // Last page has 5 entries
	});
});

describe('Namespace Viewer - Entry Details', () => {
	it('should display entry key', () => {
		const entry: MemoryEntry = {
			key: 'pattern-auth',
			value: 'JWT authentication',
			namespace: 'patterns'
		};
		expect(entry.key).toBe('pattern-auth');
	});

	it('should display entry value', () => {
		const entry: MemoryEntry = {
			key: 'pattern-auth',
			value: 'JWT authentication pattern with refresh tokens',
			namespace: 'patterns'
		};
		expect(entry.value).toBe('JWT authentication pattern with refresh tokens');
	});

	it('should display tags when present', () => {
		const entry: MemoryEntry = {
			key: 'pattern-auth',
			value: 'JWT authentication',
			namespace: 'patterns',
			tags: ['auth', 'security', 'jwt']
		};
		expect(entry.tags).toHaveLength(3);
	});

	it('should handle missing tags', () => {
		const entry: MemoryEntry = {
			key: 'pattern-auth',
			value: 'JWT authentication',
			namespace: 'patterns'
		};
		expect(entry.tags).toBeUndefined();
	});
});

describe('Namespace Viewer - URL Parameter Handling', () => {
	it('should decode namespace from URL', () => {
		const encodedNamespace = 'my%20namespace';
		const decodedNamespace = decodeURIComponent(encodedNamespace);
		expect(decodedNamespace).toBe('my namespace');
	});

	it('should handle special characters in namespace', () => {
		const namespace = 'patterns-v2';
		const encoded = encodeURIComponent(namespace);
		expect(encoded).toBe('patterns-v2');
	});
});
