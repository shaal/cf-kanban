<script lang="ts">
	/**
	 * Agent Configuration Panel Component
	 * GAP-3.3.5: Custom Agent Configuration
	 *
	 * Main panel for managing custom agent configurations.
	 * Combines list view with create/edit capabilities.
	 */
	import { cn } from '$lib/utils';
	import * as Icons from 'lucide-svelte';
	import type {
		CustomAgentConfig,
		CreateCustomAgentConfigPayload,
		AgentCatalogEntry
	} from '$lib/types/agents';
	import {
		currentProjectConfigs,
		createConfig,
		updateConfig,
		deleteConfig,
		duplicateConfig,
		setActiveProject
	} from '$lib/stores/agent-configs';
	import Button from '$lib/components/ui/Button.svelte';
	import AgentConfigEditor from './AgentConfigEditor.svelte';
	import AgentConfigList from './AgentConfigList.svelte';

	interface Props {
		/** Available agent types */
		agentTypes: AgentCatalogEntry[];
		/** Current project ID */
		projectId: string;
		/** Handler for spawning an agent with a config */
		onspawn?: (config: CustomAgentConfig) => void;
		/** Additional CSS classes */
		class?: string;
	}

	let {
		agentTypes,
		projectId,
		onspawn,
		class: className = ''
	}: Props = $props();

	// View state
	type ViewMode = 'list' | 'create' | 'edit';
	let viewMode = $state<ViewMode>('list');
	let editingConfig = $state<CustomAgentConfig | null>(null);
	let preselectedAgentTypeId = $state<string | undefined>(undefined);

	// Search/filter state
	let searchQuery = $state('');
	let selectedAgentTypeFilter = $state<string>('');

	// Initialize store with project ID
	$effect(() => {
		setActiveProject(projectId);
	});

	// Filtered configs
	const filteredConfigs = $derived(() => {
		let configs = $currentProjectConfigs;

		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			configs = configs.filter(
				(c) =>
					c.name.toLowerCase().includes(query) ||
					c.description?.toLowerCase().includes(query) ||
					c.tags?.some((t) => t.toLowerCase().includes(query))
			);
		}

		if (selectedAgentTypeFilter) {
			configs = configs.filter((c) => c.agentTypeId === selectedAgentTypeFilter);
		}

		return configs;
	});

	// Get unique agent types from configs
	const usedAgentTypes = $derived(() => {
		const typeIds = new Set($currentProjectConfigs.map((c) => c.agentTypeId));
		return agentTypes.filter((a) => typeIds.has(a.id));
	});

	// Actions
	function handleCreate() {
		editingConfig = null;
		preselectedAgentTypeId = selectedAgentTypeFilter || undefined;
		viewMode = 'create';
	}

	function handleEdit(config: CustomAgentConfig) {
		editingConfig = config;
		viewMode = 'edit';
	}

	function handleSave(payload: CreateCustomAgentConfigPayload) {
		if (viewMode === 'edit' && editingConfig) {
			const result = updateConfig(editingConfig.id, payload, projectId);
			if (result.errors) {
				// Show errors - could be improved with toast notifications
				alert(result.errors.join('\n'));
				return;
			}
		} else {
			const result = createConfig(payload, projectId);
			if (result.errors) {
				alert(result.errors.join('\n'));
				return;
			}
		}

		viewMode = 'list';
		editingConfig = null;
	}

	function handleCancel() {
		viewMode = 'list';
		editingConfig = null;
	}

	function handleDelete(config: CustomAgentConfig) {
		deleteConfig(config.id, projectId);
	}

	function handleDuplicate(config: CustomAgentConfig) {
		const result = duplicateConfig(config.id, `${config.name} (Copy)`, projectId);
		if (result.errors) {
			alert(result.errors.join('\n'));
		}
	}

	function handleSetDefault(config: CustomAgentConfig) {
		updateConfig(config.id, { isDefault: true }, projectId);
	}

	function handleSpawn(config: CustomAgentConfig) {
		onspawn?.(config);
	}

	// Export/Import handlers
	function handleExport() {
		const configs = $currentProjectConfigs;
		const json = JSON.stringify(configs, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `agent-configs-${projectId}-${Date.now()}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function handleImport() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;

			const text = await file.text();
			try {
				const configs = JSON.parse(text);
				// Import each config
				let imported = 0;
				for (const config of configs) {
					const result = createConfig(
						{
							name: config.name,
							agentTypeId: config.agentTypeId,
							prompt: config.prompt,
							model: config.model,
							maxTokens: config.maxTokens,
							temperature: config.temperature,
							env: config.env,
							tags: config.tags,
							description: config.description,
							isDefault: false
						},
						projectId
					);
					if (result.config) imported++;
				}
				alert(`Imported ${imported} configuration(s)`);
			} catch {
				alert('Failed to import configurations. Invalid JSON format.');
			}
		};
		input.click();
	}
</script>

<div class={cn('bg-white rounded-lg border h-full flex flex-col', className)}>
	{#if viewMode === 'list'}
		<!-- List View Header -->
		<div class="p-4 border-b">
			<div class="flex items-center justify-between mb-4">
				<div>
					<h2 class="text-lg font-semibold text-gray-900">Agent Configurations</h2>
					<p class="text-sm text-gray-500">
						{$currentProjectConfigs.length} custom configuration{$currentProjectConfigs.length !== 1 ? 's' : ''}
					</p>
				</div>
				<div class="flex items-center gap-2">
					<Button variant="outline" size="sm" onclick={handleImport}>
						<Icons.Upload class="w-4 h-4 mr-1" />
						Import
					</Button>
					{#if $currentProjectConfigs.length > 0}
						<Button variant="outline" size="sm" onclick={handleExport}>
							<Icons.Download class="w-4 h-4 mr-1" />
							Export
						</Button>
					{/if}
					<Button onclick={handleCreate}>
						<Icons.Plus class="w-4 h-4 mr-1" />
						New Config
					</Button>
				</div>
			</div>

			<!-- Search and Filter -->
			<div class="flex items-center gap-3">
				<div class="relative flex-1">
					<Icons.Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search configurations..."
						class="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
				</div>
				{#if usedAgentTypes().length > 0}
					<select
						bind:value={selectedAgentTypeFilter}
						class="h-10 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					>
						<option value="">All agent types</option>
						{#each usedAgentTypes() as agentType}
							<option value={agentType.id}>{agentType.name}</option>
						{/each}
					</select>
				{/if}
			</div>
		</div>

		<!-- List Content -->
		<div class="flex-1 overflow-y-auto p-4">
			<AgentConfigList
				configs={filteredConfigs()}
				{agentTypes}
				onedit={handleEdit}
				ondelete={handleDelete}
				onduplicate={handleDuplicate}
				onspawn={onspawn ? handleSpawn : undefined}
				onsetdefault={handleSetDefault}
			/>
		</div>
	{:else}
		<!-- Create/Edit View -->
		<AgentConfigEditor
			config={editingConfig}
			{agentTypes}
			{preselectedAgentTypeId}
			onsave={handleSave}
			oncancel={handleCancel}
			class="h-full"
		/>
	{/if}
</div>
