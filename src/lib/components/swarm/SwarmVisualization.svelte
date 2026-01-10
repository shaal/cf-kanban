<script lang="ts">
	/**
	 * Swarm Visualization Component
	 * GAP-3.3.2: Swarm Visualization
	 *
	 * Real-time D3.js force-directed graph showing active swarm agents,
	 * their connections, status, and communication flows.
	 */
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { cn } from '$lib/utils';
	import * as d3 from 'd3';
	import * as Icons from 'lucide-svelte';
	import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3';
	import type { SwarmNode, SwarmLink, SwarmGraphData, FlowAnimation } from './types';
	import { STATUS_COLORS, ROLE_COLORS, DEFAULT_SIMULATION_CONFIG } from './types';
	import { activeSwarm, flowAnimations, initializeMockSwarm } from '$lib/stores/swarm';
	import SwarmLegend from './SwarmLegend.svelte';
	import SwarmTooltip from './SwarmTooltip.svelte';

	interface Props {
		swarmId?: string;
		projectId: string;
		width?: number;
		height?: number;
		showControls?: boolean;
		showLegend?: boolean;
		enableDrag?: boolean;
		enableZoom?: boolean;
		onAgentClick?: (agent: SwarmNode) => void;
		class?: string;
	}

	let {
		swarmId,
		projectId,
		width: propWidth,
		height: propHeight = 500,
		showControls = true,
		showLegend = true,
		enableDrag = true,
		enableZoom = true,
		onAgentClick,
		class: className = ''
	}: Props = $props();

	// Element refs
	let containerEl: HTMLDivElement | null = $state(null);
	let svgEl: SVGSVGElement | null = $state(null);

	// Dimensions
	let dimensions = $state({ width: propWidth || 800, height: propHeight });

	// Simulation state
	let simulation: d3.Simulation<SwarmNode & SimulationNodeDatum, SwarmLink & SimulationLinkDatum<SwarmNode>> | null = null;
	let nodes: (SwarmNode & SimulationNodeDatum)[] = $state([]);
	let links: (SwarmLink & SimulationLinkDatum<SwarmNode>)[] = $state([]);

	// Interaction state
	let hoveredNode: SwarmNode | null = $state(null);
	let tooltipPosition = $state({ x: 0, y: 0 });
	let transform = $state({ x: 0, y: 0, k: 1 });

	// Node radius based on role
	function getNodeRadius(node: SwarmNode): number {
		switch (node.role) {
			case 'queen':
				return 32;
			case 'coordinator':
				return 28;
			case 'specialist':
				return 22;
			case 'scout':
				return 18;
			default:
				return 20;
		}
	}

	// Get link color based on type
	function getLinkColor(link: SwarmLink): string {
		if (link.active) return '#3b82f6';
		switch (link.communicationType) {
			case 'command':
				return '#6366f1';
			case 'consensus':
				return '#f59e0b';
			case 'broadcast':
				return '#10b981';
			default:
				return '#d1d5db';
		}
	}

	// Initialize simulation when swarm data changes
	$effect(() => {
		if (!browser || !svgEl) return;
		const swarm = $activeSwarm;
		if (!swarm) return;

		// Deep clone nodes and links for D3 mutation
		nodes = swarm.nodes.map(n => ({ ...n }));
		links = swarm.links.map(l => ({
			...l,
			source: l.source,
			target: l.target
		}));

		// Create or update simulation
		if (simulation) {
			simulation.nodes(nodes);
			(simulation.force('link') as d3.ForceLink<SwarmNode, SwarmLink>)?.links(links);
			simulation.alpha(0.5).restart();
		} else {
			createSimulation();
		}
	});

	// Create D3 force simulation
	function createSimulation() {
		if (!browser) return;

		const config = DEFAULT_SIMULATION_CONFIG;

		simulation = d3.forceSimulation<SwarmNode & SimulationNodeDatum>(nodes)
			.force('link', d3.forceLink<SwarmNode, SwarmLink>(links)
				.id(d => d.id)
				.distance(config.linkDistance)
			)
			.force('charge', d3.forceManyBody()
				.strength(config.chargeStrength)
			)
			.force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2)
				.strength(config.centerStrength)
			)
			.force('collision', d3.forceCollide<SwarmNode>()
				.radius(d => getNodeRadius(d) + 10)
			)
			.alphaDecay(config.alphaDecay)
			.velocityDecay(config.velocityDecay)
			.on('tick', () => {
				// Trigger reactivity
				nodes = [...nodes];
				links = [...links];
			});
	}

	// Handle node drag
	function handleDragStart(event: d3.D3DragEvent<SVGGElement, SwarmNode, unknown>, d: SwarmNode & SimulationNodeDatum) {
		if (!simulation || !enableDrag) return;
		if (!event.active) simulation.alphaTarget(0.3).restart();
		d.fx = d.x;
		d.fy = d.y;
	}

	function handleDrag(event: d3.D3DragEvent<SVGGElement, SwarmNode, unknown>, d: SwarmNode & SimulationNodeDatum) {
		if (!enableDrag) return;
		d.fx = event.x;
		d.fy = event.y;
	}

	function handleDragEnd(event: d3.D3DragEvent<SVGGElement, SwarmNode, unknown>, d: SwarmNode & SimulationNodeDatum) {
		if (!simulation || !enableDrag) return;
		if (!event.active) simulation.alphaTarget(0);
		d.fx = null;
		d.fy = null;
	}

	// Handle zoom
	function setupZoom() {
		if (!browser || !svgEl || !enableZoom) return;

		const svg = d3.select(svgEl);
		const zoom = d3.zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.3, 3])
			.on('zoom', (event) => {
				transform = event.transform;
			});

		svg.call(zoom);
	}

	// Handle node hover
	function handleNodeMouseEnter(event: MouseEvent, node: SwarmNode) {
		hoveredNode = node;
		const rect = containerEl?.getBoundingClientRect();
		if (rect) {
			tooltipPosition = {
				x: event.clientX - rect.left,
				y: event.clientY - rect.top
			};
		}
	}

	function handleNodeMouseLeave() {
		hoveredNode = null;
	}

	// Reset zoom
	function resetZoom() {
		if (!svgEl) return;
		const svg = d3.select(svgEl);
		svg.transition().duration(300).call(
			d3.zoom<SVGSVGElement, unknown>().transform,
			d3.zoomIdentity
		);
	}

	// Zoom to fit
	function zoomToFit() {
		if (!svgEl || nodes.length === 0) return;

		const padding = 50;
		const xExtent = d3.extent(nodes, d => d.x) as [number, number];
		const yExtent = d3.extent(nodes, d => d.y) as [number, number];

		const graphWidth = (xExtent[1] ?? 0) - (xExtent[0] ?? 0);
		const graphHeight = (yExtent[1] ?? 0) - (yExtent[0] ?? 0);

		const scale = Math.min(
			(dimensions.width - padding * 2) / graphWidth,
			(dimensions.height - padding * 2) / graphHeight,
			1.5
		);

		const centerX = ((xExtent[0] ?? 0) + (xExtent[1] ?? 0)) / 2;
		const centerY = ((yExtent[0] ?? 0) + (yExtent[1] ?? 0)) / 2;

		const translateX = dimensions.width / 2 - centerX * scale;
		const translateY = dimensions.height / 2 - centerY * scale;

		const svg = d3.select(svgEl);
		svg.transition().duration(500).call(
			d3.zoom<SVGSVGElement, unknown>().transform,
			d3.zoomIdentity.translate(translateX, translateY).scale(scale)
		);
	}

	// Setup resize observer
	onMount(() => {
		if (!browser || !containerEl) return;

		// Initialize mock data if no swarm active
		if (!$activeSwarm) {
			initializeMockSwarm(projectId);
		}

		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				if (width > 0 && height > 0) {
					dimensions = { width, height: Math.max(height, propHeight) };
					if (simulation) {
						simulation.force('center', d3.forceCenter(width / 2, dimensions.height / 2));
						simulation.alpha(0.3).restart();
					}
				}
			}
		});

		resizeObserver.observe(containerEl);
		setupZoom();

		return () => {
			resizeObserver.disconnect();
			simulation?.stop();
		};
	});

	onDestroy(() => {
		simulation?.stop();
	});

	// Get source/target coordinates for links
	function getSourceX(link: SwarmLink & SimulationLinkDatum<SwarmNode>): number {
		return typeof link.source === 'object' ? (link.source as SwarmNode & SimulationNodeDatum).x ?? 0 : 0;
	}
	function getSourceY(link: SwarmLink & SimulationLinkDatum<SwarmNode>): number {
		return typeof link.source === 'object' ? (link.source as SwarmNode & SimulationNodeDatum).y ?? 0 : 0;
	}
	function getTargetX(link: SwarmLink & SimulationLinkDatum<SwarmNode>): number {
		return typeof link.target === 'object' ? (link.target as SwarmNode & SimulationNodeDatum).x ?? 0 : 0;
	}
	function getTargetY(link: SwarmLink & SimulationLinkDatum<SwarmNode>): number {
		return typeof link.target === 'object' ? (link.target as SwarmNode & SimulationNodeDatum).y ?? 0 : 0;
	}
