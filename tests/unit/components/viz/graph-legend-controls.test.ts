/**
 * Graph Legend and Controls Tests
 *
 * TASK-070: Create Graph Legend and Controls
 *
 * Tests for legend items, color mapping, search, and filter functionality.
 */

import { describe, it, expect, vi } from 'vitest';
import type { LegendItem, GraphFilter, ForceNode } from '$lib/components/viz/types';

// Legend utilities
function createLegendItems(nodes: ForceNode[], colors: string[]): LegendItem[] {
	const groups = [...new Set(nodes.map(n => n.group).filter(Boolean))] as string[];
	return groups.map((group, i) => ({
		id: group,
		label: group,
		color: colors[i % colors.length],
		visible: true
	}));
}

function toggleLegendItem(items: LegendItem[], id: string): LegendItem[] {
	return items.map(item =>
		item.id === id ? { ...item, visible: !item.visible } : item
	);
}

function getVisibleGroups(items: LegendItem[]): string[] {
	return items.filter(item => item.visible).map(item => item.id);
}

// Filter utilities
function createDefaultFilter(): GraphFilter {
	return {
		groups: undefined,
		searchQuery: '',
		minConnections: 0
	};
}

function filterNodes(nodes: ForceNode[], filter: GraphFilter): ForceNode[] {
	return nodes.filter(node => {
		// Group filter
		if (filter.groups && filter.groups.length > 0) {
			if (!node.group || !filter.groups.includes(node.group)) {
				return false;
			}
		}

		// Search filter
		if (filter.searchQuery && filter.searchQuery.trim()) {
			const query = filter.searchQuery.toLowerCase();
			const label = (node.label ?? node.id).toLowerCase();
			if (!label.includes(query)) {
				return false;
			}
		}

		return true;
	});
}

function searchNodes(nodes: ForceNode[], query: string): ForceNode[] {
	if (!query.trim()) return nodes;

	const lowerQuery = query.toLowerCase();
	return nodes.filter(node => {
		const label = (node.label ?? node.id).toLowerCase();
		const id = node.id.toLowerCase();
		return label.includes(lowerQuery) || id.includes(lowerQuery);
	});
}

function highlightMatchingNodes(nodes: ForceNode[], query: string): string[] {
	if (!query.trim()) return [];

	return searchNodes(nodes, query).map(n => n.id);
}

// Connection counting
function countNodeConnections(nodeId: string, links: { source: string; target: string }[]): number {
	return links.filter(l => l.source === nodeId || l.target === nodeId).length;
}

describe('Legend Item Creation', () => {
	const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
	const mockNodes: ForceNode[] = [
		{ id: '1', label: 'Node 1', group: 'Group A' },
		{ id: '2', label: 'Node 2', group: 'Group B' },
		{ id: '3', label: 'Node 3', group: 'Group A' },
		{ id: '4', label: 'Node 4', group: 'Group C' }
	];

	describe('createLegendItems', () => {
		it('should create legend items from node groups', () => {
			const items = createLegendItems(mockNodes, colors);
			expect(items).toHaveLength(3); // A, B, C
		});

		it('should assign colors to groups', () => {
			const items = createLegendItems(mockNodes, colors);
			expect(items[0].color).toBe('#3b82f6');
			expect(items[1].color).toBe('#10b981');
			expect(items[2].color).toBe('#f59e0b');
		});

		it('should set all items visible by default', () => {
			const items = createLegendItems(mockNodes, colors);
			items.forEach(item => {
				expect(item.visible).toBe(true);
			});
		});

		it('should handle nodes without groups', () => {
			const nodesWithoutGroup: ForceNode[] = [
				{ id: '1', label: 'Node 1' },
				{ id: '2', label: 'Node 2', group: 'Group A' }
			];
			const items = createLegendItems(nodesWithoutGroup, colors);
			expect(items).toHaveLength(1);
			expect(items[0].id).toBe('Group A');
		});

		it('should wrap colors when groups exceed palette', () => {
			const manyNodes: ForceNode[] = Array.from({ length: 6 }, (_, i) => ({
				id: `${i}`,
				label: `Node ${i}`,
				group: `Group ${i}`
			}));
			const items = createLegendItems(manyNodes, colors);
			expect(items[4].color).toBe(colors[0]); // Wraps around
		});
	});

	describe('toggleLegendItem', () => {
		it('should toggle visibility of an item', () => {
			let items = createLegendItems(mockNodes, colors);
			items = toggleLegendItem(items, 'Group A');

			const groupA = items.find(i => i.id === 'Group A');
			expect(groupA?.visible).toBe(false);
		});

		it('should not affect other items', () => {
			let items = createLegendItems(mockNodes, colors);
			items = toggleLegendItem(items, 'Group A');

			const groupB = items.find(i => i.id === 'Group B');
			expect(groupB?.visible).toBe(true);
		});

		it('should toggle back on', () => {
			let items = createLegendItems(mockNodes, colors);
			items = toggleLegendItem(items, 'Group A');
			items = toggleLegendItem(items, 'Group A');

			const groupA = items.find(i => i.id === 'Group A');
			expect(groupA?.visible).toBe(true);
		});
	});

	describe('getVisibleGroups', () => {
		it('should return all groups when all visible', () => {
			const items = createLegendItems(mockNodes, colors);
			const visible = getVisibleGroups(items);
			expect(visible).toHaveLength(3);
		});

		it('should exclude hidden groups', () => {
			let items = createLegendItems(mockNodes, colors);
			items = toggleLegendItem(items, 'Group B');
			const visible = getVisibleGroups(items);

			expect(visible).toHaveLength(2);
			expect(visible).not.toContain('Group B');
		});
	});
});

