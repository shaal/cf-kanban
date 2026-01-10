<script lang="ts">
	/**
	 * GAP-3.1.2: Resource Allocation Dashboard
	 *
	 * Displays and allows configuration of resource limits per project.
	 * Shows current usage vs. allocated resources with visual indicators.
	 */
	import { createEventDispatcher } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import {
		type ProjectResourceLimits,
		type ProjectResourceUsage,
		type ResourceHealthStatus,
		DEFAULT_PROJECT_RESOURCE_LIMITS,
		MAX_RESOURCE_LIMITS,
		MIN_RESOURCE_LIMITS,
		validateResourceLimits,
		getResourceHealthStatus,
		formatMemory
	} from '$lib/types/resources';
	import { Cpu, MemoryStick, Bot, Layers, Zap, Save, RotateCcw, AlertTriangle, CheckCircle } from 'lucide-svelte';

	interface Props {
		projectId: string;
		limits?: ProjectResourceLimits;
		usage?: ProjectResourceUsage;
		readonly?: boolean;
		class?: string;
	}

	let {
		projectId,
		limits = DEFAULT_PROJECT_RESOURCE_LIMITS,
		usage = {
			currentCpu: 0,
			currentMemory: 0,
			currentAgents: 0,
			currentSwarms: 0,
			currentApiCalls: 0,
			lastUpdated: Date.now()
		},
		readonly = false,
		class: className = ''
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		save: { projectId: string; limits: ProjectResourceLimits };
		reset: void;
	}>();

	// Local state for editing - use $derived for initial value from props
	let editedLimits = $state<ProjectResourceLimits>(structuredClone(limits));
	let hasChanges = $state(false);
	let isSaving = $state(false);
	let saveError = $state<string | null>(null);
	let saveSuccess = $state(false);

	// Sync editedLimits when limits prop changes from parent
	$effect(() => {
		if (!hasChanges) {
			editedLimits = structuredClone(limits);
		}
	});

	// Calculate percentages
	let percentages = $derived({
		cpu: limits.maxCpu > 0 ? (usage.currentCpu / limits.maxCpu) * 100 : 0,
		memory: limits.maxMemory > 0 ? (usage.currentMemory / limits.maxMemory) * 100 : 0,
		agents: limits.maxAgents > 0 ? (usage.currentAgents / limits.maxAgents) * 100 : 0,
		swarms: (limits.maxSwarms || 1) > 0 ? (usage.currentSwarms / (limits.maxSwarms || 1)) * 100 : 0,
		apiCalls: (limits.apiRateLimit || 1000) > 0 ? (usage.currentApiCalls / (limits.apiRateLimit || 1000)) * 100 : 0
	});

	// Validation
	let validation = $derived(validateResourceLimits(editedLimits));

	// Check for changes
	$effect(() => {
		hasChanges = JSON.stringify(editedLimits) !== JSON.stringify(limits);
	});

	function getStatusColor(status: ResourceHealthStatus): string {
		switch (status) {
			case 'critical':
				return 'bg-red-500';
			case 'warning':
				return 'bg-amber-500';
			default:
				return 'bg-green-500';
		}
	}

	function getStatusBgColor(status: ResourceHealthStatus): string {
		switch (status) {
			case 'critical':
				return 'bg-red-100';
			case 'warning':
				return 'bg-amber-100';
			default:
				return 'bg-gray-100';
		}
	}

	function getStatusTextColor(status: ResourceHealthStatus): string {
		switch (status) {
			case 'critical':
				return 'text-red-700';
			case 'warning':
				return 'text-amber-700';
			default:
				return 'text-gray-700';
		}
	}

	async function handleSave() {
		if (!validation.valid) return;

		isSaving = true;
		saveError = null;
		saveSuccess = false;

		try {
			const response = await fetch(`/api/projects/${projectId}/resources`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ limits: editedLimits })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to save resource limits');
			}

			saveSuccess = true;
			dispatch('save', { projectId, limits: editedLimits });

			// Reset success message after 3 seconds
			setTimeout(() => {
				saveSuccess = false;
			}, 3000);
		} catch (err) {
			saveError = err instanceof Error ? err.message : 'Failed to save';
		} finally {
			isSaving = false;
		}
	}

	function handleReset() {
		editedLimits = structuredClone(limits);
		hasChanges = false;
		saveError = null;
		dispatch('reset');
	}

	function handleResetToDefaults() {
		editedLimits = structuredClone(DEFAULT_PROJECT_RESOURCE_LIMITS);
	}
</script>

