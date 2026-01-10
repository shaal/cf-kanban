<script lang="ts">
	/**
	 * ForceGraph Component
	 *
	 * TASK-068: Implement Force-Directed Graph
	 *
	 * A D3-powered force graph component for visualizing nodes and links
	 * with interactive features like dragging, zooming, and node selection.
	 */
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import * as d3 from 'd3';
	import { cn } from '$lib/utils';
	import type { ForceNode, ForceLink, ForceGraphData } from './types';
	import { DEFAULT_COLORS } from './types';

	interface Props {
		data: ForceGraphData;
		width?: number;
		height?: number;
		nodeRadius?: number;
		linkDistance?: number;
		chargeStrength?: number;
		centerStrength?: number;
		collisionRadius?: number;
		onNodeClick?: (node: ForceNode) => void;
		onNodeHover?: (node: ForceNode | null) => void;
		onLinkClick?: (link: ForceLink) => void;
		selectedNodeId?: string | null;
		highlightedNodeIds?: string[];
		animate?: boolean;
		showLabels?: boolean;
		class?: string;
	}

	let {
		data,
		width = 800,
		height = 600,
		nodeRadius = 20,
		linkDistance = 100,
		chargeStrength = -400,
		centerStrength = 0.1,
		collisionRadius = 30,
		onNodeClick,
		onNodeHover,
		onLinkClick,
		selectedNodeId = null,
		highlightedNodeIds = [],
		animate = true,
		showLabels = true,
		class: className = ''
	}: Props = $props();

	let svgRef: SVGSVGElement | null = $state(null);
	let mounted = $state(false);

	// D3 simulation and selections
	let simulation: d3.Simulation<d3.SimulationNodeDatum, d3.SimulationLinkDatum<d3.SimulationNodeDatum>> | null = null;
	let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;

	// Internal state for rendering
	let nodes: (ForceNode & d3.SimulationNodeDatum)[] = $state([]);
	let links: (ForceLink & { source: ForceNode & d3.SimulationNodeDatum; target: ForceNode & d3.SimulationNodeDatum })[] = $state([]);
	let transform = $state({ x: 0, y: 0, k: 1 });

	// Get unique groups for color mapping
	const groups = $derived(() => {
		const uniqueGroups = [...new Set(data.nodes.map(n => n.group).filter(Boolean))];
		return uniqueGroups as string[];
	});

	function getNodeColor(node: ForceNode, index: number): string {
		if (node.color) return node.color;
		if (node.group) {
			const groupIndex = groups.indexOf(node.group);
			return DEFAULT_COLORS[groupIndex % DEFAULT_COLORS.length];
		}
		return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
	}

	function isHighlighted(nodeId: string): boolean {
		return highlightedNodeIds.includes(nodeId);
	}

	function isSelected(nodeId: string): boolean {
		return selectedNodeId === nodeId;
	}

	function isConnectedToSelected(node: ForceNode): boolean {
		if (!selectedNodeId) return false;
		return links.some(
			l =>
				(typeof l.source === 'object' && l.source.id === selectedNodeId && typeof l.target === 'object' && l.target.id === node.id) ||
				(typeof l.target === 'object' && l.target.id === selectedNodeId && typeof l.source === 'object' && l.source.id === node.id)
		);
	}

	function initializeGraph() {
		if (!svgRef || !browser) return;

		// Clean up existing simulation
		if (simulation) {
			simulation.stop();
		}

		// Create node copies with simulation properties
		const nodeMap = new Map<string, ForceNode & d3.SimulationNodeDatum>();
		const simulationNodes: (ForceNode & d3.SimulationNodeDatum)[] = data.nodes.map((node, i) => {
			const simNode = {
				...node,
				x: node.x ?? width / 2 + (Math.random() - 0.5) * 100,
				y: node.y ?? height / 2 + (Math.random() - 0.5) * 100,
				index: i
			};
			nodeMap.set(node.id, simNode);
			return simNode;
		});

		// Create link copies with node references
		const simulationLinks = data.links.map(link => {
			const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
			const targetId = typeof link.target === 'string' ? link.target : link.target.id;
			return {
				...link,
				source: nodeMap.get(sourceId)!,
				target: nodeMap.get(targetId)!
			};
		}).filter(l => l.source && l.target);

		// Initialize simulation
		simulation = d3.forceSimulation(simulationNodes)
			.force('link', d3.forceLink(simulationLinks)
				.id((d: any) => d.id)
				.distance(linkDistance)
			)
			.force('charge', d3.forceManyBody()
				.strength(chargeStrength)
			)
			.force('center', d3.forceCenter(width / 2, height / 2)
				.strength(centerStrength)
			)
			.force('collision', d3.forceCollide()
				.radius(collisionRadius)
			)
			.alphaDecay(0.02)
			.on('tick', () => {
				nodes = [...simulationNodes];
				links = [...simulationLinks] as any;
			});

		// Set up zoom behavior
		const svg = d3.select(svgRef);
		zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.1, 4])
			.on('zoom', (event) => {
				transform = {
					x: event.transform.x,
					y: event.transform.y,
					k: event.transform.k
				};
			});

		svg.call(zoomBehavior);

		// Set up drag behavior
		const drag = d3.drag<SVGGElement, ForceNode & d3.SimulationNodeDatum>()
			.on('start', (event, d) => {
				if (!event.active) simulation?.alphaTarget(0.3).restart();
				d.fx = d.x;
				d.fy = d.y;
			})
			.on('drag', (event, d) => {
				d.fx = event.x;
				d.fy = event.y;
			})
			.on('end', (event, d) => {
				if (!event.active) simulation?.alphaTarget(0);
				d.fx = null;
				d.fy = null;
			});

		// Apply drag behavior to node groups (will be called after render)
		requestAnimationFrame(() => {
			svg.selectAll<SVGGElement, ForceNode & d3.SimulationNodeDatum>('.node-group')
				.data(simulationNodes)
				.call(drag);
		});

		// Initial node positions with animation
		if (animate) {
			simulation.alpha(1).restart();
		}
	}

	function handleNodeClick(event: MouseEvent, node: ForceNode) {
		event.stopPropagation();
		onNodeClick?.(node);
	}

	function handleLinkClick(event: MouseEvent, link: ForceLink) {
		event.stopPropagation();
		onLinkClick?.(link);
	}

	function resetZoom() {
		if (!svgRef || !zoomBehavior) return;
		const svg = d3.select(svgRef);
		svg.transition().duration(750).call(
			zoomBehavior.transform,
			d3.zoomIdentity
		);
	}

	function zoomToFit() {
		if (!svgRef || !zoomBehavior || nodes.length === 0) return;

		const padding = 40;
		const xExtent = d3.extent(nodes, d => d.x) as [number, number];
		const yExtent = d3.extent(nodes, d => d.y) as [number, number];

		const graphWidth = xExtent[1] - xExtent[0] + padding * 2;
		const graphHeight = yExtent[1] - yExtent[0] + padding * 2;

		const scale = Math.min(width / graphWidth, height / graphHeight, 1);
		const translateX = width / 2 - (xExtent[0] + xExtent[1]) / 2 * scale;
		const translateY = height / 2 - (yExtent[0] + yExtent[1]) / 2 * scale;

		const svg = d3.select(svgRef);
		svg.transition().duration(750).call(
			zoomBehavior.transform,
			d3.zoomIdentity.translate(translateX, translateY).scale(scale)
		);
	}

	onMount(() => {
		mounted = true;
		if (data.nodes.length > 0) {
			initializeGraph();
		}
	});

	onDestroy(() => {
		if (simulation) {
			simulation.stop();
			simulation = null;
		}
	});

	// Re-initialize when data changes
	$effect(() => {
		if (browser && mounted && data.nodes.length > 0) {
			initializeGraph();
		}
	});

	// Export zoom controls for parent components
	export { resetZoom, zoomToFit };
