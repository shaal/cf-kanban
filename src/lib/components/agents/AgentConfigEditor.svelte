<script lang="ts">
	/**
	 * Agent Configuration Editor Component
	 * GAP-3.3.5: Custom Agent Configuration
	 *
	 * Form for creating and editing custom agent configurations.
	 */
	import { cn } from '$lib/utils';
	import * as Icons from 'lucide-svelte';
	import type {
		CustomAgentConfig,
		CreateCustomAgentConfigPayload,
		AgentCatalogEntry
	} from '$lib/types/agents';
	import { AVAILABLE_MODELS, validateCustomAgentConfig } from '$lib/types/agents';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';

	interface Props {
		/** Existing config to edit (null for create mode) */
		config?: CustomAgentConfig | null;
		/** Available agent types to choose from */
		agentTypes: AgentCatalogEntry[];
		/** Pre-selected agent type ID */
		preselectedAgentTypeId?: string;
		/** Handler for save */
		onsave: (payload: CreateCustomAgentConfigPayload) => void;
		/** Handler for cancel */
		oncancel: () => void;
		/** Additional CSS classes */
		class?: string;
	}

	let {
		config = null,
		agentTypes,
		preselectedAgentTypeId,
		onsave,
		oncancel,
		class: className = ''
	}: Props = $props();

	// Form state
	let name = $state(config?.name ?? '');
	let agentTypeId = $state(config?.agentTypeId ?? preselectedAgentTypeId ?? '');
	let prompt = $state(config?.prompt ?? '');
	let model = $state(config?.model ?? '');
	let maxTokens = $state(config?.maxTokens?.toString() ?? '');
	let temperature = $state(config?.temperature?.toString() ?? '');
	let description = $state(config?.description ?? '');
	let tagsInput = $state(config?.tags?.join(', ') ?? '');
	let isDefault = $state(config?.isDefault ?? false);

	// Environment variables state
	let envVars = $state<Array<{ key: string; value: string }>>(
		config?.env ? Object.entries(config.env).map(([key, value]) => ({ key, value })) : []
	);

	// Validation state
	let errors = $state<string[]>([]);
	let touched = $state(false);

	// Get selected agent type info
	const selectedAgentType = $derived(agentTypes.find((a) => a.id === agentTypeId));

	// Validate on change after first touch
	$effect(() => {
		if (touched) {
			const payload = buildPayload();
			errors = validateCustomAgentConfig(payload);
		}
	});

	// Build payload from form state
	function buildPayload(): CreateCustomAgentConfigPayload {
		const envRecord: Record<string, string> = {};
		for (const { key, value } of envVars) {
			if (key.trim()) {
				envRecord[key.trim()] = value;
			}
		}

		return {
			name: name.trim(),
			agentTypeId,
			prompt: prompt.trim() || undefined,
			model: model || undefined,
			maxTokens: maxTokens ? parseInt(maxTokens, 10) : undefined,
			temperature: temperature ? parseFloat(temperature) : undefined,
			env: Object.keys(envRecord).length > 0 ? envRecord : undefined,
			tags: tagsInput
				.split(',')
				.map((t) => t.trim())
				.filter(Boolean),
			description: description.trim() || undefined,
			isDefault
		};
	}

	// Handle form submission
	function handleSubmit(e: Event) {
		e.preventDefault();
		touched = true;

		const payload = buildPayload();
		const validationErrors = validateCustomAgentConfig(payload);

		if (validationErrors.length > 0) {
			errors = validationErrors;
			return;
		}

		onsave(payload);
	}

	// Add environment variable
	function addEnvVar() {
		envVars = [...envVars, { key: '', value: '' }];
	}

	// Remove environment variable
	function removeEnvVar(index: number) {
		envVars = envVars.filter((_, i) => i !== index);
	}
</script>

<form
	class={cn('bg-white rounded-lg border', className)}
	onsubmit={handleSubmit}
