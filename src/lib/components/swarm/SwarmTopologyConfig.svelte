<script lang="ts">
	/**
	 * Swarm Topology Configuration UI
	 * GAP-3.1.5: Swarm Topology Configuration UI
	 *
	 * Allows users to select swarm topology, configure max agents,
	 * and provides visual representation of the selected topology.
	 */
	import { cn } from '$lib/utils';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import {
		Network,
		Save,
		RotateCcw,
		Info,
		Users,
		GitBranch,
		Circle,
		Star,
		Hexagon
	} from 'lucide-svelte';
	import type { SwarmTopology } from './types';

	interface TopologyOption {
		id: SwarmTopology;
		name: string;
		description: string;
		icon: typeof Network;
		pros: string[];
		cons: string[];
		recommended?: boolean;
	}

	interface SwarmConfig {
		topology: SwarmTopology;
		maxAgents: number;
		coordinatorPull: number;
		enableConsensus: boolean;
		consensusStrategy: 'byzantine' | 'raft' | 'gossip' | 'crdt' | 'quorum';
	}

	interface Props {
		initialConfig?: Partial<SwarmConfig>;
		onSave?: (config: SwarmConfig) => void;
		onReset?: () => void;
		disabled?: boolean;
		class?: string;
	}

	let {
		initialConfig = {},
		onSave,
		onReset,
		disabled = false,
		class: className = ''
	}: Props = $props();

	// Default configuration
	const defaultConfig: SwarmConfig = {
		topology: 'hierarchical',
		maxAgents: 15,
		coordinatorPull: 0.15,
		enableConsensus: true,
		consensusStrategy: 'byzantine'
	};

	// Current configuration state
	let config = $state<SwarmConfig>({ ...defaultConfig, ...initialConfig });
	let showAdvanced = $state(false);
	let saving = $state(false);

	// Topology options
	const topologyOptions: TopologyOption[] = [
		{
			id: 'hierarchical',
			name: 'Hierarchical',
			description: 'Tree structure with coordinator at top. Commands flow down, results flow up.',
			icon: GitBranch,
			pros: ['Clear chain of command', 'Efficient task distribution', 'Good for large swarms'],
			cons: ['Single point of failure', 'Coordinator bottleneck'],
			recommended: true
		},
		{
			id: 'mesh',
			name: 'Mesh',
			description: 'Fully connected peer network. All agents can communicate directly.',
			icon: Hexagon,
			pros: ['No single point of failure', 'Fast peer communication', 'Flexible coordination'],
			cons: ['Higher network overhead', 'Complex coordination', 'Best for smaller swarms']
		},
		{
			id: 'hybrid',
			name: 'Hierarchical-Mesh',
			description: 'Combines hierarchical structure with mesh connectivity for resilience.',
			icon: Network,
			pros: ['Best of both worlds', 'Fault tolerant', 'Efficient with redundancy'],
			cons: ['More complex setup', 'Higher resource usage'],
			recommended: true
		},
		{
			id: 'ring',
			name: 'Ring',
			description: 'Agents arranged in a circular topology. Messages travel around the ring.',
			icon: Circle,
			pros: ['Simple structure', 'Equal load distribution', 'Predictable communication'],
			cons: ['Higher latency', 'Ring breaks affect all', 'Not ideal for large swarms']
		},
		{
			id: 'star',
			name: 'Star',
			description: 'Central coordinator with all agents connected directly to it.',
			icon: Star,
			pros: ['Simple management', 'Low latency to coordinator', 'Easy monitoring'],
			cons: ['Single point of failure', 'Coordinator overload risk', 'Limited scalability']
		}
	];

	// Consensus strategy options
	const consensusStrategies = [
		{ id: 'byzantine', name: 'Byzantine (BFT)', description: 'Tolerates f < n/3 faulty agents' },
		{ id: 'raft', name: 'Raft', description: 'Leader-based, tolerates f < n/2' },
		{ id: 'gossip', name: 'Gossip', description: 'Epidemic protocol for eventual consistency' },
		{ id: 'crdt', name: 'CRDT', description: 'Conflict-free replicated data types' },
		{ id: 'quorum', name: 'Quorum', description: 'Configurable quorum-based consensus' }
	] as const;

	// Currently selected topology option
	const selectedTopology = $derived(
		topologyOptions.find(t => t.id === config.topology) || topologyOptions[0]
	);

	// Handle save
	async function handleSave() {
		if (disabled) return;
		saving = true;
		try {
			onSave?.(config);
		} finally {
			saving = false;
		}
	}

	// Handle reset
	function handleReset() {
		config = { ...defaultConfig, ...initialConfig };
		onReset?.();
	}

	// SVG visualization dimensions
	const vizWidth = 280;
	const vizHeight = 180;
	const centerX = vizWidth / 2;
	const centerY = vizHeight / 2;

	// Generate node positions based on topology
	function getNodePositions(topology: SwarmTopology): { x: number; y: number; isCoordinator: boolean }[] {
		const nodeCount = Math.min(config.maxAgents, 7); // Show max 7 nodes in preview
		const positions: { x: number; y: number; isCoordinator: boolean }[] = [];

		switch (topology) {
			case 'hierarchical':
				// Tree-like structure
				positions.push({ x: centerX, y: 30, isCoordinator: true });
				const level2Count = Math.min(3, nodeCount - 1);
				for (let i = 0; i < level2Count; i++) {
					const x = centerX + (i - (level2Count - 1) / 2) * 70;
					positions.push({ x, y: 90, isCoordinator: false });
				}
				const level3Count = Math.min(3, nodeCount - 1 - level2Count);
				for (let i = 0; i < level3Count; i++) {
					const x = centerX + (i - (level3Count - 1) / 2) * 80;
					positions.push({ x, y: 150, isCoordinator: false });
				}
				break;

			case 'mesh':
				// Circular arrangement with connections
				for (let i = 0; i < nodeCount; i++) {
					const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2;
					const radius = 65;
					positions.push({
						x: centerX + radius * Math.cos(angle),
						y: centerY + radius * Math.sin(angle),
						isCoordinator: i === 0
					});
				}
				break;

			case 'hybrid':
				// Hierarchical with mesh connections at each level
				positions.push({ x: centerX, y: 30, isCoordinator: true });
				const hybridCount = Math.min(4, nodeCount - 1);
				for (let i = 0; i < hybridCount; i++) {
					const angle = (Math.PI * (i + 0.5)) / hybridCount;
					positions.push({
						x: centerX + 80 * Math.cos(angle) - 40,
						y: 70 + 60 * Math.sin(angle),
						isCoordinator: false
					});
				}
				break;

			case 'ring':
				// Ring arrangement
				for (let i = 0; i < nodeCount; i++) {
					const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2;
					const radius = 60;
					positions.push({
						x: centerX + radius * Math.cos(angle),
						y: centerY + radius * Math.sin(angle),
						isCoordinator: i === 0
					});
				}
				break;

			case 'star':
				// Star arrangement with center coordinator
				positions.push({ x: centerX, y: centerY, isCoordinator: true });
				for (let i = 0; i < nodeCount - 1; i++) {
					const angle = (2 * Math.PI * i) / (nodeCount - 1) - Math.PI / 2;
					const radius = 65;
					positions.push({
						x: centerX + radius * Math.cos(angle),
						y: centerY + radius * Math.sin(angle),
						isCoordinator: false
					});
				}
				break;

			default:
				positions.push({ x: centerX, y: centerY, isCoordinator: true });
		}

		return positions;
	}

	// Generate links based on topology
	function getLinks(topology: SwarmTopology, positions: { x: number; y: number; isCoordinator: boolean }[]): { x1: number; y1: number; x2: number; y2: number }[] {
		const links: { x1: number; y1: number; x2: number; y2: number }[] = [];

		switch (topology) {
			case 'hierarchical':
				// Connect coordinator to level 2, level 2 to level 3
				for (let i = 1; i < positions.length; i++) {
					if (i <= 3) {
						// Connect to coordinator
						links.push({ x1: positions[0].x, y1: positions[0].y, x2: positions[i].x, y2: positions[i].y });
					} else if (i > 3) {
						// Connect to level 2 nodes
						const parentIdx = ((i - 4) % 3) + 1;
						if (parentIdx < positions.length) {
							links.push({ x1: positions[parentIdx].x, y1: positions[parentIdx].y, x2: positions[i].x, y2: positions[i].y });
						}
					}
				}
				break;

			case 'mesh':
				// Connect all nodes to each other
				for (let i = 0; i < positions.length; i++) {
					for (let j = i + 1; j < positions.length; j++) {
						links.push({ x1: positions[i].x, y1: positions[i].y, x2: positions[j].x, y2: positions[j].y });
					}
				}
				break;

			case 'hybrid':
				// Hierarchical connections plus some mesh
				for (let i = 1; i < positions.length; i++) {
					links.push({ x1: positions[0].x, y1: positions[0].y, x2: positions[i].x, y2: positions[i].y });
					// Mesh connections between workers
					if (i < positions.length - 1) {
						links.push({ x1: positions[i].x, y1: positions[i].y, x2: positions[i + 1].x, y2: positions[i + 1].y });
					}
				}
				// Close the mesh loop
				if (positions.length > 2) {
					links.push({ x1: positions[positions.length - 1].x, y1: positions[positions.length - 1].y, x2: positions[1].x, y2: positions[1].y });
				}
				break;

			case 'ring':
				// Connect in a ring
				for (let i = 0; i < positions.length; i++) {
					const next = (i + 1) % positions.length;
					links.push({ x1: positions[i].x, y1: positions[i].y, x2: positions[next].x, y2: positions[next].y });
				}
				break;

			case 'star':
				// Connect all to center
				for (let i = 1; i < positions.length; i++) {
					links.push({ x1: positions[0].x, y1: positions[0].y, x2: positions[i].x, y2: positions[i].y });
				}
				break;
		}

		return links;
	}

	// Reactive positions and links
	const nodePositions = $derived(getNodePositions(config.topology));
	const topologyLinks = $derived(getLinks(config.topology, nodePositions));
