<script lang="ts">
	/**
	 * Agent Configuration List Component
	 * GAP-3.3.5: Custom Agent Configuration
	 *
	 * Displays a list of custom agent configurations with actions.
	 */
	import { cn } from '$lib/utils';
	import * as Icons from 'lucide-svelte';
	import type { CustomAgentConfig, AgentCatalogEntry } from '$lib/types/agents';
	import { AVAILABLE_MODELS } from '$lib/types/agents';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';

	interface Props {
		/** List of configurations to display */
		configs: CustomAgentConfig[];
		/** Agent type definitions for displaying agent info */
		agentTypes: AgentCatalogEntry[];
		/** Handler for edit action */
		onedit?: (config: CustomAgentConfig) => void;
		/** Handler for delete action */
		ondelete?: (config: CustomAgentConfig) => void;
		/** Handler for duplicate action */
		onduplicate?: (config: CustomAgentConfig) => void;
		/** Handler for spawn action */
		onspawn?: (config: CustomAgentConfig) => void;
		/** Handler for set as default action */
		onsetdefault?: (config: CustomAgentConfig) => void;
		/** Whether configs are loading */
		loading?: boolean;
		/** Additional CSS classes */
		class?: string;
	}

	let {
		configs,
		agentTypes,
		onedit,
		ondelete,
		onduplicate,
		onspawn,
		onsetdefault,
		loading = false,
		class: className = ''
	}: Props = $props();

	// Get agent type info
	function getAgentType(agentTypeId: string): AgentCatalogEntry | undefined {
		return agentTypes.find((a) => a.id === agentTypeId);
	}

	// Get model display name
	function getModelName(modelId: string | undefined): string {
		if (!modelId) return 'Default';
		const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
		return model?.name ?? modelId;
	}

	// Format date
	function formatDate(date: Date): string {
		const d = new Date(date);
		const now = new Date();
		const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

		if (diffDays === 0) return 'Today';
		if (diffDays === 1) return 'Yesterday';
		if (diffDays < 7) return `${diffDays} days ago`;
		return d.toLocaleDateString();
	}

	// Confirm delete
	function confirmDelete(config: CustomAgentConfig) {
		if (confirm(`Are you sure you want to delete "${config.name}"? This action cannot be undone.`)) {
			ondelete?.(config);
		}
	}
</script>

