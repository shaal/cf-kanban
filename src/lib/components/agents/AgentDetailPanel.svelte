<script lang="ts">
	/**
	 * Agent Detail Panel Component
	 * GAP-3.3.1: Visual Agent Catalog
	 * GAP-3.3.4: Agent Success Metrics Integration
	 * GAP-3.3.5: Custom Agent Configuration Integration
	 *
	 * Detailed view of a selected agent with full info.
	 */
	import { cn } from '$lib/utils';
	import * as Icons from 'lucide-svelte';
	import type { AgentCatalogEntry, CustomAgentConfig } from '$lib/types/agents';
	import { CATEGORY_CONFIG } from '$lib/types/agents';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import AgentMetricsPanel from './AgentMetricsPanel.svelte';
	import { getAgentMetrics } from '$lib/stores/agent-metrics';
	import { configsByAgentType, getDefaultConfigForAgentType } from '$lib/stores/agent-configs';

	interface Props {
		agent: AgentCatalogEntry;
		pairingSuggestions?: AgentCatalogEntry[];
		onclose: () => void;
		onSelectAgent?: (agent: AgentCatalogEntry) => void;
		/** Handler for spawning an agent */
		onspawn?: (agent: AgentCatalogEntry, config?: CustomAgentConfig) => void;
		/** Handler for creating a new config for this agent */
		oncreateconfig?: (agent: AgentCatalogEntry) => void;
		class?: string;
	}

	let { agent, pairingSuggestions = [], onclose, onSelectAgent, onspawn, oncreateconfig, class: className = '' }: Props = $props();

	// Get configs for this agent type
	const agentConfigs = $derived($configsByAgentType.get(agent.id) ?? []);
	const defaultConfig = $derived(getDefaultConfigForAgentType(agent.id));

	// Selected config for spawning
	let selectedConfigId = $state<string | null>(null);
	const selectedConfig = $derived(
		selectedConfigId
			? agentConfigs.find((c) => c.id === selectedConfigId)
			: defaultConfig
	);

	// Spawn dropdown state
	let showSpawnDropdown = $state(false);

	// Get the icon component dynamically
	const IconComponent = $derived((Icons as Record<string, typeof Icons.Code>)[agent.icon] || Icons.Bot);

	// Category config
	const categoryConfig = $derived(CATEGORY_CONFIG[agent.category]);

	// Format time
	function formatTime(ms: number | undefined): string {
		if (!ms) return 'N/A';
		if (ms < 60000) return `${Math.round(ms / 1000)} seconds`;
		return `${Math.round(ms / 60000)} minutes`;
	}

	// Format date
	function formatDate(date: Date | undefined): string {
		if (!date) return 'Never';
		const d = new Date(date);
		const now = new Date();
		const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
		if (diffDays === 0) return 'Today';
		if (diffDays === 1) return 'Yesterday';
		if (diffDays < 7) return `${diffDays} days ago`;
		return d.toLocaleDateString();
	}

	// Complexity color
	const complexityColor = $derived(
		agent.complexity === 'basic'
			? 'text-green-600 bg-green-50'
			: agent.complexity === 'intermediate'
				? 'text-blue-600 bg-blue-50'
				: 'text-orange-600 bg-orange-50'
	);

	// Get extended metrics with history for the metrics panel
	const extendedMetrics = $derived(getAgentMetrics(agent.id));
</script>

