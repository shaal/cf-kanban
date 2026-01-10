<script lang="ts">
	/**
	 * GAP-3.1.2: Project Settings Page
	 *
	 * Allows users to configure project settings including:
	 * - General project information
	 * - Resource allocation limits (CPU, memory, agents)
	 * - Workspace path configuration
	 */
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import { ResourceAllocationDashboard } from '$lib/components/resources';
	import { ArrowLeft, Save, Settings, HardDrive, Bot, AlertCircle } from 'lucide-svelte';

	export let data: PageData;

	let projectName = $state(data.project.name);
	let projectDescription = $state(data.project.description || '');
	let workspacePath = $state(data.project.workspacePath || '');

	let isSaving = $state(false);
	let saveError = $state<string | null>(null);
	let saveSuccess = $state(false);

	let hasGeneralChanges = $derived(
		projectName !== data.project.name ||
		projectDescription !== (data.project.description || '') ||
		workspacePath !== (data.project.workspacePath || '')
	);

	async function handleSaveGeneral() {
		if (!hasGeneralChanges) return;

		isSaving = true;
		saveError = null;
		saveSuccess = false;

		try {
			const response = await fetch(`/api/projects/${data.project.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: projectName,
					description: projectDescription || null,
					workspacePath: workspacePath || null
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to save project settings');
			}

			saveSuccess = true;
			await invalidateAll();

			setTimeout(() => {
				saveSuccess = false;
			}, 3000);
		} catch (err) {
			saveError = err instanceof Error ? err.message : 'Failed to save';
		} finally {
			isSaving = false;
		}
	}

	function handleResourceSave() {
		// Refresh data after resource limits are saved
		invalidateAll();
	}
</script>

<svelte:head>
	<title>Settings - {data.project.name} | CF Kanban</title>
</svelte:head>

<main class="min-h-screen bg-gray-50">
	<header class="bg-white border-b px-6 py-4">
		<div class="max-w-4xl mx-auto flex items-center gap-4">
			<a href="/projects/{data.project.id}" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
				<ArrowLeft class="w-5 h-5" />
			</a>
			<div class="flex-1">
				<div class="flex items-center gap-2">
					<Settings class="w-5 h-5 text-gray-500" />
					<h1 class="text-xl font-bold">Project Settings</h1>
				</div>
				<p class="text-gray-600 text-sm mt-0.5">{data.project.name}</p>
			</div>
		</div>
	</header>

	<div class="max-w-4xl mx-auto py-8 px-6 space-y-8">
		<!-- General Settings -->
		<section class="bg-white rounded-lg border shadow-sm">
			<div class="p-4 border-b">
				<h2 class="text-lg font-semibold">General Settings</h2>
				<p class="text-sm text-gray-500 mt-1">Basic project information</p>
			</div>

			<div class="p-4 space-y-4">
				{#if saveError}
					<div class="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700 text-sm">
						<AlertCircle class="w-4 h-4 flex-shrink-0" />
						{saveError}
					</div>
				{/if}

				{#if saveSuccess}
					<div class="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
						Settings saved successfully
					</div>
				{/if}

				<div>
					<label for="name" class="block text-sm font-medium mb-1">Project Name</label>
					<input
						type="text"
						id="name"
						bind:value={projectName}
						class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						placeholder="Enter project name"
					/>
				</div>

				<div>
					<label for="description" class="block text-sm font-medium mb-1">Description</label>
					<textarea
						id="description"
						bind:value={projectDescription}
						rows="3"
						class="w-full px-3 py-2 border rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						placeholder="Enter project description"
					></textarea>
				</div>

				<div>
					<label for="workspace" class="block text-sm font-medium mb-1">
						<span class="flex items-center gap-2">
							<HardDrive class="w-4 h-4" />
							Workspace Path
						</span>
					</label>
					<input
						type="text"
						id="workspace"
						bind:value={workspacePath}
						class="w-full px-3 py-2 border rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						placeholder="/path/to/your/project"
					/>
					<p class="text-xs text-gray-500 mt-1">
						The local filesystem path where Claude Code will operate
					</p>
				</div>

				{#if data.project.template}
					<div>
						<label class="block text-sm font-medium mb-1">
							<span class="flex items-center gap-2">
								<Bot class="w-4 h-4" />
								Project Template
							</span>
						</label>
						<div class="px-3 py-2 bg-gray-50 border rounded-md text-sm">
							{data.project.template.name}
							<span class="text-gray-500 ml-1">({data.project.template.slug})</span>
						</div>
					</div>
				{/if}

				<div class="flex justify-end pt-4 border-t">
					<Button
						onclick={handleSaveGeneral}
						disabled={!hasGeneralChanges || isSaving}
					>
						<Save class="w-4 h-4 mr-2" />
						{isSaving ? 'Saving...' : 'Save Changes'}
					</Button>
				</div>
			</div>
		</section>

		<!-- Resource Allocation -->
		<section>
			<ResourceAllocationDashboard
				projectId={data.project.id}
				limits={data.resourceLimits}
				usage={data.resourceUsage}
				on:save={handleResourceSave}
			/>
		</section>
	</div>
</main>
