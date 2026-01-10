<script lang="ts">
	/**
	 * Animated Force Graph Component
	 *
	 * TASK-069: Add Graph Animations
	 *
	 * Enhanced force graph with smooth entrance/exit animations,
	 * hover effects, and transition handling.
	 */
	import { browser } from '$app/environment';
	import { onMount, onDestroy, tick } from 'svelte';
	import * as d3 from 'd3';
	import { cn } from '$lib/utils';
	import type { ForceNode, ForceLink, ForceGraphData, AnimationConfig } from './types';
	import { DEFAULT_COLORS } from './types';

	interface AnimatedNode extends ForceNode {
		entering?: boolean;
		exiting?: boolean;
		animationProgress?: number;
	}

	interface Props {
		data: ForceGraphData;
		width?: number;
		height?: number;
		nodeRadius?: number;
		linkDistance?: number;
		chargeStrength?: number;
		animationDuration?: number;
		staggerDelay?: number;
		entranceAnimation?: 'fade' | 'scale' | 'spring' | 'none';
		hoverScale?: number;
		glowOnHover?: boolean;
		onNodeClick?: (node: ForceNode) => void;
		onNodeHover?: (node: ForceNode | null) => void;
		selectedNodeId?: string | null;
		highlightedNodeIds?: string[];
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
		animationDuration = 300,
		staggerDelay = 50,
		entranceAnimation = 'scale',
		hoverScale = 1.15,
		glowOnHover = true,
		onNodeClick,
		onNodeHover,
		selectedNodeId = null,
		highlightedNodeIds = [],
		showLabels = true,
		class: className = ''
	}: Props = $props();

	let svgRef: SVGSVGElement | null = $state(null);
	let mounted = $state(false);
	let simulation: d3.Simulation<d3.SimulationNodeDatum, d3.SimulationLinkDatum<d3.SimulationNodeDatum>> | null = null;
	let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;

	// Animation state
	let nodes: (AnimatedNode & d3.SimulationNodeDatum)[] = $state([]);
	let links: (ForceLink & { source: AnimatedNode & d3.SimulationNodeDatum; target: AnimatedNode & d3.SimulationNodeDatum })[] = $state([]);
	let transform = $state({ x: 0, y: 0, k: 1 });
	let hoveredNodeId: string | null = $state(null);
	let nodeAnimationStates = $state<Map<string, { opacity: number; scale: number }>>(new Map());

	// Previous data for diffing
	let previousNodeIds: Set<string> = new Set();

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

	function isHovered(nodeId: string): boolean {
		return hoveredNodeId === nodeId;
	}

	function getNodeOpacity(nodeId: string): number {
		const state = nodeAnimationStates.get(nodeId);
		return state?.opacity ?? 1;
	}

	function getNodeScale(nodeId: string): number {
		const state = nodeAnimationStates.get(nodeId);
		const baseScale = state?.scale ?? 1;

		if (isHovered(nodeId)) {
			return baseScale * hoverScale;
		}
		return baseScale;
	}

	function animateNodeEntrance(node: AnimatedNode, index: number) {
		const nodeId = node.id;
		const delay = index * staggerDelay;

		// Set initial state
		nodeAnimationStates.set(nodeId, { opacity: 0, scale: 0.3 });
		nodeAnimationStates = new Map(nodeAnimationStates);

		// Animate
		setTimeout(() => {
			const startTime = performance.now();
			const animate = (currentTime: number) => {
				const elapsed = currentTime - startTime;
				let progress = Math.min(elapsed / animationDuration, 1);

				// Apply easing
				progress = d3.easeCubicOut(progress);

				const opacity = progress;
				let scale = 0.3 + 0.7 * progress;

				// Spring overshoot for 'spring' animation
				if (entranceAnimation === 'spring' && progress > 0.6) {
					const springProgress = (progress - 0.6) / 0.4;
					const overshoot = Math.sin(springProgress * Math.PI) * 0.1;
					scale = scale + overshoot;
				}

				nodeAnimationStates.set(nodeId, { opacity, scale });
				nodeAnimationStates = new Map(nodeAnimationStates);

				if (progress < 1) {
					requestAnimationFrame(animate);
				}
			};

			requestAnimationFrame(animate);
		}, delay);
	}

	function animateNodeExit(node: AnimatedNode): Promise<void> {
		return new Promise((resolve) => {
			const nodeId = node.id;
			const startState = nodeAnimationStates.get(nodeId) ?? { opacity: 1, scale: 1 };
			const startTime = performance.now();

			const animate = (currentTime: number) => {
				const elapsed = currentTime - startTime;
				let progress = Math.min(elapsed / (animationDuration * 0.5), 1);

				progress = d3.easeCubicIn(progress);

				const opacity = startState.opacity * (1 - progress);
				const scale = startState.scale * (1 - progress * 0.7);

				nodeAnimationStates.set(nodeId, { opacity, scale });
				nodeAnimationStates = new Map(nodeAnimationStates);

				if (progress < 1) {
					requestAnimationFrame(animate);
				} else {
					nodeAnimationStates.delete(nodeId);
					nodeAnimationStates = new Map(nodeAnimationStates);
					resolve();
				}
			};

			requestAnimationFrame(animate);
		});
	}

	async function initializeGraph() {
		if (!svgRef || !browser) return;

		// Clean up existing simulation
		if (simulation) {
			simulation.stop();
		}

		// Find new and removed nodes
		const currentNodeIds = new Set(data.nodes.map(n => n.id));
		const newNodeIds = [...currentNodeIds].filter(id => !previousNodeIds.has(id));
		const removedNodeIds = [...previousNodeIds].filter(id => !currentNodeIds.has(id));

		// Animate out removed nodes
		const exitPromises = removedNodeIds.map(id => {
			const node = nodes.find(n => n.id === id);
			if (node) {
				return animateNodeExit(node);
			}
			return Promise.resolve();
		});

		await Promise.all(exitPromises);

		// Create node map
		const nodeMap = new Map<string, AnimatedNode & d3.SimulationNodeDatum>();
		const simulationNodes: (AnimatedNode & d3.SimulationNodeDatum)[] = data.nodes.map((node, i) => {
			const isNew = newNodeIds.includes(node.id);
			const existingNode = nodes.find(n => n.id === node.id);

			const simNode = {
				...node,
				x: existingNode?.x ?? width / 2 + (Math.random() - 0.5) * 100,
				y: existingNode?.y ?? height / 2 + (Math.random() - 0.5) * 100,
				entering: isNew,
				index: i
			};
			nodeMap.set(node.id, simNode);
			return simNode;
		});

		// Create links
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
			.force('link', d3.forceLink(simulationLinks).id((d: any) => d.id).distance(linkDistance))
			.force('charge', d3.forceManyBody().strength(chargeStrength))
			.force('center', d3.forceCenter(width / 2, height / 2).strength(0.1))
			.force('collision', d3.forceCollide().radius(nodeRadius + 10))
			.alphaDecay(0.02)
			.on('tick', () => {
				nodes = [...simulationNodes];
				links = [...simulationLinks] as any;
			});

		// Set up zoom
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

		// Set up drag
		const drag = d3.drag<SVGGElement, AnimatedNode & d3.SimulationNodeDatum>()
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

		await tick();

		svg.selectAll<SVGGElement, AnimatedNode & d3.SimulationNodeDatum>('.node-group')
			.data(simulationNodes)
			.call(drag);

		// Animate new nodes
		if (entranceAnimation !== 'none') {
			simulationNodes.forEach((node, i) => {
				if (node.entering) {
					animateNodeEntrance(node, newNodeIds.indexOf(node.id));
				} else if (!nodeAnimationStates.has(node.id)) {
					nodeAnimationStates.set(node.id, { opacity: 1, scale: 1 });
				}
			});
			nodeAnimationStates = new Map(nodeAnimationStates);
		}

		previousNodeIds = currentNodeIds;
	}

	function handleNodeClick(event: MouseEvent, node: ForceNode) {
		event.stopPropagation();
		onNodeClick?.(node);
	}

	function handleNodeEnter(node: ForceNode) {
		hoveredNodeId = node.id;
		onNodeHover?.(node);
	}

	function handleNodeLeave() {
		hoveredNodeId = null;
		onNodeHover?.(null);
	}

	function resetZoom() {
		if (!svgRef || !zoomBehavior) return;
		d3.select(svgRef).transition().duration(500).call(
			zoomBehavior.transform,
			d3.zoomIdentity
		);
	}

	function zoomToFit() {
		if (!svgRef || !zoomBehavior || nodes.length === 0) return;

		const padding = 60;
		const xExtent = d3.extent(nodes, d => d.x) as [number, number];
		const yExtent = d3.extent(nodes, d => d.y) as [number, number];

		const graphWidth = xExtent[1] - xExtent[0] + padding * 2;
		const graphHeight = yExtent[1] - yExtent[0] + padding * 2;

		const scale = Math.min(width / graphWidth, height / graphHeight, 1);
		const translateX = width / 2 - (xExtent[0] + xExtent[1]) / 2 * scale;
		const translateY = height / 2 - (yExtent[0] + yExtent[1]) / 2 * scale;

		d3.select(svgRef).transition().duration(750).ease(d3.easeCubicOut).call(
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

	$effect(() => {
		if (browser && mounted && data.nodes.length > 0) {
			initializeGraph();
		}
	});

	export { resetZoom, zoomToFit };
</script>

<div class={cn('animated-force-graph-container relative', className)}>
	{#if browser}
		<svg
			bind:this={svgRef}
			{width}
			{height}
			class="animated-force-graph"
			role="img"
			aria-label="Animated force-directed graph visualization"
		>
			<defs>
				<!-- Glow filter -->
				<filter id="node-glow" x="-100%" y="-100%" width="300%" height="300%">
					<feGaussianBlur stdDeviation="4" result="blur" />
					<feMerge>
						<feMergeNode in="blur" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>

				<!-- Selection glow -->
				<filter id="selection-glow" x="-50%" y="-50%" width="200%" height="200%">
					<feGaussianBlur stdDeviation="3" result="coloredBlur" />
					<feMerge>
						<feMergeNode in="coloredBlur" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>

				<!-- Gradient for links -->
				<linearGradient id="link-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
					<stop offset="0%" stop-color="#94a3b8" stop-opacity="0.3" />
					<stop offset="50%" stop-color="#94a3b8" stop-opacity="0.6" />
					<stop offset="100%" stop-color="#94a3b8" stop-opacity="0.3" />
				</linearGradient>
			</defs>

			<g class="graph-content" transform="translate({transform.x}, {transform.y}) scale({transform.k})">
				<!-- Links with animations -->
				<g class="links">
					{#each links as link}
						{@const sourceX = typeof link.source === 'object' ? link.source.x ?? 0 : 0}
						{@const sourceY = typeof link.source === 'object' ? link.source.y ?? 0 : 0}
						{@const targetX = typeof link.target === 'object' ? link.target.x ?? 0 : 0}
						{@const targetY = typeof link.target === 'object' ? link.target.y ?? 0 : 0}
						{@const sourceId = typeof link.source === 'object' ? link.source.id : ''}
						{@const targetId = typeof link.target === 'object' ? link.target.id : ''}
						{@const sourceOpacity = getNodeOpacity(sourceId)}
						{@const targetOpacity = getNodeOpacity(targetId)}
						{@const linkOpacity = Math.min(sourceOpacity, targetOpacity) * 0.6}
						{@const isActiveLink = selectedNodeId && (sourceId === selectedNodeId || targetId === selectedNodeId)}
						<line
							x1={sourceX}
							y1={sourceY}
							x2={targetX}
							y2={targetY}
							stroke={isActiveLink ? '#3b82f6' : (link.color ?? '#94a3b8')}
							stroke-width={Math.sqrt(link.value ?? 1) * (isActiveLink ? 2 : 1)}
							stroke-opacity={linkOpacity}
							class="link-line"
							class:active={isActiveLink}
						/>
					{/each}
				</g>

				<!-- Nodes with animations -->
				<g class="nodes">
					{#each nodes as node, i}
						{@const x = node.x ?? 0}
						{@const y = node.y ?? 0}
						{@const radius = node.radius ?? nodeRadius}
						{@const color = getNodeColor(node, i)}
						{@const selected = isSelected(node.id)}
						{@const highlighted = isHighlighted(node.id)}
						{@const hovered = isHovered(node.id)}
						{@const opacity = getNodeOpacity(node.id)}
						{@const scale = getNodeScale(node.id)}
						{@const dimmed = selectedNodeId && !selected && !highlighted && !links.some(l =>
							(typeof l.source === 'object' && l.source.id === selectedNodeId && typeof l.target === 'object' && l.target.id === node.id) ||
							(typeof l.target === 'object' && l.target.id === selectedNodeId && typeof l.source === 'object' && l.source.id === node.id)
						)}
						<g
							class="node-group"
							class:selected
							class:highlighted
							class:hovered
							class:dimmed
							transform="translate({x}, {y}) scale({scale})"
							style="opacity: {opacity};"
							role="button"
							tabindex="0"
							aria-label={node.label ?? node.id}
							onclick={(e) => handleNodeClick(e, node)}
							onmouseenter={() => handleNodeEnter(node)}
							onmouseleave={() => handleNodeLeave()}
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
									filter="url(#selection-glow)"
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

							<!-- Hover glow -->
							{#if hovered && glowOnHover}
								<circle
									r={radius + 2}
									fill={color}
									filter="url(#node-glow)"
									opacity="0.3"
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
	.animated-force-graph {
		background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
		border-radius: 0.5rem;
		border: 1px solid #e2e8f0;
		cursor: grab;
	}

	.animated-force-graph:active {
		cursor: grabbing;
	}

	.node-group {
		outline: none;
		cursor: pointer;
		transition: transform 0.15s ease-out;
	}

	.node-circle {
		transition: filter 0.15s ease, fill 0.15s ease;
	}

	.node-group:hover .node-circle {
		filter: brightness(1.1) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
	}

	.node-group:focus .node-circle {
		filter: brightness(1.1);
	}

	.node-group.selected .node-circle {
		filter: brightness(1.05);
	}

	.node-group.dimmed {
		opacity: 0.35 !important;
	}

	.node-group.dimmed .node-circle {
		filter: saturate(0.4) brightness(0.9);
	}

	.node-label {
		pointer-events: none;
		user-select: none;
		text-shadow: 0 1px 3px rgba(255, 255, 255, 0.9);
		transition: opacity 0.15s ease;
	}

	.link-line {
		transition: stroke-width 0.2s ease, stroke-opacity 0.2s ease, stroke 0.2s ease;
	}

	.link-line:hover {
		stroke-opacity: 1;
	}

	.link-line.active {
		stroke-dasharray: none;
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
			opacity: 0.5;
			stroke-width: 5;
		}
	}

	@keyframes highlight-pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	/* Smooth entrance animation fallback */
	.node-group {
		animation: nodeEnter 0.3s ease-out forwards;
	}

	@keyframes nodeEnter {
		from {
			transform: scale(0.5);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}
</style>
