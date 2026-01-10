<script lang="ts">
	/**
	 * TASK-087: Sharing Controls Component
	 *
	 * Project-level sharing settings (public/private default).
	 * Toggle individual patterns public/private.
	 * Share patterns to specific projects (multi-select).
	 * Opt-out of receiving global patterns.
	 */
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import {
		Globe,
		Lock,
		Share2,
		Shield,
		Plus,
		X,
		Save,
		Check,
		Settings
	} from 'lucide-svelte';
	import type { ProjectSharingSettings, PatternSharingSettings } from '$lib/types/transfer';

	interface Props {
		projectId: string;
		projectSettings?: ProjectSharingSettings;
		patternSettings?: PatternSharingSettings[];
		availableProjects?: { id: string; name: string }[];
		onSaveProjectSettings?: (settings: ProjectSharingSettings) => Promise<void>;
		onSavePatternSettings?: (settings: PatternSharingSettings) => Promise<void>;
	}

	let {
		projectId,
		projectSettings = $bindable({
			projectId: '',
			defaultVisibility: 'private',
			allowIncomingTransfers: true,
			allowedSourceProjects: [],
			blockedProjects: []
		}),
		patternSettings = [],
		availableProjects = [],
		onSaveProjectSettings,
		onSavePatternSettings
	}: Props = $props();

	// Local state for editing
	let editedProjectSettings = $state<ProjectSharingSettings>({
		...projectSettings,
		projectId
	});
	let selectedPattern = $state<PatternSharingSettings | null>(null);
	let hasUnsavedChanges = $state(false);
	let isSaving = $state(false);
	let saveSuccess = $state(false);

	// Project selector for sharing
	let showProjectSelector = $state(false);
	let searchQuery = $state('');

	$effect(() => {
		editedProjectSettings = { ...projectSettings, projectId };
	});

	function toggleDefaultVisibility() {
		editedProjectSettings.defaultVisibility =
			editedProjectSettings.defaultVisibility === 'public' ? 'private' : 'public';
		hasUnsavedChanges = true;
	}

	function toggleIncomingTransfers() {
		editedProjectSettings.allowIncomingTransfers = !editedProjectSettings.allowIncomingTransfers;
		hasUnsavedChanges = true;
	}

	function addAllowedProject(projectId: string) {
		if (!editedProjectSettings.allowedSourceProjects.includes(projectId)) {
			editedProjectSettings.allowedSourceProjects = [
				...editedProjectSettings.allowedSourceProjects,
				projectId
			];
			// Remove from blocked if present
			editedProjectSettings.blockedProjects = editedProjectSettings.blockedProjects.filter(
				(p) => p !== projectId
			);
			hasUnsavedChanges = true;
		}
		showProjectSelector = false;
		searchQuery = '';
	}

	function removeAllowedProject(projectId: string) {
		editedProjectSettings.allowedSourceProjects =
			editedProjectSettings.allowedSourceProjects.filter((p) => p !== projectId);
		hasUnsavedChanges = true;
	}

	function addBlockedProject(projectId: string) {
		if (!editedProjectSettings.blockedProjects.includes(projectId)) {
			editedProjectSettings.blockedProjects = [...editedProjectSettings.blockedProjects, projectId];
			// Remove from allowed if present
			editedProjectSettings.allowedSourceProjects =
				editedProjectSettings.allowedSourceProjects.filter((p) => p !== projectId);
			hasUnsavedChanges = true;
		}
	}

	function removeBlockedProject(projectId: string) {
		editedProjectSettings.blockedProjects = editedProjectSettings.blockedProjects.filter(
			(p) => p !== projectId
		);
		hasUnsavedChanges = true;
	}

	async function saveProjectSettings() {
		if (!onSaveProjectSettings) return;

		isSaving = true;
		try {
			await onSaveProjectSettings(editedProjectSettings);
			hasUnsavedChanges = false;
			saveSuccess = true;
			setTimeout(() => (saveSuccess = false), 2000);
		} catch (e) {
			console.error('Failed to save settings:', e);
		} finally {
			isSaving = false;
		}
	}

	function togglePatternVisibility(pattern: PatternSharingSettings) {
		pattern.isPublic = !pattern.isPublic;
		if (onSavePatternSettings) {
			onSavePatternSettings(pattern);
		}
	}

	function togglePatternTransfer(pattern: PatternSharingSettings) {
		pattern.allowTransfer = !pattern.allowTransfer;
		if (onSavePatternSettings) {
			onSavePatternSettings(pattern);
		}
	}

	function addPatternShareProject(pattern: PatternSharingSettings, projectId: string) {
		if (!pattern.sharedWithProjects.includes(projectId)) {
			pattern.sharedWithProjects = [...pattern.sharedWithProjects, projectId];
			if (onSavePatternSettings) {
				onSavePatternSettings(pattern);
			}
		}
	}

	function removePatternShareProject(pattern: PatternSharingSettings, projectId: string) {
		pattern.sharedWithProjects = pattern.sharedWithProjects.filter((p) => p !== projectId);
		if (onSavePatternSettings) {
			onSavePatternSettings(pattern);
		}
	}

	$: filteredProjects = availableProjects.filter(
		(p) =>
			p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
			!editedProjectSettings.allowedSourceProjects.includes(p.id)
	);