<div class="bg-white rounded-lg border shadow-sm {className}">
	<div class="p-4 border-b">
		<div class="flex items-center justify-between">
			<div>
				<h3 class="text-lg font-semibold">Resource Allocation</h3>
				<p class="text-sm text-gray-500 mt-1">Configure CPU, memory, and agent limits for this project</p>
			</div>
			{#if !readonly && hasChanges}
				<div class="flex items-center gap-2">
					<Button variant="ghost" size="sm" onclick={handleReset} disabled={isSaving}>
						<RotateCcw class="w-4 h-4 mr-1" />
						Reset
					</Button>
					<Button size="sm" onclick={handleSave} disabled={isSaving || !validation.valid}>
						<Save class="w-4 h-4 mr-1" />
						{isSaving ? 'Saving...' : 'Save Changes'}
					</Button>
				</div>
			{/if}
		</div>

		{#if saveError}
			<div class="mt-3 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700 text-sm">
				<AlertTriangle class="w-4 h-4 flex-shrink-0" />
				{saveError}
			</div>
		{/if}

		{#if saveSuccess}
			<div class="mt-3 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2 text-green-700 text-sm">
				<CheckCircle class="w-4 h-4 flex-shrink-0" />
				Resource limits saved successfully
			</div>
		{/if}

		{#if validation.warnings.length > 0}
			<div class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm">
				{#each validation.warnings as warning}
					<div class="flex items-center gap-2">
						<AlertTriangle class="w-4 h-4 flex-shrink-0" />
						{warning}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div class="p-4 space-y-6">
		<!-- CPU Allocation -->
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<Cpu class="w-5 h-5 text-blue-600" />
					<span class="font-medium">CPU Cores</span>
				</div>
				<div class="text-sm text-gray-500">
					{usage.currentCpu} / {editedLimits.maxCpu} cores
				</div>
			</div>

			<div class="flex items-center gap-4">
				<div class="flex-1">
					<div class="h-3 {getStatusBgColor(getResourceHealthStatus(percentages.cpu))} rounded-full overflow-hidden">
						<div
							class="h-full {getStatusColor(getResourceHealthStatus(percentages.cpu))} transition-all duration-300"
							style="width: {Math.min(100, percentages.cpu)}%"
						></div>
					</div>
				</div>
				<span class="text-sm font-medium {getStatusTextColor(getResourceHealthStatus(percentages.cpu))} w-12 text-right">
					{percentages.cpu.toFixed(0)}%
				</span>
			</div>

			{#if !readonly}
				<div class="flex items-center gap-3">
					<input
						type="range"
						min={MIN_RESOURCE_LIMITS.maxCpu}
						max={MAX_RESOURCE_LIMITS.maxCpu}
						bind:value={editedLimits.maxCpu}
						class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
					/>
					<input
						type="number"
						min={MIN_RESOURCE_LIMITS.maxCpu}
						max={MAX_RESOURCE_LIMITS.maxCpu}
						bind:value={editedLimits.maxCpu}
						class="w-20 px-2 py-1 border rounded-md text-sm text-center"
					/>
				</div>
			{/if}
		</div>

		<!-- Memory Allocation -->
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<MemoryStick class="w-5 h-5 text-purple-600" />
					<span class="font-medium">Memory</span>
				</div>
				<div class="text-sm text-gray-500">
					{formatMemory(usage.currentMemory)} / {formatMemory(editedLimits.maxMemory)}
				</div>
			</div>

			<div class="flex items-center gap-4">
				<div class="flex-1">
					<div class="h-3 {getStatusBgColor(getResourceHealthStatus(percentages.memory))} rounded-full overflow-hidden">
						<div
							class="h-full {getStatusColor(getResourceHealthStatus(percentages.memory))} transition-all duration-300"
							style="width: {Math.min(100, percentages.memory)}%"
						></div>
					</div>
				</div>
				<span class="text-sm font-medium {getStatusTextColor(getResourceHealthStatus(percentages.memory))} w-12 text-right">
					{percentages.memory.toFixed(0)}%
				</span>
			</div>

			{#if !readonly}
				<div class="flex items-center gap-3">
					<input
						type="range"
						min={MIN_RESOURCE_LIMITS.maxMemory}
						max={MAX_RESOURCE_LIMITS.maxMemory}
						step="512"
						bind:value={editedLimits.maxMemory}
						class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
					/>
					<select
						bind:value={editedLimits.maxMemory}
						class="w-24 px-2 py-1 border rounded-md text-sm"
					>
						<option value={512}>512MB</option>
						<option value={1024}>1GB</option>
						<option value={2048}>2GB</option>
						<option value={4096}>4GB</option>
						<option value={8192}>8GB</option>
						<option value={16384}>16GB</option>
						<option value={32768}>32GB</option>
						<option value={65536}>64GB</option>
					</select>
				</div>
			{/if}
		</div>

		<!-- Max Agents -->
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<Bot class="w-5 h-5 text-green-600" />
					<span class="font-medium">Max Agents</span>
				</div>
				<div class="text-sm text-gray-500">
					{usage.currentAgents} / {editedLimits.maxAgents} agents
				</div>
			</div>

			<div class="flex items-center gap-4">
				<div class="flex-1">
					<div class="h-3 {getStatusBgColor(getResourceHealthStatus(percentages.agents))} rounded-full overflow-hidden">
						<div
							class="h-full {getStatusColor(getResourceHealthStatus(percentages.agents))} transition-all duration-300"
							style="width: {Math.min(100, percentages.agents)}%"
						></div>
					</div>
				</div>
				<span class="text-sm font-medium {getStatusTextColor(getResourceHealthStatus(percentages.agents))} w-12 text-right">
					{percentages.agents.toFixed(0)}%
				</span>
			</div>

			{#if !readonly}
				<div class="flex items-center gap-3">
					<input
						type="range"
						min={MIN_RESOURCE_LIMITS.maxAgents}
						max={MAX_RESOURCE_LIMITS.maxAgents}
						bind:value={editedLimits.maxAgents}
						class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
					/>
					<input
						type="number"
						min={MIN_RESOURCE_LIMITS.maxAgents}
						max={MAX_RESOURCE_LIMITS.maxAgents}
						bind:value={editedLimits.maxAgents}
						class="w-20 px-2 py-1 border rounded-md text-sm text-center"
					/>
				</div>
			{/if}
		</div>

		<!-- Max Swarms -->
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<Layers class="w-5 h-5 text-orange-600" />
					<span class="font-medium">Max Swarms</span>
				</div>
				<div class="text-sm text-gray-500">
					{usage.currentSwarms} / {editedLimits.maxSwarms || 1} swarms
				</div>
			</div>

			<div class="flex items-center gap-4">
				<div class="flex-1">
					<div class="h-3 {getStatusBgColor(getResourceHealthStatus(percentages.swarms))} rounded-full overflow-hidden">
						<div
							class="h-full {getStatusColor(getResourceHealthStatus(percentages.swarms))} transition-all duration-300"
							style="width: {Math.min(100, percentages.swarms)}%"
						></div>
					</div>
				</div>
				<span class="text-sm font-medium {getStatusTextColor(getResourceHealthStatus(percentages.swarms))} w-12 text-right">
					{percentages.swarms.toFixed(0)}%
				</span>
			</div>

			{#if !readonly}
				<div class="flex items-center gap-3">
					<input
						type="range"
						min={MIN_RESOURCE_LIMITS.maxSwarms}
						max={MAX_RESOURCE_LIMITS.maxSwarms}
						bind:value={editedLimits.maxSwarms}
						class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
					/>
					<input
						type="number"
						min={MIN_RESOURCE_LIMITS.maxSwarms}
						max={MAX_RESOURCE_LIMITS.maxSwarms}
						bind:value={editedLimits.maxSwarms}
						class="w-20 px-2 py-1 border rounded-md text-sm text-center"
					/>
				</div>
			{/if}
		</div>

		<!-- API Rate Limit -->
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<Zap class="w-5 h-5 text-yellow-600" />
					<span class="font-medium">API Rate Limit</span>
				</div>
				<div class="text-sm text-gray-500">
					{usage.currentApiCalls.toLocaleString()} / {(editedLimits.apiRateLimit || 1000).toLocaleString()} /hr
				</div>
			</div>

			<div class="flex items-center gap-4">
				<div class="flex-1">
					<div class="h-3 {getStatusBgColor(getResourceHealthStatus(percentages.apiCalls))} rounded-full overflow-hidden">
						<div
							class="h-full {getStatusColor(getResourceHealthStatus(percentages.apiCalls))} transition-all duration-300"
							style="width: {Math.min(100, percentages.apiCalls)}%"
						></div>
					</div>
				</div>
				<span class="text-sm font-medium {getStatusTextColor(getResourceHealthStatus(percentages.apiCalls))} w-12 text-right">
					{percentages.apiCalls.toFixed(0)}%
				</span>
			</div>

			{#if !readonly}
				<div class="flex items-center gap-3">
					<input
						type="range"
						min={MIN_RESOURCE_LIMITS.apiRateLimit}
						max={MAX_RESOURCE_LIMITS.apiRateLimit}
						step="100"
						bind:value={editedLimits.apiRateLimit}
						class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
					/>
					<input
						type="number"
						min={MIN_RESOURCE_LIMITS.apiRateLimit}
						max={MAX_RESOURCE_LIMITS.apiRateLimit}
						step="100"
						bind:value={editedLimits.apiRateLimit}
						class="w-24 px-2 py-1 border rounded-md text-sm text-center"
					/>
				</div>
			{/if}
		</div>
	</div>

	{#if !readonly}
		<div class="p-4 border-t bg-gray-50">
			<div class="flex items-center justify-between">
				<Button variant="ghost" size="sm" onclick={handleResetToDefaults}>
					Reset to Defaults
				</Button>
				<p class="text-xs text-gray-500">
					Last updated: {new Date(usage.lastUpdated).toLocaleString()}
				</p>
			</div>
		</div>
	{/if}
</div>