</script>

<div
	bind:this={containerEl}
	class={cn('relative w-full bg-gray-50 rounded-lg border overflow-hidden', className)}
	style="min-height: {propHeight}px"
>
	{#if $activeSwarm}
		<!-- SVG Canvas -->
		<svg
			bind:this={svgEl}
			width={dimensions.width}
			height={dimensions.height}
			class="cursor-grab active:cursor-grabbing"
		>
			<!-- Definitions for markers and filters -->
			<defs>
				<marker
					id="arrowhead"
					markerWidth="10"
					markerHeight="7"
					refX="10"
					refY="3.5"
					orient="auto"
				>
					<polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
				</marker>

				<!-- Glow filter for active nodes -->
				<filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
					<feGaussianBlur stdDeviation="3" result="coloredBlur" />
					<feMerge>
						<feMergeNode in="coloredBlur" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			</defs>

			<!-- Transform group for zoom/pan -->
			<g transform="translate({transform.x}, {transform.y}) scale({transform.k})">
				<!-- Links -->
				<g class="links">
					{#each links as link (typeof link.source === 'object' ? link.source.id : link.source + '-' + (typeof link.target === 'object' ? link.target.id : link.target))}
						<line
							x1={getSourceX(link)}
							y1={getSourceY(link)}
							x2={getTargetX(link)}
							y2={getTargetY(link)}
							stroke={getLinkColor(link)}
							stroke-width={link.active ? 3 : 1.5}
							stroke-opacity={link.active ? 1 : 0.4}
							class="transition-all duration-200"
						/>
					{/each}
				</g>

				<!-- Flow animations -->
				<g class="flows">
					{#each $flowAnimations as anim (anim.id)}
						{@const sourceNode = nodes.find(n => n.agentId === anim.sourceId || n.id === anim.sourceId)}
						{@const targetNode = nodes.find(n => n.agentId === anim.targetId || n.id === anim.targetId)}
						{#if sourceNode && targetNode}
							{@const progress = Math.min((Date.now() - anim.startTime) / 500, 1)}
							{@const x = (sourceNode.x ?? 0) + ((targetNode.x ?? 0) - (sourceNode.x ?? 0)) * progress}
							{@const y = (sourceNode.y ?? 0) + ((targetNode.y ?? 0) - (sourceNode.y ?? 0)) * progress}
							<circle
								cx={x}
								cy={y}
								r={5}
								fill={anim.type === 'vote' ? '#fbbf24' : '#3b82f6'}
								opacity={1 - progress}
							/>
						{/if}
					{/each}
				</g>

				<!-- Nodes -->
				<g class="nodes">
					{#each nodes as node (node.id)}
						{@const radius = getNodeRadius(node)}
						<g
							class="node-group cursor-pointer"
							transform="translate({node.x ?? 0}, {node.y ?? 0})"
							role="button"
							tabindex="0"
							onmouseenter={(e) => handleNodeMouseEnter(e, node)}
							onmouseleave={handleNodeMouseLeave}
							onclick={() => onAgentClick?.(node)}
						>
							<!-- Health ring -->
							<circle
								r={radius + 4}
								fill="none"
								stroke={node.health >= 0.8 ? '#10b981' : node.health >= 0.5 ? '#fbbf24' : '#ef4444'}
								stroke-width="2"
								stroke-dasharray={`${node.health * 2 * Math.PI * (radius + 4)} ${2 * Math.PI * (radius + 4)}`}
								transform="rotate(-90)"
								opacity="0.6"
							/>

							<!-- Main circle -->
							<circle
								r={radius}
								fill={STATUS_COLORS[node.status]}
								stroke="white"
								stroke-width="2"
								class={cn(
									'transition-all duration-200',
									node.status === 'working' && 'animate-pulse',
									hoveredNode?.id === node.id && 'drop-shadow-lg'
								)}
								filter={node.status === 'working' ? 'url(#glow)' : undefined}
							/>

							<!-- Role indicator -->
							{#if node.role && node.role !== 'worker'}
								<circle
									cx={radius * 0.7}
									cy={-radius * 0.7}
									r={6}
									fill={ROLE_COLORS[node.role]}
									stroke="white"
									stroke-width="1.5"
								/>
							{/if}

							<!-- Consensus vote indicator -->
							{#if node.consensusVote}
								<g transform="translate({-radius * 0.7}, {-radius * 0.7})">
									<circle
										r={7}
										fill={node.consensusVote === 'for' ? '#10b981' :
										      node.consensusVote === 'against' ? '#ef4444' : '#9ca3af'}
										stroke="white"
										stroke-width="1.5"
									/>
									{#if node.consensusVote === 'for'}
										<path
											d="M-2 0 L-0.5 1.5 L2 -1.5"
											stroke="white"
											stroke-width="1.5"
											fill="none"
										/>
									{:else if node.consensusVote === 'against'}
										<path
											d="M-1.5 -1.5 L1.5 1.5 M-1.5 1.5 L1.5 -1.5"
											stroke="white"
											stroke-width="1.5"
										/>
									{:else}
										<circle cx="0" cy="0" r="1.5" fill="white" />
									{/if}
								</g>
							{/if}

							<!-- Label -->
							<text
								y={radius + 16}
								text-anchor="middle"
								class="text-xs font-medium fill-gray-700 pointer-events-none"
							>
								{node.label || node.agentType}
							</text>
						</g>
					{/each}
				</g>
			</g>
		</svg>

		<!-- Controls -->
		{#if showControls}
			<div class="absolute top-4 right-4 flex flex-col gap-2">
				<button
					type="button"
					class="p-2 bg-white rounded-lg shadow border hover:bg-gray-50"
					onclick={zoomToFit}
					title="Zoom to fit"
				>
					<Icons.Maximize2 class="w-4 h-4" />
				</button>
				<button
					type="button"
					class="p-2 bg-white rounded-lg shadow border hover:bg-gray-50"
					onclick={resetZoom}
					title="Reset zoom"
				>
					<Icons.RotateCcw class="w-4 h-4" />
				</button>
			</div>
		{/if}

		<!-- Legend -->
		{#if showLegend}
			<SwarmLegend class="absolute bottom-4 left-4" />
		{/if}

		<!-- Tooltip -->
		{#if hoveredNode}
			<SwarmTooltip
				node={hoveredNode}
				x={tooltipPosition.x}
				y={tooltipPosition.y}
			/>
		{/if}

		<!-- Status bar -->
		<div class="absolute bottom-4 right-4 flex items-center gap-3 bg-white/90 backdrop-blur rounded-lg px-3 py-2 shadow border text-xs">
			<div class="flex items-center gap-1.5">
				<span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
				<span class="text-gray-600">{$activeSwarm.topology}</span>
			</div>
			<div class="text-gray-400">|</div>
			<div class="text-gray-600">
				{nodes.length} agents
			</div>
			<div class="text-gray-400">|</div>
			<div class={cn(
				'font-medium',
				$activeSwarm.health >= 0.8 ? 'text-green-600' :
				$activeSwarm.health >= 0.5 ? 'text-yellow-600' : 'text-red-600'
			)}>
				{Math.round($activeSwarm.health * 100)}% healthy
			</div>
		</div>
	{:else}
		<!-- Empty state -->
		<div class="flex flex-col items-center justify-center h-full py-12 text-center">
			<div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
				<Icons.Network class="w-8 h-8 text-gray-400" />
			</div>
			<h3 class="text-sm font-medium text-gray-900">No Active Swarm</h3>
			<p class="mt-1 text-sm text-gray-500">Start a swarm to see agents in action.</p>
		</div>
	{/if}
</div>

<style>
	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
	}

	.animate-pulse {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
</style>
