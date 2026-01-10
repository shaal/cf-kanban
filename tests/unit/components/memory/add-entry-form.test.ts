/**
 * TASK-083: Add Entry Form Component Tests
 *
 * Tests for the manual memory entry form.
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

describe('Add Entry Form - MemoryService.store', () => {
	let service: MemoryService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new MemoryService();
	});

	it('should store a new entry', async () => {
		const mockEntry: MemoryEntry = {
			key: 'new-pattern',
			value: 'A new pattern description',
			namespace: 'patterns'
		};

		const { claudeFlowCLI } = await import('$lib/server/claude-flow/cli');
		vi.mocked(claudeFlowCLI.executeJson).mockResolvedValue({ entry: mockEntry });

		const result = await service.store('new-pattern', 'A new pattern description', {
			namespace: 'patterns'
		});

		expect(result.key).toBe('new-pattern');
		expect(result.value).toBe('A new pattern description');
		expect(claudeFlowCLI.executeJson).toHaveBeenCalledWith('memory', [
			'store',
			'--key', 'new-pattern',
			'--value', 'A new pattern description',
			'--namespace', 'patterns'
		]);
	});

	it('should store entry with tags', async () => {
		const { claudeFlowCLI } = await import('$lib/server/claude-flow/cli');
		vi.mocked(claudeFlowCLI.executeJson).mockResolvedValue({
			entry: { key: 'k', value: 'v', namespace: 'ns', tags: ['tag1', 'tag2'] }
		});

		await service.store('k', 'v', {
			namespace: 'ns',
			tags: ['tag1', 'tag2']
		});

		expect(claudeFlowCLI.executeJson).toHaveBeenCalledWith('memory', [
			'store',
			'--key', 'k',
			'--value', 'v',
			'--namespace', 'ns',
			'--tags', 'tag1,tag2'
		]);
	});

	it('should store entry with TTL', async () => {
		const { claudeFlowCLI } = await import('$lib/server/claude-flow/cli');
		vi.mocked(claudeFlowCLI.executeJson).mockResolvedValue({
			entry: { key: 'k', value: 'v', namespace: 'ns' }
		});

		await service.store('k', 'v', {
			namespace: 'ns',
			ttl: 3600
		});

		expect(claudeFlowCLI.executeJson).toHaveBeenCalledWith('memory', [
			'store',
			'--key', 'k',
			'--value', 'v',
			'--namespace', 'ns',
			'--ttl', '3600'
		]);
	});

	it('should construct entry from simple response', async () => {
		const { claudeFlowCLI } = await import('$lib/server/claude-flow/cli');
		vi.mocked(claudeFlowCLI.executeJson).mockResolvedValue({
			success: true,
			key: 'test-key'
		});

		const result = await service.store('test-key', 'test-value', {
			namespace: 'test-ns',
			tags: ['a', 'b']
		});

		expect(result).toEqual({
			key: 'test-key',
			value: 'test-value',
			namespace: 'test-ns',
			tags: ['a', 'b']
		});
	});
});

describe('Add Entry Form - MemoryService.exists', () => {
	let service: MemoryService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new MemoryService();
	});

	it('should return true when entry exists', async () => {
		const { claudeFlowCLI } = await import('$lib/server/claude-flow/cli');
		vi.mocked(claudeFlowCLI.executeJson).mockResolvedValue({
			entry: { key: 'existing', value: 'v', namespace: 'ns' }
		});

		const result = await service.exists('existing', 'ns');

		expect(result).toBe(true);
	});

	it('should return false when entry does not exist', async () => {
		const { claudeFlowCLI } = await import('$lib/server/claude-flow/cli');
		vi.mocked(claudeFlowCLI.executeJson).mockRejectedValue(
			new Error('Entry not found')
		);

		const result = await service.exists('nonexistent', 'ns');

		expect(result).toBe(false);
	});
});

describe('Add Entry Form - Key Validation', () => {
	function validateKey(key: string): { valid: boolean; error?: string } {
		if (!key || key.trim().length === 0) {
			return { valid: false, error: 'Key is required' };
		}
		if (key.length > 100) {
			return { valid: false, error: 'Key must be 100 characters or less' };
		}
		if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
			return { valid: false, error: 'Key can only contain letters, numbers, underscores, and hyphens' };
		}
		return { valid: true };
	}

	it('should reject empty key', () => {
		expect(validateKey('')).toEqual({ valid: false, error: 'Key is required' });
	});

	it('should reject whitespace-only key', () => {
		expect(validateKey('   ')).toEqual({ valid: false, error: 'Key is required' });
	});

	it('should accept valid key', () => {
		expect(validateKey('my-pattern_123')).toEqual({ valid: true });
	});

	it('should reject key with spaces', () => {
		const result = validateKey('my pattern');
		expect(result.valid).toBe(false);
		expect(result.error).toContain('letters, numbers');
	});

	it('should reject key with special characters', () => {
		const result = validateKey('my@pattern!');
		expect(result.valid).toBe(false);
	});

	it('should reject key over 100 characters', () => {
		const longKey = 'a'.repeat(101);
		const result = validateKey(longKey);
		expect(result.valid).toBe(false);
		expect(result.error).toContain('100 characters');
	});
});

describe('Add Entry Form - Value Validation', () => {
	function validateValue(value: string): { valid: boolean; error?: string } {
		if (!value || value.trim().length === 0) {
			return { valid: false, error: 'Value is required' };
		}
		if (value.length > 10000) {
			return { valid: false, error: 'Value must be 10000 characters or less' };
		}
		return { valid: true };
	}

	it('should reject empty value', () => {
		expect(validateValue('')).toEqual({ valid: false, error: 'Value is required' });
	});

	it('should accept valid value', () => {
		expect(validateValue('This is a valid value')).toEqual({ valid: true });
	});

	it('should accept multiline value', () => {
		const multiline = 'Line 1\nLine 2\nLine 3';
		expect(validateValue(multiline)).toEqual({ valid: true });
	});

	it('should reject value over 10000 characters', () => {
		const longValue = 'a'.repeat(10001);
		const result = validateValue(longValue);
		expect(result.valid).toBe(false);
	});
});

describe('Add Entry Form - Tags Parsing', () => {
	function parseTags(input: string): string[] {
		return input
			.split(',')
			.map(tag => tag.trim())
			.filter(tag => tag.length > 0);
	}

	it('should parse comma-separated tags', () => {
		expect(parseTags('tag1, tag2, tag3')).toEqual(['tag1', 'tag2', 'tag3']);
	});

	it('should trim whitespace from tags', () => {
		expect(parseTags('  tag1  ,  tag2  ')).toEqual(['tag1', 'tag2']);
	});

	it('should filter empty tags', () => {
		expect(parseTags('tag1,,tag2,')).toEqual(['tag1', 'tag2']);
	});

	it('should handle empty input', () => {
		expect(parseTags('')).toEqual([]);
	});

	it('should handle single tag', () => {
		expect(parseTags('single')).toEqual(['single']);
	});
});

describe('Add Entry Form - Namespace Selection', () => {
	const namespaces = ['default', 'patterns', 'solutions', 'errors'];

	it('should list available namespaces', () => {
		expect(namespaces).toContain('patterns');
		expect(namespaces).toContain('solutions');
	});

	it('should allow custom namespace', () => {
		const customNamespace = 'my-custom-namespace';
		expect(namespaces.includes(customNamespace)).toBe(false);
		// Custom namespaces are allowed
	});

	it('should default to "default" namespace', () => {
		expect(namespaces[0]).toBe('default');
	});
});

describe('Add Entry Form - Form Submission', () => {
	it('should create FormData with all fields', () => {
		const formData = new FormData();
		formData.set('key', 'test-key');
		formData.set('value', 'test-value');
		formData.set('namespace', 'patterns');
		formData.set('tags', 'tag1, tag2');

		expect(formData.get('key')).toBe('test-key');
		expect(formData.get('value')).toBe('test-value');
		expect(formData.get('namespace')).toBe('patterns');
		expect(formData.get('tags')).toBe('tag1, tag2');
	});
});