</script>

<div class="space-y-6">
	<!-- Project-Level Settings -->
	<Card class="p-6">
		<div class="flex items-center justify-between mb-6">
			<h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
				<Settings class="w-5 h-5" />
				Project Sharing Settings
			</h2>
			{#if hasUnsavedChanges}
				<Button onclick={saveProjectSettings} disabled={isSaving} size="sm">
					{#if isSaving}
						<span class="animate-spin mr-1">
							<Save class="w-4 h-4" />
						</span>
						Saving...
					{:else if saveSuccess}
						<Check class="w-4 h-4 mr-1" />
						Saved
					{:else}
						<Save class="w-4 h-4 mr-1" />
						Save Changes
					{/if}
				</Button>
			{/if}
		</div>

		<div class="space-y-6">
			<!-- Default Visibility -->
			<div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
				<div class="flex items-center gap-3">
					{#if editedProjectSettings.defaultVisibility === 'public'}
						<Globe class="w-5 h-5 text-green-600" />
					{:else}
						<Lock class="w-5 h-5 text-gray-600" />
					{/if}
					<div>
						<h3 class="font-medium text-gray-900">Default Pattern Visibility</h3>
						<p class="text-sm text-gray-500">
							New patterns will be {editedProjectSettings.defaultVisibility} by default
						</p>
					</div>
				</div>
				<button
					type="button"
					class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors
								 {editedProjectSettings.defaultVisibility === 'public'
						? 'bg-green-500'
						: 'bg-gray-300'}"
					onclick={toggleDefaultVisibility}
				>
					<span
						class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform
									 {editedProjectSettings.defaultVisibility === 'public'
							? 'translate-x-6'
							: 'translate-x-1'}"
					></span>
				</button>
			</div>

			<!-- Incoming Transfers -->
			<div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
				<div class="flex items-center gap-3">
					<Shield
						class="w-5 h-5 {editedProjectSettings.allowIncomingTransfers
							? 'text-green-600'
							: 'text-red-600'}"
					/>
					<div>
						<h3 class="font-medium text-gray-900">Allow Incoming Transfers</h3>
						<p class="text-sm text-gray-500">
							{#if editedProjectSettings.allowIncomingTransfers}
								Other projects can transfer patterns to this project
							{:else}
								No incoming pattern transfers allowed
							{/if}
						</p>
					</div>
				</div>
				<button
					type="button"
					class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors
								 {editedProjectSettings.allowIncomingTransfers ? 'bg-green-500' : 'bg-gray-300'}"
					onclick={toggleIncomingTransfers}
				>
					<span
						class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform
									 {editedProjectSettings.allowIncomingTransfers
							? 'translate-x-6'
							: 'translate-x-1'}"
					></span>
				</button>
			</div>

			<!-- Allowed Source Projects -->
			<div class="p-4 border border-gray-200 rounded-lg">
				<div class="flex items-center justify-between mb-3">
					<div>
						<h3 class="font-medium text-gray-900">Allowed Source Projects</h3>
						<p class="text-sm text-gray-500">
							{editedProjectSettings.allowedSourceProjects.length === 0
								? 'Accept patterns from all projects'
								: 'Only accept patterns from these projects'}
						</p>
					</div>
					<Button variant="outline" size="sm" onclick={() => (showProjectSelector = true)}>
						<Plus class="w-4 h-4 mr-1" />
						Add Project
					</Button>
				</div>

				{#if editedProjectSettings.allowedSourceProjects.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each editedProjectSettings.allowedSourceProjects as allowedId}
							{@const project = availableProjects.find((p) => p.id === allowedId)}
							<Badge variant="default">
								{project?.name || allowedId}
								<button
									type="button"
									class="ml-1 hover:text-red-600"
									onclick={() => removeAllowedProject(allowedId)}
								>
									<X class="w-3 h-3" />
								</button>
							</Badge>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-gray-400 italic">All projects allowed</p>
				{/if}
			</div>

			<!-- Blocked Projects -->
			<div class="p-4 border border-red-200 rounded-lg bg-red-50">
				<div class="flex items-center justify-between mb-3">
					<div>
						<h3 class="font-medium text-gray-900">Blocked Projects</h3>
						<p class="text-sm text-gray-500">Never accept patterns from these projects</p>
					</div>
				</div>

				{#if editedProjectSettings.blockedProjects.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each editedProjectSettings.blockedProjects as blockedId}
							{@const project = availableProjects.find((p) => p.id === blockedId)}
							<Badge variant="destructive">
								{project?.name || blockedId}
								<button
									type="button"
									class="ml-1 hover:text-white"
									onclick={() => removeBlockedProject(blockedId)}
								>
									<X class="w-3 h-3" />
								</button>
							</Badge>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-gray-400 italic">No blocked projects</p>
				{/if}
			</div>
		</div>
	</Card>

	<!-- Pattern-Level Settings -->
	{#if patternSettings.length > 0}
		<Card class="p-6">
			<h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-6">
				<Share2 class="w-5 h-5" />
				Pattern Sharing Settings
			</h2>

			<div class="space-y-4">
				{#each patternSettings as pattern (pattern.patternId)}
					<div class="p-4 border border-gray-200 rounded-lg">
						<div class="flex items-center justify-between mb-4">
							<div>
								<h3 class="font-medium text-gray-900">{pattern.patternId}</h3>
								<div class="flex items-center gap-2 mt-1">
									<Badge variant={pattern.isPublic ? 'default' : 'secondary'}>
										{pattern.isPublic ? 'Public' : 'Private'}
									</Badge>
									<Badge variant={pattern.allowTransfer ? 'default' : 'warning'}>
										{pattern.allowTransfer ? 'Transferable' : 'No Transfer'}
									</Badge>
								</div>
							</div>
							<div class="flex gap-2">
								<Button
									variant="ghost"
									size="sm"
									onclick={() => togglePatternVisibility(pattern)}
								>
									{#if pattern.isPublic}
										<Lock class="w-4 h-4" />
									{:else}
										<Globe class="w-4 h-4" />
									{/if}
								</Button>
								<Button variant="ghost" size="sm" onclick={() => togglePatternTransfer(pattern)}>
									<Share2
										class={`w-4 h-4 ${pattern.allowTransfer ? 'text-green-600' : 'text-gray-400'}`}
									/>
								</Button>
							</div>
						</div>

						<!-- Shared With Projects -->
						<div>
							<div class="text-sm text-gray-600 mb-2">Shared with projects:</div>
							<div class="flex flex-wrap gap-2">
								{#each pattern.sharedWithProjects as sharedId}
									{@const project = availableProjects.find((p) => p.id === sharedId)}
									<Badge variant="outline">
										{project?.name || sharedId}
										<button
											type="button"
											class="ml-1 hover:text-red-600"
											onclick={() => removePatternShareProject(pattern, sharedId)}
										>
											<X class="w-3 h-3" />
										</button>
									</Badge>
								{/each}
								{#if pattern.sharedWithProjects.length === 0}
									<span class="text-sm text-gray-400 italic">
										{pattern.isPublic ? 'Available to all' : 'Not shared'}
									</span>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</Card>
	{/if}

	<!-- Project Selector Modal -->
	{#if showProjectSelector}
		<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
			<Card class="w-full max-w-md">
				<div class="p-4 border-b border-gray-200">
					<div class="flex items-center justify-between">
						<h3 class="font-semibold text-gray-900">Select Project</h3>
						<Button variant="ghost" size="icon" onclick={() => (showProjectSelector = false)}>
							<X class="w-4 h-4" />
						</Button>
					</div>
					<input
						type="text"
						placeholder="Search projects..."
						bind:value={searchQuery}
						class="w-full mt-3 px-3 py-2 border border-gray-300 rounded-md text-sm
									 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<div class="max-h-64 overflow-y-auto">
					{#each filteredProjects as project}
						<button
							type="button"
							class="w-full p-3 text-left hover:bg-gray-50 flex items-center justify-between
										 border-b border-gray-100 last:border-b-0"
							onclick={() => addAllowedProject(project.id)}
						>
							<span class="font-medium text-gray-900">{project.name}</span>
							<Plus class="w-4 h-4 text-gray-400" />
						</button>
					{:else}
						<div class="p-4 text-center text-gray-500">No projects found</div>
					{/each}
				</div>
			</Card>
		</div>
	{/if}
</div>
