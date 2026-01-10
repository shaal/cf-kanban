<script lang="ts">
	/**
	 * GAP-3.4.4: Pattern Transfer Modal
	 *
	 * Modal component for transferring a pattern to another project.
	 * Includes validation, preview, and confirmation workflow.
	 */
	import { onMount } from 'svelte';
	import type { Pattern } from '$lib/types/patterns';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import {
		X,
		ArrowRight,
		AlertTriangle,
		CheckCircle,
		XCircle,
		Loader2,
		FolderGit2,
		Shield,
		Info
	} from 'lucide-svelte';

	interface Props {
		pattern: Pattern;
		onClose: () => void;
		onTransferComplete?: (result: TransferResult) => void;
	}

	interface TransferResult {
		success: boolean;
		transferId: string;
		targetPatternId?: string;
		error?: string;
	}

	interface ValidationResult {
		valid: boolean;
		score: number;
		hasBlockingConflicts: boolean;
		conflictCount: number;
		warningCount: number;
		message: string;
	}

	interface TransferPreview {
		pattern: {
			id: string;
			name: string;
			projectName: string;
			successRate: number;
		};
		compatibility: {
			score: number;
			conflicts: Array<{
				type: string;
				severity: 'high' | 'medium' | 'low';
				description: string;
				resolution?: string;
			}>;
			warnings: string[];
			recommendations: string[];
		};
		estimatedIntegration: {
			affectedFiles: string[];
			newDependencies: string[];
			configChanges: string[];
		};
		isRecommended: boolean;
		validationPassed: boolean;
	}

	let { pattern, onClose, onTransferComplete }: Props = $props();

	let targetProjectId = $state('');
	let step: 'select' | 'validate' | 'preview' | 'confirm' | 'complete' = $state('select');
	let isValidating = $state(false);
	let isTransferring = $state(false);
	let validation = $state<ValidationResult | null>(null);
	let preview = $state<TransferPreview | null>(null);
	let transferResult = $state<TransferResult | null>(null);
	let error = $state<string | null>(null);

	// Available projects for transfer (mock data - would come from API)
	let availableProjects = $state([
		{ id: 'project-alpha', name: 'Project Alpha' },
		{ id: 'project-beta', name: 'Project Beta' },
		{ id: 'project-gamma', name: 'Project Gamma' },
		{ id: 'project-delta', name: 'Project Delta' }
	]);

	onMount(async () => {
		// Fetch available projects from API
		try {
			const response = await fetch('/api/projects');
			if (response.ok) {
				const data = await response.json();
				if (data.projects && data.projects.length > 0) {
					availableProjects = data.projects.map((p: { id: string; name: string }) => ({
						id: p.id,
						name: p.name
					}));
				}
			}
		} catch {
			// Use mock data if API fails
		}
	});

	async function validateTransfer() {
		if (!targetProjectId) return;

		isValidating = true;
		error = null;

		try {
			const response = await fetch('/api/patterns/transfer/validate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					patternId: pattern.id,
					targetProjectId
				})
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Validation failed');
			}

			validation = data;
			step = 'validate';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Validation failed';
		} finally {
			isValidating = false;
		}
	}

	async function loadPreview() {
		if (!validation?.valid) return;

		isValidating = true;
		error = null;

		try {
			const response = await fetch('/api/patterns/transfer/preview', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					patternId: pattern.id,
					targetProjectId
				})
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to load preview');
			}

			preview = data;
			step = 'preview';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load preview';
		} finally {
			isValidating = false;
		}
	}

	async function executeTransfer() {
		isTransferring = true;
		error = null;

		try {
			const response = await fetch('/api/patterns/transfer', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					patternId: pattern.id,
					targetProjectId
				})
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Transfer failed');
			}

			transferResult = data;
			step = 'complete';

			if (onTransferComplete) {
				onTransferComplete(data);
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Transfer failed';
		} finally {
			isTransferring = false;
		}
	}

	function getScoreColor(score: number): string {
		if (score >= 80) return 'text-green-600';
		if (score >= 60) return 'text-yellow-600';
		return 'text-red-600';
	}

	function getScoreBg(score: number): string {
		if (score >= 80) return 'bg-green-50';
		if (score >= 60) return 'bg-yellow-50';
		return 'bg-red-50';
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Modal Backdrop -->
<div
	class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
	onclick={() => onClose()}
	onkeydown={(e) => e.key === 'Enter' && onClose()}
	role="dialog"
	aria-modal="true"
	aria-labelledby="transfer-modal-title"
>
	<!-- Modal Content -->
	<Card
		class="w-full max-w-lg max-h-[90vh] overflow-y-auto"
		onclick={(e: MouseEvent) => e.stopPropagation()}
	>
		<div class="p-6">
			<!-- Header -->
			<div class="flex items-center justify-between mb-6">
				<h2 id="transfer-modal-title" class="text-xl font-semibold text-gray-900 flex items-center gap-2">
					<ArrowRight class="w-5 h-5 text-purple-600" />
					Transfer Pattern
				</h2>
				<button
					type="button"
					class="p-1 text-gray-400 hover:text-gray-600 rounded"
					onclick={onClose}
					aria-label="Close"
				>
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- Pattern Info -->
			<div class="p-4 bg-gray-50 rounded-lg mb-6">
				<div class="flex items-center gap-3">
					<div class="p-2 bg-purple-100 rounded-lg">
						<FolderGit2 class="w-5 h-5 text-purple-600" />
					</div>
					<div>
						<h3 class="font-medium text-gray-900">{pattern.name}</h3>
						<p class="text-sm text-gray-500">{pattern.namespace} / {pattern.key}</p>
					</div>
				</div>
			</div>

			<!-- Error Display -->
			{#if error}
				<div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
					<div class="flex items-start gap-2">
						<XCircle class="w-5 h-5 text-red-600 mt-0.5" />
						<p class="text-sm text-red-700">{error}</p>
					</div>
				</div>
			{/if}

			<!-- Step: Select Project -->
			{#if step === 'select'}
				<div class="space-y-4">
					<div>
						<label for="target-project" class="block text-sm font-medium text-gray-700 mb-2">
							Select Target Project
						</label>
						<select
							id="target-project"
							bind:value={targetProjectId}
							class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
								focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
						>
							<option value="">Choose a project...</option>
							{#each availableProjects as project}
								<option value={project.id}>{project.name}</option>
							{/each}
						</select>
					</div>

					<div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
						<div class="flex items-start gap-2">
							<Info class="w-5 h-5 text-blue-600 mt-0.5" />
							<p class="text-sm text-blue-700">
								Transferring a pattern creates a copy in the target project. The original pattern
								remains unchanged.
							</p>
						</div>
					</div>

					<div class="flex gap-2 pt-4">
						<Button variant="ghost" class="flex-1" onclick={onClose}>
							Cancel
						</Button>
						<Button
							class="flex-1"
							disabled={!targetProjectId || isValidating}
							onclick={validateTransfer}
						>
							{#if isValidating}
								<Loader2 class="w-4 h-4 mr-2 animate-spin" />
								Validating...
							{:else}
								<Shield class="w-4 h-4 mr-2" />
								Validate Transfer
							{/if}
						</Button>
					</div>
				</div>
			{/if}

			<!-- Step: Validation Results -->
			{#if step === 'validate' && validation}
				<div class="space-y-4">
					<!-- Compatibility Score -->
					<div class={`p-4 rounded-lg ${getScoreBg(validation.score)}`}>
						<div class="flex items-center justify-between">
							<span class="font-medium text-gray-900">Compatibility Score</span>
							<div class="flex items-center gap-2">
								{#if validation.valid}
									<CheckCircle class="w-5 h-5 text-green-600" />
								{:else}
									<XCircle class="w-5 h-5 text-red-600" />
								{/if}
								<span class={`text-2xl font-bold ${getScoreColor(validation.score)}`}>
									{validation.score}%
								</span>
							</div>
						</div>
						<p class="text-sm text-gray-600 mt-2">{validation.message}</p>
					</div>

					<!-- Stats -->
					<div class="grid grid-cols-2 gap-4">
						<div class="p-3 bg-gray-50 rounded-lg">
							<div class="text-sm text-gray-500">Conflicts</div>
							<div class="text-lg font-semibold {validation.hasBlockingConflicts ? 'text-red-600' : 'text-gray-900'}">
								{validation.conflictCount}
							</div>
						</div>
						<div class="p-3 bg-gray-50 rounded-lg">
							<div class="text-sm text-gray-500">Warnings</div>
							<div class="text-lg font-semibold text-yellow-600">
								{validation.warningCount}
							</div>
						</div>
					</div>

					<div class="flex gap-2 pt-4">
						<Button variant="ghost" class="flex-1" onclick={() => { step = 'select'; validation = null; }}>
							Back
						</Button>
						{#if validation.valid}
							<Button class="flex-1" onclick={loadPreview} disabled={isValidating}>
								{#if isValidating}
									<Loader2 class="w-4 h-4 mr-2 animate-spin" />
								{/if}
								View Preview
							</Button>
						{:else}
							<Button variant="destructive" class="flex-1" onclick={onClose}>
								Transfer Blocked
							</Button>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Step: Preview -->
			{#if step === 'preview' && preview}
				<div class="space-y-4">
					<!-- Conflicts -->
					{#if preview.compatibility.conflicts.length > 0}
						<div class="p-4 border border-yellow-200 rounded-lg">
							<h4 class="font-medium text-gray-900 mb-2 flex items-center gap-2">
								<AlertTriangle class="w-4 h-4 text-yellow-600" />
								Conflicts ({preview.compatibility.conflicts.length})
							</h4>
							<ul class="space-y-2">
								{#each preview.compatibility.conflicts as conflict}
									<li class="text-sm text-gray-600">
										<Badge variant={conflict.severity === 'high' ? 'destructive' : 'warning'}>
											{conflict.severity}
										</Badge>
										<span class="ml-2">{conflict.description}</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					<!-- Recommendations -->
					{#if preview.compatibility.recommendations.length > 0}
						<div class="p-4 border border-green-200 rounded-lg">
							<h4 class="font-medium text-gray-900 mb-2 flex items-center gap-2">
								<CheckCircle class="w-4 h-4 text-green-600" />
								Recommendations
							</h4>
							<ul class="space-y-1">
								{#each preview.compatibility.recommendations as rec}
									<li class="text-sm text-gray-600 flex items-start gap-2">
										<span class="text-green-500">+</span>
										{rec}
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					<!-- Integration Preview -->
					{#if preview.estimatedIntegration.affectedFiles.length > 0 ||
						preview.estimatedIntegration.newDependencies.length > 0}
						<div class="p-4 bg-gray-50 rounded-lg">
							<h4 class="font-medium text-gray-900 mb-2">Integration Preview</h4>
							{#if preview.estimatedIntegration.affectedFiles.length > 0}
								<div class="mb-2">
									<span class="text-xs text-gray-500">Affected Files:</span>
									<p class="text-sm font-mono text-gray-700">
										{preview.estimatedIntegration.affectedFiles.join(', ')}
									</p>
								</div>
							{/if}
							{#if preview.estimatedIntegration.newDependencies.length > 0}
								<div>
									<span class="text-xs text-gray-500">New Dependencies:</span>
									<div class="flex flex-wrap gap-1 mt-1">
										{#each preview.estimatedIntegration.newDependencies as dep}
											<Badge variant="outline">{dep}</Badge>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/if}

					<div class="flex gap-2 pt-4">
						<Button variant="ghost" class="flex-1" onclick={() => { step = 'validate'; }}>
							Back
						</Button>
						<Button
							class="flex-1"
							onclick={() => { step = 'confirm'; }}
							disabled={!preview.validationPassed}
						>
							Proceed to Transfer
						</Button>
					</div>
				</div>
			{/if}

			<!-- Step: Confirm -->
			{#if step === 'confirm'}
				<div class="space-y-4">
					<div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
						<div class="flex items-start gap-2">
							<AlertTriangle class="w-5 h-5 text-yellow-600 mt-0.5" />
							<div>
								<h4 class="font-medium text-yellow-800">Confirm Transfer</h4>
								<p class="text-sm text-yellow-700 mt-1">
									You are about to transfer "<strong>{pattern.name}</strong>" to the selected project.
									This action can be rolled back from the transfer history.
								</p>
							</div>
						</div>
					</div>

					<div class="flex gap-2 pt-4">
						<Button variant="ghost" class="flex-1" onclick={() => { step = 'preview'; }} disabled={isTransferring}>
							Back
						</Button>
						<Button class="flex-1" onclick={executeTransfer} disabled={isTransferring}>
							{#if isTransferring}
								<Loader2 class="w-4 h-4 mr-2 animate-spin" />
								Transferring...
							{:else}
								<ArrowRight class="w-4 h-4 mr-2" />
								Confirm Transfer
							{/if}
						</Button>
					</div>
				</div>
			{/if}

			<!-- Step: Complete -->
			{#if step === 'complete' && transferResult}
				<div class="space-y-4 text-center">
					<div class="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
						<CheckCircle class="w-8 h-8 text-green-600" />
					</div>
					<div>
						<h3 class="text-lg font-semibold text-gray-900">Transfer Complete!</h3>
						<p class="text-sm text-gray-600 mt-1">
							Pattern has been successfully transferred.
						</p>
					</div>

					<div class="p-4 bg-gray-50 rounded-lg text-left">
						<div class="text-sm">
							<div class="flex justify-between py-1">
								<span class="text-gray-500">Transfer ID:</span>
								<span class="font-mono text-gray-900">{transferResult.transferId}</span>
							</div>
							{#if transferResult.targetPatternId}
								<div class="flex justify-between py-1">
									<span class="text-gray-500">New Pattern ID:</span>
									<span class="font-mono text-gray-900">{transferResult.targetPatternId}</span>
								</div>
							{/if}
						</div>
					</div>

					<Button class="w-full" onclick={onClose}>
						Done
					</Button>
				</div>
			{/if}
		</div>
	</Card>
</div>