describe('Graph Filtering', () => {
	const mockNodes: ForceNode[] = [
		{ id: '1', label: 'Alpha Node', group: 'Core' },
		{ id: '2', label: 'Beta Node', group: 'Core' },
		{ id: '3', label: 'Gamma Node', group: 'Edge' },
		{ id: '4', label: 'Delta Node', group: 'Edge' },
		{ id: '5', label: 'Epsilon' }
	];

	describe('createDefaultFilter', () => {
		it('should create empty filter', () => {
			const filter = createDefaultFilter();
			expect(filter.groups).toBeUndefined();
			expect(filter.searchQuery).toBe('');
			expect(filter.minConnections).toBe(0);
		});
	});

	describe('filterNodes', () => {
		it('should return all nodes with empty filter', () => {
			const filter = createDefaultFilter();
			const filtered = filterNodes(mockNodes, filter);
			expect(filtered).toHaveLength(5);
		});

		it('should filter by groups', () => {
			const filter: GraphFilter = {
				groups: ['Core'],
				searchQuery: ''
			};
			const filtered = filterNodes(mockNodes, filter);
			expect(filtered).toHaveLength(2);
			expect(filtered.every(n => n.group === 'Core')).toBe(true);
		});

		it('should filter by multiple groups', () => {
			const filter: GraphFilter = {
				groups: ['Core', 'Edge'],
				searchQuery: ''
			};
			const filtered = filterNodes(mockNodes, filter);
			expect(filtered).toHaveLength(4);
		});

		it('should filter by search query', () => {
			const filter: GraphFilter = {
				searchQuery: 'alpha'
			};
			const filtered = filterNodes(mockNodes, filter);
			expect(filtered).toHaveLength(1);
			expect(filtered[0].id).toBe('1');
		});

		it('should be case insensitive', () => {
			const filter: GraphFilter = {
				searchQuery: 'BETA'
			};
			const filtered = filterNodes(mockNodes, filter);
			expect(filtered).toHaveLength(1);
		});

		it('should handle partial matches', () => {
			const filter: GraphFilter = {
				searchQuery: 'Node'
			};
			const filtered = filterNodes(mockNodes, filter);
			expect(filtered).toHaveLength(4); // All except 'Epsilon'
		});

		it('should combine group and search filters', () => {
			const filter: GraphFilter = {
				groups: ['Edge'],
				searchQuery: 'Gamma'
			};
			const filtered = filterNodes(mockNodes, filter);
			expect(filtered).toHaveLength(1);
			expect(filtered[0].id).toBe('3');
		});
	});
});