<div class={cn('flex flex-col h-full bg-white', className)}>
	<!-- Header -->
	<div class="flex items-start justify-between p-4 border-b">
		<div class="flex items-center gap-3">
			<!-- Icon -->
			<div
				class="w-12 h-12 rounded-xl flex items-center justify-center"
				style="background-color: {categoryConfig?.color}20"
			>
				<IconComponent class="w-6 h-6" style="color: {categoryConfig?.color}" />
			</div>

			<div>
				<h2 class="text-lg font-semibold text-gray-900">{agent.name}</h2>
				<p class="text-sm" style="color: {categoryConfig?.color}">{categoryConfig?.label}</p>
			</div>
		</div>

		<button
			type="button"
			class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
			onclick={onclose}
		>
			<Icons.X class="w-5 h-5" />
		</button>
	</div>

	<!-- Content -->
	<div class="flex-1 overflow-y-auto p-4 space-y-6">
		<!-- Description -->
		<div>
			<p class="text-sm text-gray-600 leading-relaxed">{agent.description}</p>
		</div>

		<!-- Complexity badge -->
		<div class="flex items-center gap-2">
			<span class="text-xs font-medium text-gray-500">Complexity:</span>
			<span class={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', complexityColor)}>
				{agent.complexity}
			</span>
		</div>

		<!-- Metrics Panel (GAP-3.3.4) -->
		{#if agent.metrics || extendedMetrics}
			<AgentMetricsPanel
				agentTypeId={agent.id}
				metrics={extendedMetrics}
			/>
		{/if}

		<!-- Capabilities -->
		<div>
			<h3 class="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
				<Icons.Sparkles class="w-4 h-4" />
				Capabilities
			</h3>
			<div class="flex flex-wrap gap-2">
				{#each agent.capabilities as capability}
					<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
						{capability}
					</span>
				{/each}
			</div>
		</div>

		<!-- Use Cases -->
		<div>
			<h3 class="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
				<Icons.Target class="w-4 h-4" />
				Use Cases
			</h3>
			<ul class="space-y-2">
				{#each agent.useCases as useCase}
					<li class="flex items-start gap-2 text-sm text-gray-600">
						<Icons.Check class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
						{useCase}
					</li>
				{/each}
			</ul>
		</div>

		<!-- Best Paired With -->
		{#if pairingSuggestions.length > 0 || agent.bestPairedWith.length > 0}
			<div>
				<h3 class="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
					<Icons.Link2 class="w-4 h-4" />
					Best Paired With
				</h3>
				<div class="space-y-2">
					{#if pairingSuggestions.length > 0}
						{#each pairingSuggestions as pairing}
							{@const PairingIcon = (Icons as Record<string, typeof Icons.Code>)[pairing.icon] || Icons.Bot}
							<button
								type="button"
								class="w-full flex items-center gap-3 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left"
								onclick={() => onSelectAgent?.(pairing)}
							>
								<div
									class="w-8 h-8 rounded-lg flex items-center justify-center"
									style="background-color: {CATEGORY_CONFIG[pairing.category]?.color}20"
								>
									<PairingIcon class="w-4 h-4" style="color: {CATEGORY_CONFIG[pairing.category]?.color}" />
								</div>
								<div class="flex-1">
									<p class="text-sm font-medium text-gray-900">{pairing.name}</p>
									<p class="text-xs text-gray-500">{CATEGORY_CONFIG[pairing.category]?.label}</p>
								</div>
								<Icons.ChevronRight class="w-4 h-4 text-gray-400" />
							</button>
						{/each}
					{:else}
						{#each agent.bestPairedWith as pairingId}
							<span class="inline-flex items-center px-3 py-1.5 rounded-lg text-sm bg-blue-50 text-blue-700">
								{pairingId}
							</span>
						{/each}
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<!-- Footer Actions (GAP-3.3.5) -->
	<div class="p-4 border-t bg-gray-50 space-y-3">
		<!-- Config Selection -->
		{#if agentConfigs.length > 0}
			<div>
				<label for="config-select" class="block text-xs font-medium text-gray-500 mb-1">
					Configuration
				</label>
				<select
					id="config-select"
					bind:value={selectedConfigId}
					class="w-full h-9 px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				>
					<option value={null}>
						{defaultConfig ? `Default: ${defaultConfig.name}` : 'Use defaults'}
					</option>
					{#each agentConfigs.filter(c => !c.isDefault) as config}
						<option value={config.id}>{config.name}</option>
					{/each}
				</select>
				{#if selectedConfig}
					<p class="text-xs text-gray-400 mt-1 truncate" title={selectedConfig.description}>
						{selectedConfig.description || `Model: ${selectedConfig.model || 'default'}`}
					</p>
				{/if}
			</div>
		{/if}

		<!-- Action Buttons -->
		<div class="flex gap-2">
			{#if oncreateconfig}
				<Button
					variant="outline"
					class="flex-1"
					onclick={() => oncreateconfig(agent)}
				>
					<Icons.Settings class="w-4 h-4 mr-2" />
					New Config
				</Button>
			{/if}
			<Button
				class="flex-1"
				disabled={!onspawn}
				onclick={() => onspawn?.(agent, selectedConfig ?? undefined)}
			>
				<Icons.Play class="w-4 h-4 mr-2" />
				{#if selectedConfig}
					Spawn with Config
				{:else}
					Spawn Agent
				{/if}
			</Button>
		</div>

		{#if !onspawn}
			<p class="text-xs text-gray-400 text-center">
				Spawning requires an active project context
			</p>
		{/if}
	</div>
</div>