>
	<!-- Header -->
	<div class="p-4 border-b">
		<h2 class="text-lg font-semibold text-gray-900">
			{config ? 'Edit Configuration' : 'Create Configuration'}
		</h2>
		<p class="text-sm text-gray-500 mt-1">
			{config ? 'Modify your custom agent configuration' : 'Create a new custom agent configuration preset'}
		</p>
	</div>

	<!-- Form Content -->
	<div class="p-4 space-y-6 max-h-[60vh] overflow-y-auto">
		<!-- Validation Errors -->
		{#if errors.length > 0}
			<div class="bg-red-50 border border-red-200 rounded-lg p-3">
				<div class="flex items-start gap-2">
					<Icons.AlertCircle class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
					<div>
						<p class="text-sm font-medium text-red-800">Please fix the following errors:</p>
						<ul class="text-sm text-red-700 mt-1 list-disc list-inside">
							{#each errors as error}
								<li>{error}</li>
							{/each}
						</ul>
					</div>
				</div>
			</div>
		{/if}

		<!-- Basic Info Section -->
		<div class="space-y-4">
			<h3 class="text-sm font-medium text-gray-900 flex items-center gap-2">
				<Icons.Info class="w-4 h-4" />
				Basic Information
			</h3>

			<!-- Name -->
			<div>
				<label for="config-name" class="block text-sm font-medium text-gray-700 mb-1">
					Configuration Name <span class="text-red-500">*</span>
				</label>
				<Input
					id="config-name"
					bind:value={name}
					placeholder="e.g., Fast Code Review"
					oninput={() => (touched = true)}
				/>
			</div>

			<!-- Agent Type -->
			<div>
				<label for="agent-type" class="block text-sm font-medium text-gray-700 mb-1">
					Agent Type <span class="text-red-500">*</span>
				</label>
				<select
					id="agent-type"
					bind:value={agentTypeId}
					onchange={() => (touched = true)}
					class="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				>
					<option value="">Select an agent type...</option>
					{#each agentTypes as agent}
						<option value={agent.id}>{agent.name} - {agent.description.slice(0, 50)}...</option>
					{/each}
				</select>
				{#if selectedAgentType}
					<p class="text-xs text-gray-500 mt-1">{selectedAgentType.description}</p>
				{/if}
			</div>

			<!-- Description -->
			<div>
				<label for="config-description" class="block text-sm font-medium text-gray-700 mb-1">
					Description
				</label>
				<textarea
					id="config-description"
					bind:value={description}
					placeholder="What is this configuration for?"
					rows="2"
					class="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
				></textarea>
			</div>

			<!-- Tags -->
			<div>
				<label for="config-tags" class="block text-sm font-medium text-gray-700 mb-1">
					Tags
				</label>
				<Input
					id="config-tags"
					bind:value={tagsInput}
					placeholder="e.g., fast, review, quality (comma-separated)"
				/>
				<p class="text-xs text-gray-500 mt-1">Separate tags with commas</p>
			</div>

			<!-- Default checkbox -->
			<div class="flex items-center gap-2">
				<input
					type="checkbox"
					id="is-default"
					bind:checked={isDefault}
					class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
				/>
				<label for="is-default" class="text-sm text-gray-700">
					Set as default configuration for this agent type
				</label>
			</div>
		</div>

		<!-- Model Settings Section -->
		<div class="space-y-4 pt-4 border-t">
			<h3 class="text-sm font-medium text-gray-900 flex items-center gap-2">
				<Icons.Cpu class="w-4 h-4" />
				Model Settings
			</h3>

			<!-- Model Selection -->
			<div>
				<label for="model" class="block text-sm font-medium text-gray-700 mb-1">
					Model
				</label>
				<select
					id="model"
					bind:value={model}
					class="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				>
					<option value="">Use default model</option>
					{#each AVAILABLE_MODELS as modelOption}
						<option value={modelOption.id}>{modelOption.name}</option>
					{/each}
				</select>
				{#if model}
					{@const selectedModel = AVAILABLE_MODELS.find((m) => m.id === model)}
					{#if selectedModel}
						<p class="text-xs text-gray-500 mt-1">{selectedModel.description}</p>
					{/if}
				{/if}
			</div>

			<!-- Temperature and Max Tokens in a row -->
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="temperature" class="block text-sm font-medium text-gray-700 mb-1">
						Temperature
					</label>
					<Input
						id="temperature"
						type="number"
						bind:value={temperature}
						placeholder="0.0 - 1.0"
					/>
					<p class="text-xs text-gray-500 mt-1">0 = deterministic, 1 = creative</p>
				</div>
				<div>
					<label for="max-tokens" class="block text-sm font-medium text-gray-700 mb-1">
						Max Tokens
					</label>
					<Input
						id="max-tokens"
						type="number"
						bind:value={maxTokens}
						placeholder="e.g., 4096"
					/>
					<p class="text-xs text-gray-500 mt-1">100 - 100,000</p>
				</div>
			</div>
		</div>

		<!-- Custom Prompt Section -->
		<div class="space-y-4 pt-4 border-t">
			<h3 class="text-sm font-medium text-gray-900 flex items-center gap-2">
				<Icons.MessageSquare class="w-4 h-4" />
				Custom Instructions
			</h3>

			<div>
				<label for="prompt" class="block text-sm font-medium text-gray-700 mb-1">
					Custom Prompt / Instructions
				</label>
				<textarea
					id="prompt"
					bind:value={prompt}
					placeholder="Add custom instructions for the agent..."
					rows="4"
					class="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono"
				></textarea>
				<p class="text-xs text-gray-500 mt-1">
					{prompt.length}/10,000 characters
				</p>
			</div>
		</div>

		<!-- Environment Variables Section -->
		<div class="space-y-4 pt-4 border-t">
			<div class="flex items-center justify-between">
				<h3 class="text-sm font-medium text-gray-900 flex items-center gap-2">
					<Icons.Settings2 class="w-4 h-4" />
					Environment Variables
				</h3>
				<Button type="button" variant="outline" size="sm" onclick={addEnvVar}>
					<Icons.Plus class="w-4 h-4 mr-1" />
					Add Variable
				</Button>
			</div>

			{#if envVars.length === 0}
				<p class="text-sm text-gray-500 italic">No environment variables defined</p>
			{:else}
				<div class="space-y-2">
					{#each envVars as envVar, index}
						<div class="flex items-center gap-2">
							<Input
								bind:value={envVar.key}
								placeholder="KEY"
								class="flex-1 font-mono"
							/>
							<span class="text-gray-400">=</span>
							<Input
								bind:value={envVar.value}
								placeholder="value"
								class="flex-1 font-mono"
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onclick={() => removeEnvVar(index)}
							>
								<Icons.X class="w-4 h-4" />
							</Button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Footer Actions -->
	<div class="p-4 border-t bg-gray-50 flex items-center justify-end gap-3">
		<Button type="button" variant="outline" onclick={oncancel}>
			Cancel
		</Button>
		<Button type="submit">
			<Icons.Save class="w-4 h-4 mr-2" />
			{config ? 'Update Configuration' : 'Create Configuration'}
		</Button>
	</div>
</form>