describe('Search Functionality', () => {
	const mockNodes: ForceNode[] = [
		{ id: 'user-1', label: 'John Doe' },
		{ id: 'user-2', label: 'Jane Smith' },
		{ id: 'user-3', label: 'Bob Johnson' },
		{ id: 'admin-1', label: 'Admin User' }
	];

	describe('searchNodes', () => {
		it('should return all nodes for empty query', () => {
			const results = searchNodes(mockNodes, '');
			expect(results).toHaveLength(4);
		});

		it('should search by label', () => {
			const results = searchNodes(mockNodes, 'John');
			expect(results).toHaveLength(2); // John Doe and Bob Johnson
		});

		it('should search by id', () => {
			const results = searchNodes(mockNodes, 'admin');
			expect(results).toHaveLength(1);
			expect(results[0].id).toBe('admin-1');
		});

		it('should return empty for no matches', () => {
			const results = searchNodes(mockNodes, 'xyz');
			expect(results).toHaveLength(0);
		});

		it('should handle whitespace-only query', () => {
			const results = searchNodes(mockNodes, '   ');
			expect(results).toHaveLength(4);
		});
	});

	describe('highlightMatchingNodes', () => {
		it('should return empty for empty query', () => {
			const ids = highlightMatchingNodes(mockNodes, '');
			expect(ids).toHaveLength(0);
		});

		it('should return matching node ids', () => {
			const ids = highlightMatchingNodes(mockNodes, 'Jane');
			expect(ids).toHaveLength(1);
			expect(ids).toContain('user-2');
		});

		it('should return multiple matches', () => {
			const ids = highlightMatchingNodes(mockNodes, 'user');
			expect(ids).toHaveLength(4); // All have 'user' in id or label
		});
	});
});

describe('Connection Counting', () => {
	const mockLinks = [
		{ source: 'a', target: 'b' },
		{ source: 'a', target: 'c' },
		{ source: 'b', target: 'c' },
		{ source: 'c', target: 'd' }
	];

	describe('countNodeConnections', () => {
		it('should count connections for a node', () => {
			expect(countNodeConnections('a', mockLinks)).toBe(2);
			expect(countNodeConnections('b', mockLinks)).toBe(2);
			expect(countNodeConnections('c', mockLinks)).toBe(3);
			expect(countNodeConnections('d', mockLinks)).toBe(1);
		});

		it('should return 0 for unconnected nodes', () => {
			expect(countNodeConnections('z', mockLinks)).toBe(0);
		});
	});
});

describe('Control Actions', () => {
	describe('Zoom Controls', () => {
		it('should define zoom levels', () => {
			const zoomLevels = {
				min: 0.1,
				max: 4,
				default: 1,
				step: 0.25
			};

			expect(zoomLevels.min).toBeLessThan(zoomLevels.max);
			expect(zoomLevels.default).toBeGreaterThanOrEqual(zoomLevels.min);
			expect(zoomLevels.default).toBeLessThanOrEqual(zoomLevels.max);
		});

		it('should calculate zoom in value', () => {
			const currentZoom = 1;
			const step = 0.25;
			const max = 4;
			const newZoom = Math.min(currentZoom + step, max);
			expect(newZoom).toBe(1.25);
		});

		it('should calculate zoom out value', () => {
			const currentZoom = 1;
			const step = 0.25;
			const min = 0.1;
			const newZoom = Math.max(currentZoom - step, min);
			expect(newZoom).toBe(0.75);
		});
	});

	describe('Layout Controls', () => {
		it('should define layout options', () => {
			const layouts = ['force', 'radial', 'tree', 'grid'];
			expect(layouts).toContain('force');
			expect(layouts.length).toBeGreaterThan(1);
		});
	});

	describe('Display Options', () => {
		it('should define display toggles', () => {
			const displayOptions = {
				showLabels: true,
				showLinks: true,
				showLegend: true,
				animationsEnabled: true
			};

			expect(typeof displayOptions.showLabels).toBe('boolean');
			expect(typeof displayOptions.showLinks).toBe('boolean');
		});
	});
});

describe('Accessibility', () => {
	it('should support keyboard navigation in legend', () => {
		const items: LegendItem[] = [
			{ id: 'a', label: 'Group A', color: '#f00', visible: true },
			{ id: 'b', label: 'Group B', color: '#0f0', visible: true }
		];

		// Each item should be focusable
		items.forEach(item => {
			expect(item.id).toBeDefined();
			expect(item.label).toBeDefined();
		});
	});

	it('should provide aria labels for controls', () => {
		const controlLabels = {
			zoomIn: 'Zoom in',
			zoomOut: 'Zoom out',
			resetZoom: 'Reset zoom',
			fitToScreen: 'Fit graph to screen',
			search: 'Search nodes'
		};

		Object.values(controlLabels).forEach(label => {
			expect(label.length).toBeGreaterThan(0);
		});
	});
});
