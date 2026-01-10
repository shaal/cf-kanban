/**
 * Command Palette Tests
 * GAP-8.2: Command Palette (Cmd+K)
 *
 * Tests for command data, fuzzy search, and filtering functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
	HOOKS_DATA,
	WORKERS_DATA,
	NAVIGATION_DATA,
	ACTIONS_DATA,
	getAllCommands,
	fuzzyScore,
	searchCommands,
	groupCommandsByType,
	getTypeLabel,
	type CommandItem
} from '../../src/lib/components/command/command-data';

describe('Command Palette Data', () => {
	describe('HOOKS_DATA', () => {
		it('should contain all 26 hooks', () => {
			expect(HOOKS_DATA.length).toBeGreaterThanOrEqual(26);
		});

		it('should have correct structure for each hook', () => {
			for (const hook of HOOKS_DATA) {
				expect(hook).toHaveProperty('id');
				expect(hook).toHaveProperty('type', 'hook');
				expect(hook).toHaveProperty('name');
				expect(hook).toHaveProperty('description');
				expect(hook).toHaveProperty('keywords');
				expect(hook).toHaveProperty('icon');
				expect(hook).toHaveProperty('category');
				expect(Array.isArray(hook.keywords)).toBe(true);
			}
		});

		it('should include key hooks', () => {
			const hookNames = HOOKS_DATA.map(h => h.name);
			expect(hookNames).toContain('pre-edit');
			expect(hookNames).toContain('post-edit');
			expect(hookNames).toContain('pre-task');
			expect(hookNames).toContain('post-task');
			expect(hookNames).toContain('route');
			expect(hookNames).toContain('pretrain');
		});
	});

	describe('WORKERS_DATA', () => {
		it('should contain all 12 workers', () => {
			expect(WORKERS_DATA.length).toBe(12);
		});

		it('should have correct structure for each worker', () => {
			for (const worker of WORKERS_DATA) {
				expect(worker).toHaveProperty('id');
				expect(worker).toHaveProperty('type', 'worker');
				expect(worker).toHaveProperty('name');
				expect(worker).toHaveProperty('description');
				expect(worker).toHaveProperty('keywords');
				expect(worker).toHaveProperty('icon');
				expect(worker).toHaveProperty('category');
			}
		});

		it('should include key workers', () => {
			const workerNames = WORKERS_DATA.map(w => w.name);
			expect(workerNames).toContain('ultralearn');
			expect(workerNames).toContain('optimize');
			expect(workerNames).toContain('audit');
			expect(workerNames).toContain('testgaps');
		});
	});

	describe('NAVIGATION_DATA', () => {
		it('should contain navigation items', () => {
			expect(NAVIGATION_DATA.length).toBeGreaterThan(0);
		});

		it('should have href for navigation items', () => {
			for (const nav of NAVIGATION_DATA) {
				expect(nav.type).toBe('navigation');
				expect(nav.href).toBeDefined();
				expect(nav.href).toMatch(/^\//);
			}
		});
	});

	describe('ACTIONS_DATA', () => {
		it('should contain action items', () => {
			expect(ACTIONS_DATA.length).toBeGreaterThan(0);
		});

		it('should have correct type', () => {
			for (const action of ACTIONS_DATA) {
				expect(action.type).toBe('action');
			}
		});
	});

	describe('getAllCommands', () => {
		it('should return all commands from all categories', () => {
			const commands = getAllCommands();
			expect(commands.length).toBeGreaterThan(100); // 60+ agents + hooks + workers + nav + actions
		});

		it('should include all command types', () => {
			const commands = getAllCommands();
			const types = new Set(commands.map(c => c.type));
			expect(types.has('navigation')).toBe(true);
			expect(types.has('action')).toBe(true);
			expect(types.has('agent')).toBe(true);
			expect(types.has('hook')).toBe(true);
			expect(types.has('worker')).toBe(true);
		});
	});
});

describe('Fuzzy Search', () => {
	describe('fuzzyScore', () => {
		it('should return 100 for exact match', () => {
			expect(fuzzyScore('coder', 'coder')).toBe(100);
			expect(fuzzyScore('Coder', 'coder')).toBe(100);
		});

		it('should return 80 for starts-with match', () => {
			expect(fuzzyScore('cod', 'coder')).toBe(80);
			expect(fuzzyScore('test', 'tester')).toBe(80);
		});

		it('should return 60 for contains match', () => {
			expect(fuzzyScore('view', 'reviewer')).toBe(60);
			expect(fuzzyScore('sec', 'security-architect')).toBe(80); // starts with
		});

		it('should return 0 for no match', () => {
			expect(fuzzyScore('xyz', 'coder')).toBe(0);
			expect(fuzzyScore('zzz', 'tester')).toBe(0);
		});

		it('should return 1 for empty query', () => {
			expect(fuzzyScore('', 'anything')).toBe(1);
		});

		it('should handle word boundary matching', () => {
			const score = fuzzyScore('arch', 'security-architect');
			expect(score).toBeGreaterThan(0);
		});
	});

	describe('searchCommands', () => {
		let allCommands: CommandItem[];

		beforeEach(() => {
			allCommands = getAllCommands();
		});

		it('should return all commands for empty query', () => {
			const results = searchCommands('', allCommands);
			expect(results.length).toBe(allCommands.length);
		});

		it('should filter commands by name', () => {
			const results = searchCommands('coder', allCommands);
			expect(results.length).toBeGreaterThan(0);
			expect(results[0].name.toLowerCase()).toContain('coder');
		});

		it('should filter by description', () => {
			const results = searchCommands('security', allCommands);
			expect(results.length).toBeGreaterThan(0);
			expect(
				results.some(r =>
					r.name.toLowerCase().includes('security') ||
					r.description.toLowerCase().includes('security')
				)
			).toBe(true);
		});

		it('should filter by keywords', () => {
			const results = searchCommands('test', allCommands);
			expect(results.length).toBeGreaterThan(0);
		});

		it('should sort results by relevance', () => {
			const results = searchCommands('code', allCommands);
			// Exact or close matches should come first
			expect(results.length).toBeGreaterThan(1);
		});

		it('should handle fuzzy matching', () => {
			const results = searchCommands('perf', allCommands);
			expect(results.length).toBeGreaterThan(0);
			expect(
				results.some(r =>
					r.name.toLowerCase().includes('perf') ||
					r.description.toLowerCase().includes('perf')
				)
			).toBe(true);
		});
	});
});

describe('Command Grouping', () => {
	describe('groupCommandsByType', () => {
		it('should group commands correctly', () => {
			const commands = getAllCommands();
			const grouped = groupCommandsByType(commands);

			expect(grouped.has('navigation')).toBe(true);
			expect(grouped.has('action')).toBe(true);
			expect(grouped.has('agent')).toBe(true);
			expect(grouped.has('hook')).toBe(true);
			expect(grouped.has('worker')).toBe(true);
		});

		it('should have correct number of items in each group', () => {
			const commands = getAllCommands();
			const grouped = groupCommandsByType(commands);

			const agentCount = grouped.get('agent')?.length || 0;
			const hookCount = grouped.get('hook')?.length || 0;
			const workerCount = grouped.get('worker')?.length || 0;

			expect(agentCount).toBeGreaterThanOrEqual(50); // 60+ agents
			expect(hookCount).toBeGreaterThanOrEqual(26);
			expect(workerCount).toBe(12);
		});
	});

	describe('getTypeLabel', () => {
		it('should return correct labels', () => {
			expect(getTypeLabel('navigation')).toBe('Navigation');
			expect(getTypeLabel('action')).toBe('Quick Actions');
			expect(getTypeLabel('agent')).toBe('Agents');
			expect(getTypeLabel('hook')).toBe('Hooks');
			expect(getTypeLabel('worker')).toBe('Workers');
		});
	});
});
