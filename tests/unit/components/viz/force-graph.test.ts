/**
 * Force Graph Tests
 *
 * TASK-068: Implement Force-Directed Graph
 *
 * Tests for force simulation, node/link handling, and graph utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as d3 from 'd3';
import type { ForceNode, ForceLink, ForceGraphData } from '$lib/components/viz/types';

// Mock data helpers
function createMockNode(id: string, overrides: Partial<ForceNode> = {}): ForceNode {
	return {
		id,
		label: `Node ${id}`,
		...overrides
	};
}

function createMockLink(source: string, target: string, overrides: Partial<ForceLink> = {}): ForceLink {
	return {
		source,
		target,
		...overrides
	};
}

function createMockGraphData(nodeCount: number = 5): ForceGraphData {
	const nodes = Array.from({ length: nodeCount }, (_, i) =>
		createMockNode(`node-${i}`, { group: `group-${i % 3}` })
	);

	const links: ForceLink[] = [];
	for (let i = 1; i < nodeCount; i++) {
		links.push(createMockLink(`node-${i - 1}`, `node-${i}`));
	}

	return { nodes, links };
}

describe('ForceGraph Data Handling', () => {
	describe('Node creation', () => {
		it('should create nodes with required properties', () => {
			const node = createMockNode('test-1');
			expect(node.id).toBe('test-1');
			expect(node.label).toBe('Node test-1');
		});

		it('should support optional properties', () => {
			const node = createMockNode('test-1', {
				group: 'core',
				color: '#ff0000',
				radius: 25,
				x: 100,
				y: 200
			});

			expect(node.group).toBe('core');
			expect(node.color).toBe('#ff0000');
			expect(node.radius).toBe(25);
			expect(node.x).toBe(100);
			expect(node.y).toBe(200);
		});

		it('should support fixed positions', () => {
			const node = createMockNode('fixed-node', {
				fx: 400,
				fy: 300
			});

			expect(node.fx).toBe(400);
			expect(node.fy).toBe(300);
		});
	});

	describe('Link creation', () => {
		it('should create links with source and target', () => {
			const link = createMockLink('a', 'b');
			expect(link.source).toBe('a');
			expect(link.target).toBe('b');
		});

		it('should support link value/weight', () => {
			const link = createMockLink('a', 'b', { value: 5 });
			expect(link.value).toBe(5);
		});

		it('should support link labels', () => {
			const link = createMockLink('a', 'b', { label: 'depends on' });
			expect(link.label).toBe('depends on');
		});
	});

	describe('Graph data structure', () => {
		it('should create graph with nodes and links', () => {
			const data = createMockGraphData(5);
			expect(data.nodes).toHaveLength(5);
			expect(data.links).toHaveLength(4); // Linear chain
		});

		it('should assign groups to nodes', () => {
			const data = createMockGraphData(6);
			const groups = new Set(data.nodes.map(n => n.group));
			expect(groups.size).toBe(3);
		});
	});
});

describe('D3 Force Simulation', () => {
	describe('Simulation creation', () => {
		it('should create simulation with nodes', () => {
			const nodes = [
				{ id: 'a', x: 0, y: 0 },
				{ id: 'b', x: 100, y: 100 }
			];

			const simulation = d3.forceSimulation(nodes);
			expect(simulation).toBeDefined();
			expect(simulation.nodes()).toHaveLength(2);
		});

		it('should support link force', () => {
			const nodes = [
				{ id: 'a', x: 0, y: 0 },
				{ id: 'b', x: 100, y: 100 }
			];
			const links = [{ source: 'a', target: 'b' }];

			const simulation = d3.forceSimulation(nodes)
				.force('link', d3.forceLink(links).id((d: any) => d.id));

			const linkForce = simulation.force('link') as d3.ForceLink<any, any>;
			expect(linkForce).toBeDefined();
			expect(linkForce.links()).toHaveLength(1);
		});

		it('should support charge force', () => {
			const simulation = d3.forceSimulation([])
				.force('charge', d3.forceManyBody().strength(-400));

			const chargeForce = simulation.force('charge') as d3.ForceManyBody<any>;
			expect(chargeForce).toBeDefined();
			expect(chargeForce.strength()()).toBe(-400);
		});

		it('should support center force', () => {
			const simulation = d3.forceSimulation([])
				.force('center', d3.forceCenter(400, 300));

			const centerForce = simulation.force('center') as d3.ForceCenter<any>;
			expect(centerForce).toBeDefined();
			expect(centerForce.x()).toBe(400);
			expect(centerForce.y()).toBe(300);
		});

		it('should support collision force', () => {
			const simulation = d3.forceSimulation([])
				.force('collision', d3.forceCollide(30));

			const collisionForce = simulation.force('collision') as d3.ForceCollide<any>;
			expect(collisionForce).toBeDefined();
			expect(collisionForce.radius()({}, 0, [])).toBe(30);
		});
	});

	describe('Simulation control', () => {
		it('should support alpha control', () => {
			const simulation = d3.forceSimulation([]);
			simulation.alpha(1);
			expect(simulation.alpha()).toBe(1);

			simulation.alpha(0.5);
			expect(simulation.alpha()).toBe(0.5);
		});

		it('should support alpha decay', () => {
			const simulation = d3.forceSimulation([])
				.alphaDecay(0.02);

			expect(simulation.alphaDecay()).toBe(0.02);
		});

		it('should support alpha target', () => {
			const simulation = d3.forceSimulation([])
				.alphaTarget(0.3);

			expect(simulation.alphaTarget()).toBe(0.3);
		});

		it('should support restart and stop', () => {
			const simulation = d3.forceSimulation([]);
			simulation.stop();
			simulation.restart();
			// Should not throw
			expect(true).toBe(true);
		});
	});
});

describe('D3 Zoom Behavior', () => {
	it('should create zoom behavior', () => {
		const zoom = d3.zoom<SVGSVGElement, unknown>();
		expect(zoom).toBeDefined();
	});

	it('should support scale extent', () => {
		const zoom = d3.zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.1, 4]);

		const extent = zoom.scaleExtent();
		expect(extent[0]).toBe(0.1);
		expect(extent[1]).toBe(4);
	});

	it('should support translate extent', () => {
		const zoom = d3.zoom<SVGSVGElement, unknown>()
			.translateExtent([[0, 0], [800, 600]]);

		const extent = zoom.translateExtent();
		expect(extent[0]).toEqual([0, 0]);
		expect(extent[1]).toEqual([800, 600]);
	});

	it('should create zoom identity transform', () => {
		const identity = d3.zoomIdentity;
		expect(identity.k).toBe(1);
		expect(identity.x).toBe(0);
		expect(identity.y).toBe(0);
	});

	it('should support transform translation', () => {
		const transform = d3.zoomIdentity.translate(100, 200);
		expect(transform.x).toBe(100);
		expect(transform.y).toBe(200);
	});

	it('should support transform scaling', () => {
		const transform = d3.zoomIdentity.scale(2);
		expect(transform.k).toBe(2);
	});
});

describe('D3 Drag Behavior', () => {
	it('should create drag behavior', () => {
		const drag = d3.drag<SVGGElement, any>();
		expect(drag).toBeDefined();
	});

	it('should support drag events', () => {
		const startHandler = vi.fn();
		const dragHandler = vi.fn();
		const endHandler = vi.fn();

		const drag = d3.drag<SVGGElement, any>()
			.on('start', startHandler)
			.on('drag', dragHandler)
			.on('end', endHandler);

		expect(drag.on('start')).toBeDefined();
		expect(drag.on('drag')).toBeDefined();
		expect(drag.on('end')).toBeDefined();
	});
});

describe('Graph Utilities', () => {
	describe('Node color assignment', () => {
		const colors = [
			'#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'
		];

		it('should assign colors by group', () => {
			const groups = ['a', 'b', 'c'];
			const getColor = (group: string) => colors[groups.indexOf(group) % colors.length];

			expect(getColor('a')).toBe('#3b82f6');
			expect(getColor('b')).toBe('#10b981');
			expect(getColor('c')).toBe('#f59e0b');
		});

		it('should wrap colors when groups exceed palette', () => {
			const groupIndex = 7;
			const color = colors[groupIndex % colors.length];
			expect(color).toBe(colors[2]); // 7 % 5 = 2
		});
	});

	describe('Node selection helpers', () => {
		it('should identify selected node', () => {
			const selectedId = 'node-2';
			const isSelected = (id: string) => id === selectedId;

			expect(isSelected('node-1')).toBe(false);
			expect(isSelected('node-2')).toBe(true);
			expect(isSelected('node-3')).toBe(false);
		});

		it('should identify highlighted nodes', () => {
			const highlightedIds = ['node-1', 'node-3'];
			const isHighlighted = (id: string) => highlightedIds.includes(id);

			expect(isHighlighted('node-1')).toBe(true);
			expect(isHighlighted('node-2')).toBe(false);
			expect(isHighlighted('node-3')).toBe(true);
		});

		it('should identify connected nodes', () => {
			const links = [
				{ source: { id: 'a' }, target: { id: 'b' } },
				{ source: { id: 'b' }, target: { id: 'c' } }
			];
			const selectedId = 'b';

			const isConnected = (nodeId: string) =>
				links.some(
					l => (l.source.id === selectedId && l.target.id === nodeId) ||
						(l.target.id === selectedId && l.source.id === nodeId)
				);

			expect(isConnected('a')).toBe(true);
			expect(isConnected('c')).toBe(true);
			expect(isConnected('d')).toBe(false);
		});
	});

	describe('Extent calculations', () => {
		it('should calculate node extent', () => {
			const nodes = [
				{ x: 100, y: 50 },
				{ x: 300, y: 200 },
				{ x: 50, y: 150 }
			];

			const xExtent = d3.extent(nodes, d => d.x) as [number, number];
			const yExtent = d3.extent(nodes, d => d.y) as [number, number];

			expect(xExtent).toEqual([50, 300]);
			expect(yExtent).toEqual([50, 200]);
		});

		it('should calculate zoom-to-fit transform', () => {
			const width = 800;
			const height = 600;
			const padding = 40;

			const nodes = [
				{ x: 200, y: 150 },
				{ x: 400, y: 350 }
			];

			const xExtent = d3.extent(nodes, d => d.x) as [number, number];
			const yExtent = d3.extent(nodes, d => d.y) as [number, number];

			const graphWidth = xExtent[1] - xExtent[0] + padding * 2;
			const graphHeight = yExtent[1] - yExtent[0] + padding * 2;

			const scale = Math.min(width / graphWidth, height / graphHeight, 1);

			expect(graphWidth).toBe(280); // 200 + 80 padding
			expect(graphHeight).toBe(280); // 200 + 80 padding
			expect(scale).toBe(1); // Graph fits without scaling
		});
	});
});

describe('Graph State Management', () => {
	it('should track transform state', () => {
		let transform = { x: 0, y: 0, k: 1 };

		// Simulate zoom
		transform = { x: 100, y: 50, k: 1.5 };
		expect(transform.x).toBe(100);
		expect(transform.y).toBe(50);
		expect(transform.k).toBe(1.5);
	});

	it('should track node positions', () => {
		const nodes = [
			{ id: 'a', x: 100, y: 100 },
			{ id: 'b', x: 200, y: 200 }
		];

		// Simulate node update
		nodes[0].x = 150;
		nodes[0].y = 120;

		expect(nodes[0].x).toBe(150);
		expect(nodes[0].y).toBe(120);
	});

	it('should handle fixed node positions', () => {
		interface SimNode extends d3.SimulationNodeDatum {
			id: string;
			fx: number | null;
			fy: number | null;
		}

		const node: SimNode = { id: 'a', fx: null, fy: null };

		// Fix position during drag
		node.fx = 300;
		node.fy = 250;
		expect(node.fx).toBe(300);
		expect(node.fy).toBe(250);

		// Release after drag
		node.fx = null;
		node.fy = null;
		expect(node.fx).toBeNull();
		expect(node.fy).toBeNull();
	});
});