<div class={cn('space-y-3', className)}>
	{#if loading}
		<!-- Loading skeleton -->
		{#each [1, 2, 3] as _}
			<div class="bg-white rounded-lg border p-4 animate-pulse">
				<div class="flex items-start gap-3">
					<div class="w-10 h-10 bg-gray-200 rounded-lg"></div>
					<div class="flex-1">
						<div class="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
						<div class="h-4 bg-gray-100 rounded w-2/3"></div>
					</div>
				</div>
			</div>
		{/each}
	{:else if configs.length === 0}
		<!-- Empty state -->
		<div class="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-8 text-center">
			<Icons.Settings class="w-12 h-12 text-gray-400 mx-auto mb-3" />
			<h3 class="text-sm font-medium text-gray-900 mb-1">No configurations yet</h3>
			<p class="text-sm text-gray-500">Create custom agent configurations to save your preferred settings.</p>
		</div>
	{:else}
		<!-- Config list -->
		{#each configs as config (config.id)}
			{@const agentType = getAgentType(config.agentTypeId)}
			<div
				class={cn(
					'bg-white rounded-lg border p-4 hover:shadow-sm transition-shadow',
					config.isDefault && 'ring-2 ring-blue-500 ring-offset-1'
				)}
			>
				<div class="flex items-start justify-between gap-4">
					<!-- Left: Config info -->
					<div class="flex items-start gap-3 flex-1 min-w-0">
						<!-- Agent icon -->
						<div
							class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
							style="background-color: #4f46e520"
						>
							<Icons.Settings class="w-5 h-5 text-indigo-600" />
						</div>

						<div class="flex-1 min-w-0">
							<!-- Name and badges -->
							<div class="flex items-center gap-2 flex-wrap">
								<h3 class="font-medium text-gray-900 truncate">{config.name}</h3>
								{#if config.isDefault}
									<Badge variant="default" class="text-xs">Default</Badge>
								{/if}
								{#if agentType}
									<Badge variant="secondary" class="text-xs">{agentType.name}</Badge>
								{/if}
							</div>

							<!-- Description -->
							{#if config.description}
								<p class="text-sm text-gray-500 mt-1 line-clamp-1">{config.description}</p>
							{/if}

							<!-- Meta info -->
							<div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
								{#if config.model}
									<span class="flex items-center gap-1">
										<Icons.Cpu class="w-3 h-3" />
										{getModelName(config.model)}
									</span>
								{/if}
								{#if config.temperature !== undefined}
									<span class="flex items-center gap-1">
										<Icons.Thermometer class="w-3 h-3" />
										Temp: {config.temperature}
									</span>
								{/if}
								{#if config.maxTokens}
									<span class="flex items-center gap-1">
										<Icons.Hash class="w-3 h-3" />
										{config.maxTokens.toLocaleString()} tokens
									</span>
								{/if}
								<span class="flex items-center gap-1">
									<Icons.Calendar class="w-3 h-3" />
									{formatDate(config.updatedAt)}
								</span>
							</div>

							<!-- Tags -->
							{#if config.tags && config.tags.length > 0}
								<div class="flex items-center gap-1 mt-2">
									{#each config.tags.slice(0, 3) as tag}
										<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
											{tag}
										</span>
									{/each}
									{#if config.tags.length > 3}
										<span class="text-xs text-gray-400">+{config.tags.length - 3} more</span>
									{/if}
								</div>
							{/if}
						</div>
					</div>

					<!-- Right: Actions -->
					<div class="flex items-center gap-1">
						{#if onspawn}
							<Button
								variant="default"
								size="sm"
								onclick={() => onspawn(config)}
								class="gap-1"
							>
								<Icons.Play class="w-4 h-4" />
								Spawn
							</Button>
						{/if}

						{#if onedit}
							<Button
								variant="ghost"
								size="icon"
								onclick={() => onedit(config)}
								title="Edit configuration"
							>
								<Icons.Pencil class="w-4 h-4" />
							</Button>
						{/if}

						{#if onduplicate}
							<Button
								variant="ghost"
								size="icon"
								onclick={() => onduplicate(config)}
								title="Duplicate configuration"
							>
								<Icons.Copy class="w-4 h-4" />
							</Button>
						{/if}

						{#if onsetdefault && !config.isDefault}
							<Button
								variant="ghost"
								size="icon"
								onclick={() => onsetdefault(config)}
								title="Set as default"
							>
								<Icons.Star class="w-4 h-4" />
							</Button>
						{/if}

						{#if ondelete}
							<Button
								variant="ghost"
								size="icon"
								onclick={() => confirmDelete(config)}
								title="Delete configuration"
								class="text-red-600 hover:text-red-700 hover:bg-red-50"
							>
								<Icons.Trash2 class="w-4 h-4" />
							</Button>
						{/if}
					</div>
				</div>

				<!-- Prompt preview (if exists) -->
				{#if config.prompt}
					<div class="mt-3 pt-3 border-t">
						<details class="group">
							<summary class="cursor-pointer text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
								<Icons.ChevronRight class="w-3 h-3 group-open:rotate-90 transition-transform" />
								View custom prompt
							</summary>
							<div class="mt-2 p-2 bg-gray-50 rounded text-xs font-mono text-gray-600 whitespace-pre-wrap max-h-32 overflow-y-auto">
								{config.prompt}
							</div>
						</details>
					</div>
				{/if}

				<!-- Environment variables preview (if exists) -->
				{#if config.env && Object.keys(config.env).length > 0}
					<div class="mt-3 pt-3 border-t">
						<details class="group">
							<summary class="cursor-pointer text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
								<Icons.ChevronRight class="w-3 h-3 group-open:rotate-90 transition-transform" />
								View environment variables ({Object.keys(config.env).length})
							</summary>
							<div class="mt-2 p-2 bg-gray-50 rounded text-xs font-mono text-gray-600 space-y-1">
								{#each Object.entries(config.env) as [key, value]}
									<div>
										<span class="text-blue-600">{key}</span>=<span class="text-gray-800">{value}</span>
									</div>
								{/each}
							</div>
						</details>
					</div>
				{/if}
			</div>
		{/each}
	{/if}
</div>
