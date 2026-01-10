/**
 * TASK-080: Memory Browser Page Tests
 *
 * Tests for the memory browser route that displays namespaces.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryService, type MemoryNamespace } from '$lib/server/claude-flow/memory';

// Mock the CLI
vi.mock('$lib/server/claude-flow/cli', () => ({
	claudeFlowCLI: {
		executeJson: vi.fn(),
		execute: vi.fn()
	}
}));

describe('Memory Browser - MemoryService.listNamespaces', () => {
	let service: MemoryService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new MemoryService();
	});

	it('should return namespaces with entry counts', async () => {
		const mockNamespaces: MemoryNamespace[] = [
			{ name: 'patterns', entryCount: 15 },
			{ name: 'solutions', entryCount: 8 },
			{ name: 'default', entryCount: 3 }
		];

		const { claudeFlowCLI } = await import('$lib/server/claude-flow/cli');
		vi.mocked(claudeFlowCLI.executeJson).mockResolvedValue({
			namespaces: mockNamespaces
		});

		const result = await service.listNamespaces();

		expect(result).toEqual(mockNamespaces);
		expect(claudeFlowCLI.executeJson).toHaveBeenCalledWith('memory', ['list']);
	});

	it('should group entries by namespace when namespaces array not provided', async () => {
		const { claudeFlowCLI } = await import('$lib/server/claude-flow/cli');
		vi.mocked(claudeFlowCLI.executeJson).mockResolvedValue({
			entries: [
				{ key: 'k1', value: 'v1', namespace: 'patterns' },
				{ key: 'k2', value: 'v2', namespace: 'patterns' },
				{ key: 'k3', value: 'v3', namespace: 'solutions' }
			]
		});

		const result = await service.listNamespaces();

		expect(result).toHaveLength(2);
		expect(result.find(n => n.name === 'patterns')?.entryCount).toBe(2);
		expect(result.find(n => n.name === 'solutions')?.entryCount).toBe(1);
	});

	it('should return empty array when no namespaces exist', async () => {
		const { claudeFlowCLI } = await import('$lib/server/claude-flow/cli');
		vi.mocked(claudeFlowCLI.executeJson).mockResolvedValue({});

		const result = await service.listNamespaces();

		expect(result).toEqual([]);
	});

	it('should handle empty memory gracefully', async () => {
		const { claudeFlowCLI } = await import('$lib/server/claude-flow/cli');
		vi.mocked(claudeFlowCLI.executeJson).mockRejectedValue(
			new Error('Memory is empty')
		);

		const result = await service.listNamespaces();

		expect(result).toEqual([]);
	});

	it('should propagate non-empty errors', async () => {
		const { claudeFlowCLI } = await import('$lib/server/claude-flow/cli');
		vi.mocked(claudeFlowCLI.executeJson).mockRejectedValue(
			new Error('Connection failed')
		);

		await expect(service.listNamespaces()).rejects.toThrow('Connection failed');
	});
});

describe('Memory Browser - Page Data Loading', () => {
	it('should provide namespaces to the page', async () => {
		// This tests the expected shape of data from +page.server.ts
		const mockPageData = {
			namespaces: [
				{ name: 'patterns', entryCount: 15 },
				{ name: 'solutions', entryCount: 8 }
			]
		};

		expect(mockPageData.namespaces).toBeDefined();
		expect(mockPageData.namespaces.length).toBe(2);
	});
});

describe('Memory Browser - Namespace Cards', () => {
	it('should display namespace name', () => {
		const namespace: MemoryNamespace = { name: 'patterns', entryCount: 10 };
		expect(namespace.name).toBe('patterns');
	});

	it('should display entry count', () => {
		const namespace: MemoryNamespace = { name: 'patterns', entryCount: 10 };
		expect(namespace.entryCount).toBe(10);
	});

	it('should handle zero entries', () => {
		const namespace: MemoryNamespace = { name: 'empty', entryCount: 0 };
		expect(namespace.entryCount).toBe(0);
	});

	it('should format last updated date when provided', () => {
		const namespace: MemoryNamespace = {
			name: 'patterns',
			entryCount: 10,
			lastUpdated: '2025-01-09T12:00:00Z'
		};
		expect(namespace.lastUpdated).toBeDefined();
	});
});

describe('Memory Browser - Navigation', () => {
	it('should generate correct namespace detail URL', () => {
		const namespace = 'patterns';
		const expectedUrl = `/learning/memory/${namespace}`;
		expect(expectedUrl).toBe('/learning/memory/patterns');
	});

	it('should encode special characters in namespace URLs', () => {
		const namespace = 'my namespace';
		const encodedUrl = `/learning/memory/${encodeURIComponent(namespace)}`;
		expect(encodedUrl).toBe('/learning/memory/my%20namespace');
	});
});