</script>

<div class={cn('swarm-topology-config', className)}>
	<Card class="p-6">
		<!-- Header -->
		<div class="flex items-center justify-between mb-6">
			<div class="flex items-center gap-3">
				<div class="p-2 bg-cyan-100 rounded-lg">
					<Network class="w-5 h-5 text-cyan-600" />
				</div>
				<div>
					<h2 class="text-lg font-semibold text-gray-900">Swarm Topology Configuration</h2>
					<p class="text-sm text-gray-500">Configure how agents are organized and communicate</p>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<Button variant="outline" size="sm" onclick={handleReset} {disabled}>
					<RotateCcw class="w-4 h-4 mr-1" />
					Reset
				</Button>
				<Button size="sm" onclick={handleSave} disabled={disabled || saving}>
					<Save class="w-4 h-4 mr-1" />
					{saving ? 'Saving...' : 'Save'}
				</Button>
			</div>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Left Column: Topology Selection -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-3">
					Select Topology
				</label>
				<div class="space-y-2">
					{#each topologyOptions as option}
						<button
							type="button"
							class={cn(
								'w-full p-4 rounded-lg border-2 text-left transition-all',
								config.topology === option.id
									? 'border-cyan-500 bg-cyan-50'
									: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
								disabled && 'opacity-50 cursor-not-allowed'
							)}
							onclick={() => !disabled && (config.topology = option.id)}
							{disabled}
						>
							<div class="flex items-center gap-3">
								<div class={cn(
									'p-2 rounded-lg',
									config.topology === option.id ? 'bg-cyan-100' : 'bg-gray-100'
								)}>
									<option.icon class={cn(
										'w-4 h-4',
										config.topology === option.id ? 'text-cyan-600' : 'text-gray-500'
									)} />
								</div>
								<div class="flex-1">
									<div class="flex items-center gap-2">
										<span class="font-medium text-gray-900">{option.name}</span>
										{#if option.recommended}
											<Badge variant="secondary" class="text-xs">Recommended</Badge>
										{/if}
									</div>
									<p class="text-xs text-gray-500 mt-0.5">{option.description}</p>
								</div>
								{#if config.topology === option.id}
									<div class="w-2 h-2 bg-cyan-500 rounded-full"></div>
								{/if}
							</div>
						</button>
					{/each}
				</div>
			</div>

			<!-- Right Column: Visualization & Settings -->
			<div class="space-y-6">
				<!-- Topology Visualization -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-3">
						Topology Preview
					</label>
					<div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border p-4">
						<svg
							width={vizWidth}
							height={vizHeight}
							class="mx-auto"
							viewBox="0 0 {vizWidth} {vizHeight}"
						>
							<!-- Links -->
							<g class="links">
								{#each topologyLinks as link}
									<line
										x1={link.x1}
										y1={link.y1}
										x2={link.x2}
										y2={link.y2}
										stroke="#d1d5db"
										stroke-width="2"
										class="transition-all duration-300"
									/>
								{/each}
							</g>

							<!-- Nodes -->
							<g class="nodes">
								{#each nodePositions as node, i}
									<g class="transition-all duration-300" transform="translate({node.x}, {node.y})">
										<!-- Node shadow -->
										<circle
											r={node.isCoordinator ? 16 : 12}
											fill="rgba(0,0,0,0.1)"
											cx="2"
											cy="2"
										/>
										<!-- Node circle -->
										<circle
											r={node.isCoordinator ? 16 : 12}
											fill={node.isCoordinator ? '#0891b2' : '#6b7280'}
											stroke="white"
											stroke-width="2"
										/>
										<!-- Node label -->
										<text
											y={node.isCoordinator ? 30 : 26}
											text-anchor="middle"
											class="text-[10px] font-medium fill-gray-600"
										>
											{node.isCoordinator ? 'Coord' : `A${i}`}
										</text>
									</g>
								{/each}
							</g>
						</svg>

						<div class="flex items-center justify-center gap-4 mt-3 text-xs">
							<div class="flex items-center gap-1.5">
								<div class="w-3 h-3 rounded-full bg-cyan-600"></div>
								<span class="text-gray-600">Coordinator</span>
							</div>
							<div class="flex items-center gap-1.5">
								<div class="w-3 h-3 rounded-full bg-gray-500"></div>
								<span class="text-gray-600">Agent</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Topology Info -->
				<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<div class="flex items-start gap-3">
						<Info class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
						<div>
							<h4 class="font-medium text-blue-900">{selectedTopology.name} Topology</h4>
							<div class="mt-2 grid grid-cols-2 gap-4 text-xs">
								<div>
									<span class="font-medium text-blue-800">Pros:</span>
									<ul class="mt-1 space-y-0.5 text-blue-700">
										{#each selectedTopology.pros as pro}
											<li>+ {pro}</li>
										{/each}
									</ul>
								</div>
								<div>
									<span class="font-medium text-blue-800">Cons:</span>
									<ul class="mt-1 space-y-0.5 text-blue-700">
										{#each selectedTopology.cons as con}
											<li>- {con}</li>
										{/each}
									</ul>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Max Agents Slider -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						<div class="flex items-center gap-2">
							<Users class="w-4 h-4" />
							<span>Maximum Agents: {config.maxAgents}</span>
						</div>
					</label>
					<input
						type="range"
						min="2"
						max="25"
						bind:value={config.maxAgents}
						class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
						{disabled}
					/>
					<div class="flex justify-between text-xs text-gray-500 mt-1">
						<span>2</span>
						<span>Recommended: 8-15</span>
						<span>25</span>
					</div>
				</div>

				<!-- Advanced Settings Toggle -->
				<button
					type="button"
					class="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
					onclick={() => showAdvanced = !showAdvanced}
				>
					<span class={cn('transition-transform', showAdvanced && 'rotate-90')}>
						<GitBranch class="w-4 h-4" />
					</span>
					<span>{showAdvanced ? 'Hide' : 'Show'} Advanced Settings</span>
				</button>

				<!-- Advanced Settings -->
				{#if showAdvanced}
					<div class="space-y-4 border-t pt-4">
						<!-- Coordinator Pull Strength -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Coordinator Pull Strength: {config.coordinatorPull.toFixed(2)}
							</label>
							<input
								type="range"
								min="0"
								max="0.5"
								step="0.01"
								bind:value={config.coordinatorPull}
								class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
								{disabled}
							/>
							<p class="text-xs text-gray-500 mt-1">
								How strongly agents are drawn toward the coordinator
							</p>
						</div>

						<!-- Consensus Settings -->
						<div class="flex items-center justify-between">
							<div>
								<label class="block text-sm font-medium text-gray-700">
									Enable Consensus
								</label>
								<p class="text-xs text-gray-500">
									Byzantine fault-tolerant decision making
								</p>
							</div>
							<label class="relative inline-flex items-center cursor-pointer">
								<input
									type="checkbox"
									bind:checked={config.enableConsensus}
									class="sr-only peer"
									{disabled}
								/>
								<div
									class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"
								></div>
							</label>
						</div>

						<!-- Consensus Strategy -->
						{#if config.enableConsensus}
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Consensus Strategy
								</label>
								<select
									bind:value={config.consensusStrategy}
									class="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
									{disabled}
								>
									{#each consensusStrategies as strategy}
										<option value={strategy.id}>{strategy.name} - {strategy.description}</option>
									{/each}
								</select>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</Card>
</div>

<style>
	input[type="range"]::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 16px;
		height: 16px;
		background: #0891b2;
		border-radius: 50%;
		cursor: pointer;
	}

	input[type="range"]::-moz-range-thumb {
		width: 16px;
		height: 16px;
		background: #0891b2;
		border-radius: 50%;
		cursor: pointer;
		border: none;
	}
</style>
