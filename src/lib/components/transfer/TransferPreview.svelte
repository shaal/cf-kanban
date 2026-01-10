<script lang="ts">
	/**
	 * TASK-085: Transfer Preview Component
	 *
	 * Shows full pattern details before transfer.
	 * Estimates compatibility with current project.
	 * Previews integration and displays warnings for conflicts.
	 */
	import { onMount } from 'svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import {
		AlertTriangle,
		CheckCircle,
		XCircle,
		Info,
		FileCode,
		Package,
		Settings,
		Loader2
	} from 'lucide-svelte';
	import type { TransferPreview as TransferPreviewType, TransferConflict } from '$lib/types/transfer';

	interface Props {
		patternId: string;
		targetProjectId: string;
		onClose: () => void;
	}

	let { patternId, targetProjectId = $bindable(), onClose }: Props = $props();

	let preview: TransferPreviewType | null = $state(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		await loadPreview();
	});

	async function loadPreview() {
		if (!patternId) {
			loading = false;
			return;
		}

		loading = true;
		error = null;

		try {
			const response = await fetch(`/learning/transfer?/preview`, {
				method: 'POST',
				body: new URLSearchParams({
					patternId,
					targetProjectId: targetProjectId || 'default-project'
				})
			});

			const result = await response.json();

			if (result.type === 'success' && result.data?.preview) {
				preview = result.data.preview;
			} else if (result.type === 'failure') {
				error = result.data?.error || 'Failed to load preview';
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load preview';
		} finally {
			loading = false;
		}
	}

	// Reload preview when target project changes
	$effect(() => {
		if (targetProjectId && patternId) {
			loadPreview();
		}
	});

	function getCompatibilityColor(score: number): string {
		if (score >= 80) return 'text-green-600';
		if (score >= 60) return 'text-yellow-600';
		return 'text-red-600';
	}

	function getCompatibilityBg(score: number): string {
		if (score >= 80) return 'bg-green-50';
		if (score >= 60) return 'bg-yellow-50';
		return 'bg-red-50';
	}

	function getSeverityIcon(severity: TransferConflict['severity']) {
		switch (severity) {
			case 'high':
				return XCircle;
			case 'medium':
				return AlertTriangle;
			default:
				return Info;
		}
	}

	function getSeverityColor(severity: TransferConflict['severity']): string {
		switch (severity) {
			case 'high':
				return 'text-red-600';
			case 'medium':
				return 'text-yellow-600';
			default:
				return 'text-blue-600';
		}
	}

	function getSeverityBadgeVariant(
		severity: TransferConflict['severity']
	): 'destructive' | 'warning' | 'secondary' {
		switch (severity) {
			case 'high':
				return 'destructive';
			case 'medium':
				return 'warning';
			default:
				return 'secondary';
		}
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h2 class="text-xl font-semibold text-gray-900">Transfer Preview</h2>
		<Button variant="ghost" size="icon" onclick={onClose}>
			<XCircle class="w-5 h-5" />
		</Button>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<Loader2 class="w-8 h-8 text-blue-500 animate-spin" />
			<span class="ml-2 text-gray-600">Loading preview...</span>
		</div>
	{:else if error}
		<div class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
			{error}
		</div>
	{:else if preview}
		<!-- Pattern Details -->
		<Card class="p-4">
			<h3 class="font-medium text-gray-900 mb-3">Pattern Details</h3>
			<div class="space-y-3">
				<div class="flex justify-between">
					<span class="text-gray-600">Name</span>
					<span class="font-medium">{preview.pattern.name}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-gray-600">Source Project</span>
					<span class="font-medium">{preview.pattern.projectName}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-gray-600">Success Rate</span>
					<Badge variant={preview.pattern.successRate >= 0.8 ? 'default' : 'secondary'}>
						{Math.round(preview.pattern.successRate * 100)}%
					</Badge>
				</div>
				<div class="flex justify-between">
					<span class="text-gray-600">Usage Count</span>
					<span>{preview.pattern.usageCount} times</span>
				</div>
				{#if preview.pattern.description}
					<div class="pt-2 border-t">
						<p class="text-sm text-gray-600">{preview.pattern.description}</p>
					</div>
				{/if}
				{#if preview.pattern.agentConfig.length > 0}
					<div class="pt-2 border-t">
						<span class="text-gray-600 text-sm">Agents:</span>
						<div class="flex flex-wrap gap-1 mt-1">
							{#each preview.pattern.agentConfig as agent}
								<Badge variant="outline">{agent}</Badge>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</Card>

		<!-- Compatibility Score -->
		<Card class={`p-4 ${getCompatibilityBg(preview.compatibility.score)}`}>
			<div class="flex items-center justify-between">
				<h3 class="font-medium text-gray-900">Compatibility Score</h3>
				<div class="flex items-center gap-2">
					{#if preview.compatibility.score >= 80}
						<CheckCircle class="w-5 h-5 text-green-600" />
					{:else if preview.compatibility.score >= 60}
						<AlertTriangle class="w-5 h-5 text-yellow-600" />
					{:else}
						<XCircle class="w-5 h-5 text-red-600" />
					{/if}
					<span class={`text-2xl font-bold ${getCompatibilityColor(preview.compatibility.score)}`}>
						{preview.compatibility.score}%
					</span>
				</div>
			</div>
			<p class="text-sm text-gray-600 mt-2">
				{#if preview.compatibility.score >= 80}
					High compatibility - Transfer is recommended.
				{:else if preview.compatibility.score >= 60}
					Moderate compatibility - Review warnings before proceeding.
				{:else}
					Low compatibility - Consider resolving conflicts first.
				{/if}
			</p>
		</Card>

		<!-- Conflicts -->
		{#if preview.compatibility.conflicts.length > 0}
			<Card class="p-4 border-red-200">
				<h3 class="font-medium text-gray-900 mb-3 flex items-center gap-2">
					<AlertTriangle class="w-4 h-4 text-red-600" />
					Conflicts Detected ({preview.compatibility.conflicts.length})
				</h3>
				<div class="space-y-3">
					{#each preview.compatibility.conflicts as conflict}
						<div class="p-3 bg-gray-50 rounded-lg">
							<div class="flex items-start gap-2">
								<svelte:component
									this={getSeverityIcon(conflict.severity)}
									class={`w-4 h-4 mt-0.5 ${getSeverityColor(conflict.severity)}`}
								/>
								<div class="flex-1">
									<div class="flex items-center gap-2 mb-1">
										<Badge variant={getSeverityBadgeVariant(conflict.severity)}>
											{conflict.severity}
										</Badge>
										<span class="text-sm font-medium text-gray-700">
											{conflict.type.replace(/_/g, ' ')}
										</span>
									</div>
									<p class="text-sm text-gray-600">{conflict.description}</p>
									{#if conflict.resolution}
										<p class="text-sm text-blue-600 mt-1">
											Resolution: {conflict.resolution}
										</p>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</Card>
		{/if}

		<!-- Warnings -->
		{#if preview.compatibility.warnings.length > 0}
			<Card class="p-4 border-yellow-200">
				<h3 class="font-medium text-gray-900 mb-3 flex items-center gap-2">
					<Info class="w-4 h-4 text-yellow-600" />
					Warnings ({preview.compatibility.warnings.length})
				</h3>
				<ul class="space-y-2">
					{#each preview.compatibility.warnings as warning}
						<li class="text-sm text-gray-600 flex items-start gap-2">
							<span class="text-yellow-500">-</span>
							{warning}
						</li>
					{/each}
				</ul>
			</Card>
		{/if}

		<!-- Recommendations -->
		{#if preview.compatibility.recommendations.length > 0}
			<Card class="p-4 border-green-200">
				<h3 class="font-medium text-gray-900 mb-3 flex items-center gap-2">
					<CheckCircle class="w-4 h-4 text-green-600" />
					Recommendations
				</h3>
				<ul class="space-y-2">
					{#each preview.compatibility.recommendations as recommendation}
						<li class="text-sm text-gray-600 flex items-start gap-2">
							<span class="text-green-500">+</span>
							{recommendation}
						</li>
					{/each}
				</ul>
			</Card>
		{/if}

		<!-- Integration Preview -->
		<Card class="p-4">
			<h3 class="font-medium text-gray-900 mb-3">Integration Preview</h3>
			<div class="space-y-4">
				{#if preview.estimatedIntegration.affectedFiles.length > 0}
					<div>
						<div class="flex items-center gap-2 text-sm text-gray-700 mb-2">
							<FileCode class="w-4 h-4" />
							Affected Files
						</div>
						<ul class="space-y-1">
							{#each preview.estimatedIntegration.affectedFiles as file}
								<li class="text-sm text-gray-600 pl-6 font-mono">{file}</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#if preview.estimatedIntegration.newDependencies.length > 0}
					<div>
						<div class="flex items-center gap-2 text-sm text-gray-700 mb-2">
							<Package class="w-4 h-4" />
							New Dependencies
						</div>
						<div class="flex flex-wrap gap-1 pl-6">
							{#each preview.estimatedIntegration.newDependencies as dep}
								<Badge variant="outline">{dep}</Badge>
							{/each}
						</div>
					</div>
				{/if}

				{#if preview.estimatedIntegration.configChanges.length > 0}
					<div>
						<div class="flex items-center gap-2 text-sm text-gray-700 mb-2">
							<Settings class="w-4 h-4" />
							Config Changes
						</div>
						<ul class="space-y-1">
							{#each preview.estimatedIntegration.configChanges as change}
								<li class="text-sm text-gray-600 pl-6">{change}</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#if preview.estimatedIntegration.affectedFiles.length === 0 && preview.estimatedIntegration.newDependencies.length === 0 && preview.estimatedIntegration.configChanges.length === 0}
					<p class="text-sm text-gray-500">No significant integration changes required.</p>
				{/if}
			</div>
		</Card>
	{:else}
		<div class="text-center py-8 text-gray-500">
			Enter a target project ID to see the transfer preview.
		</div>
	{/if}
</div>