</script>

<div class={cn('force-graph-container relative', className)}>
	{#if browser}
		<svg
			bind:this={svgRef}
			{width}
			{height}
			class="force-graph"
			role="img"
			aria-label="Force-directed graph visualization"
		>
			<defs>
				<!-- Arrow marker for directed graphs -->
				<marker
					id="arrowhead"
					viewBox="0 -5 10 10"
					refX="25"
					refY="0"
					markerWidth="6"
					markerHeight="6"
					orient="auto"
				>
					<path d="M0,-5L10,0L0,5" fill="#94a3b8" />
				</marker>

				<!-- Glow filter for selected nodes -->
				<filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
					<feGaussianBlur stdDeviation="3" result="coloredBlur" />
					<feMerge>
						<feMergeNode in="coloredBlur" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			</defs>

			<g class="graph-content" transform="translate({transform.x}, {transform.y}) scale({transform.k})">
				<!-- Links -->
				<g class="links">
					{#each links as link}
						{@const sourceX = typeof link.source === 'object' ? link.source.x ?? 0 : 0}
						{@const sourceY = typeof link.source === 'object' ? link.source.y ?? 0 : 0}
						{@const targetX = typeof link.target === 'object' ? link.target.x ?? 0 : 0}
						{@const targetY = typeof link.target === 'object' ? link.target.y ?? 0 : 0}
						{@const isSelectedLink = selectedNodeId &&
							(typeof link.source === 'object' && link.source.id === selectedNodeId ||
							 typeof link.target === 'object' && link.target.id === selectedNodeId)}
						<g class="link-group">
							<line
								x1={sourceX}
								y1={sourceY}
								x2={targetX}
								y2={targetY}
								stroke={isSelectedLink ? '#3b82f6' : (link.color ?? '#94a3b8')}
								stroke-width={Math.sqrt(link.value ?? 1) * (isSelectedLink ? 2 : 1)}
								stroke-opacity={isSelectedLink ? 1 : 0.6}
								class="link-line"
								role="button"
								tabindex="-1"
								onclick={(e) => handleLinkClick(e, link)}
							/>
							{#if link.label}
								<text
									x={(sourceX + targetX) / 2}
									y={(sourceY + targetY) / 2}
									class="link-label"
									text-anchor="middle"
									dy="-5"
									fill="#6b7280"
									font-size="10"
								>
									{link.label}
								</text>
							{/if}
						</g>
					{/each}
				</g>

				<!-- Nodes -->
				<g class="nodes">
					{#each nodes as node, i}
						{@const x = node.x ?? 0}
						{@const y = node.y ?? 0}
						{@const radius = node.radius ?? nodeRadius}
						{@const color = getNodeColor(node, i)}
						{@const selected = isSelected(node.id)}
						{@const highlighted = isHighlighted(node.id)}
						{@const connected = isConnectedToSelected(node)}
						{@const dimmed = selectedNodeId && !selected && !connected && !highlighted}
						<g
							class="node-group"
							class:selected
							class:highlighted
							class:dimmed
							transform="translate({x}, {y})"
							role="button"
							tabindex="0"
							aria-label={node.label ?? node.id}
							onclick={(e) => handleNodeClick(e, node)}
							onmouseenter={() => onNodeHover?.(node)}
							onmouseleave={() => onNodeHover?.(null)}
							onkeydown={(e) => e.key === 'Enter' && onNodeClick?.(node)}
						>
							<!-- Selection ring -->
							{#if selected}
								<circle
									r={radius + 6}
									fill="none"
									stroke="#3b82f6"
									stroke-width="3"
									class="selection-ring"
									filter="url(#glow)"
								/>
							{/if}

							<!-- Highlight ring -->
							{#if highlighted && !selected}
								<circle
									r={radius + 4}
									fill="none"
									stroke="#fbbf24"
									stroke-width="2"
									class="highlight-ring"
								/>
							{/if}

							<!-- Node shadow -->
							<circle
								r={radius}
								fill="rgba(0,0,0,0.1)"
								transform="translate(2, 2)"
							/>

							<!-- Node circle -->
							<circle
								r={radius}
								fill={color}
								stroke="#fff"
								stroke-width="2.5"
								class="node-circle"
							/>

							<!-- Node label -->
							{#if showLabels && (node.label || node.id)}
								<text
									y={radius + 16}
									text-anchor="middle"
									class="node-label"
									fill="#374151"
									font-size="12"
									font-weight="500"
								>
									{node.label ?? node.id}
								</text>
							{/if}
						</g>
					{/each}
				</g>
			</g>
		</svg>
	{:else}
		<div
			class="graph-placeholder bg-gray-100 animate-pulse rounded-lg"
			style="width: {width}px; height: {height}px;"
		></div>
	{/if}
</div>

<style>
	.force-graph {
		background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
		border-radius: 0.5rem;
		border: 1px solid #e2e8f0;
		cursor: grab;
	}

	.force-graph:active {
		cursor: grabbing;
	}

	.node-group {
		outline: none;
		cursor: pointer;
	}

	.node-circle {
		transition: filter 0.15s ease, transform 0.15s ease;
	}

	.node-group:hover .node-circle {
		filter: brightness(1.1) drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
	}

	.node-group:focus .node-circle {
		filter: brightness(1.1);
	}

	.node-group.selected .node-circle {
		filter: brightness(1.05);
	}

	.node-group.dimmed {
		opacity: 0.4;
	}

	.node-group.dimmed .node-circle {
		filter: saturate(0.5);
	}

	.node-label {
		pointer-events: none;
		user-select: none;
		text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
	}

	.link-line {
		cursor: pointer;
		transition: stroke-width 0.15s ease, stroke-opacity 0.15s ease;
	}

	.link-line:hover {
		stroke-opacity: 1;
	}

	.link-label {
		pointer-events: none;
		user-select: none;
	}

	.selection-ring {
		animation: pulse 2s ease-in-out infinite;
	}

	.highlight-ring {
		animation: highlight-pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
			stroke-width: 3;
		}
		50% {
			opacity: 0.6;
			stroke-width: 4;
		}
	}

	@keyframes highlight-pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}
</style>
