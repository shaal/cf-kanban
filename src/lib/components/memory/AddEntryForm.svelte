<script lang="ts">
	/**
	 * TASK-083: Add Memory Entry Form Component
	 *
	 * Form for manually adding memory entries with:
	 * - Namespace selection dropdown
	 * - Key input with validation
	 * - Value textarea with markdown support
	 * - Tags input (comma separated)
	 */
	import { createEventDispatcher } from 'svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { Plus, X, AlertCircle, Check, Loader2 } from 'lucide-svelte';

	interface MemoryEntry {
		key: string;
		value: string;
		namespace: string;
		tags?: string[];
	}

	interface Props {
		namespaces?: string[];
		defaultNamespace?: string;
		onSubmit?: (entry: MemoryEntry) => Promise<void>;
		class?: string;
	}

	let {
		namespaces = ['default', 'patterns', 'solutions', 'errors'],
		defaultNamespace = 'default',
		onSubmit,
		class: className = ''
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		submit: MemoryEntry;
		cancel: void;
	}>();

	// Form state
	let key = $state('');
	let value = $state('');
	let selectedNamespace = $state(defaultNamespace);
	let customNamespace = $state('');
	let tagsInput = $state('');

	// UI state
	let isSubmitting = $state(false);
	let isCheckingKey = $state(false);
	let keyExists = $state(false);
	let submitError = $state<string | null>(null);
	let submitSuccess = $state(false);

	// Validation
	let keyError = $state<string | null>(null);
	let valueError = $state<string | null>(null);

	// Derived state
	$: effectiveNamespace = selectedNamespace === '_custom' ? customNamespace : selectedNamespace;
	$: parsedTags = parseTags(tagsInput);
	$: isValid = !keyError && !valueError && key.trim().length > 0 && value.trim().length > 0;

	function validateKey(keyValue: string): string | null {
		if (!keyValue || keyValue.trim().length === 0) {
			return 'Key is required';
		}
		if (keyValue.length > 100) {
			return 'Key must be 100 characters or less';
		}
		if (!/^[a-zA-Z0-9_-]+$/.test(keyValue)) {
			return 'Key can only contain letters, numbers, underscores, and hyphens';
		}
		return null;
	}

	function validateValue(valueText: string): string | null {
		if (!valueText || valueText.trim().length === 0) {
			return 'Value is required';
		}
		if (valueText.length > 10000) {
			return 'Value must be 10000 characters or less';
		}
		return null;
	}

	function parseTags(input: string): string[] {
		return input
			.split(',')
			.map(tag => tag.trim())
			.filter(tag => tag.length > 0);
	}

	// Validate key on input
	$effect(() => {
		keyError = validateKey(key);
	});

	// Validate value on input
	$effect(() => {
		valueError = validateValue(value);
	});

	// Check if key exists (debounced)
	let keyCheckTimer: ReturnType<typeof setTimeout> | null = null;
	$effect(() => {
		if (keyCheckTimer) clearTimeout(keyCheckTimer);

		if (key.trim().length > 0 && !keyError) {
			isCheckingKey = true;
			keyCheckTimer = setTimeout(async () => {
				try {
					const params = new URLSearchParams({
						key: key.trim(),
						namespace: effectiveNamespace
					});
					const response = await fetch(`/api/memory/exists?${params}`);
					const data = await response.json();
					keyExists = data.exists;
				} catch {
					keyExists = false;
				} finally {
					isCheckingKey = false;
				}
			}, 500);
		} else {
			keyExists = false;
			isCheckingKey = false;
		}

		return () => {
			if (keyCheckTimer) clearTimeout(keyCheckTimer);
		};
	});

	async function handleSubmit(event: Event) {
		event.preventDefault();

		if (!isValid || isSubmitting) return;

		isSubmitting = true;
		submitError = null;
		submitSuccess = false;

		const entry: MemoryEntry = {
			key: key.trim(),
			value: value.trim(),
			namespace: effectiveNamespace,
			tags: parsedTags.length > 0 ? parsedTags : undefined
		};

		try {
			if (onSubmit) {
				await onSubmit(entry);
			} else {
				const response = await fetch('/api/memory/store', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(entry)
				});

				if (!response.ok) {
					const data = await response.json();
					throw new Error(data.error || 'Failed to store entry');
				}
			}

			submitSuccess = true;
			dispatch('submit', entry);

			// Reset form after success
			setTimeout(() => {
				key = '';
				value = '';
				tagsInput = '';
				submitSuccess = false;
			}, 1500);
		} catch (error) {
			submitError = error instanceof Error ? error.message : 'Failed to store entry';
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		dispatch('cancel');
	}
</script>

<Card class="p-6 {className}">
	<form onsubmit={handleSubmit} class="space-y-6">
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold">Add Memory Entry</h2>
			<Button variant="ghost" size="icon" type="button" onclick={handleCancel}>
				<X class="w-4 h-4" />
			</Button>
		</div>

		<!-- Namespace Selection -->
		<div class="space-y-2">
			<label for="namespace" class="block text-sm font-medium text-gray-700">
				Namespace
			</label>
			<div class="flex gap-2">
				<select
					id="namespace"
					bind:value={selectedNamespace}
					class="flex-1 h-10 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					{#each namespaces as ns}
						<option value={ns}>{ns}</option>
					{/each}
					<option value="_custom">Custom...</option>
				</select>
				{#if selectedNamespace === '_custom'}
					<Input
						bind:value={customNamespace}
						placeholder="Enter namespace"
						class="flex-1"
					/>
				{/if}
			</div>
		</div>

		<!-- Key Input -->
		<div class="space-y-2">
			<label for="key" class="block text-sm font-medium text-gray-700">
				Key
				{#if isCheckingKey}
					<span class="ml-2 text-gray-400">
						<Loader2 class="w-3 h-3 inline animate-spin" />
						Checking...
					</span>
				{:else if keyExists}
					<span class="ml-2 text-yellow-600 text-xs">
						Key already exists (will update)
					</span>
				{/if}
			</label>
			<Input
				id="key"
				bind:value={key}
				placeholder="my-pattern-name"
				class={keyError ? 'border-red-300 focus:ring-red-500' : ''}
			/>
			{#if keyError && key.length > 0}
				<p class="text-sm text-red-600 flex items-center gap-1">
					<AlertCircle class="w-4 h-4" />
					{keyError}
				</p>
			{/if}
			<p class="text-xs text-gray-500">
				Letters, numbers, underscores, and hyphens only
			</p>
		</div>

		<!-- Value Textarea -->
		<div class="space-y-2">
			<label for="value" class="block text-sm font-medium text-gray-700">
				Value
				<span class="text-gray-400 text-xs ml-2">
					({value.length}/10000)
				</span>
			</label>
			<textarea
				id="value"
				bind:value={value}
				placeholder="Enter the memory content (supports markdown)"
				rows="6"
				class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono resize-none
					placeholder:text-gray-400
					focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
					{valueError && value.length > 0 ? 'border-red-300 focus:ring-red-500' : ''}"
			></textarea>
			{#if valueError && value.length > 0}
				<p class="text-sm text-red-600 flex items-center gap-1">
					<AlertCircle class="w-4 h-4" />
					{valueError}
				</p>
			{/if}
		</div>

		<!-- Tags Input -->
		<div class="space-y-2">
			<label for="tags" class="block text-sm font-medium text-gray-700">
				Tags
				<span class="text-gray-400 text-xs ml-2">(optional, comma-separated)</span>
			</label>
			<Input
				id="tags"
				bind:value={tagsInput}
				placeholder="auth, security, pattern"
			/>
			{#if parsedTags.length > 0}
				<div class="flex flex-wrap gap-1 mt-2">
					{#each parsedTags as tag}
						<Badge variant="secondary">{tag}</Badge>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Error Message -->
		{#if submitError}
			<div class="p-3 bg-red-50 border border-red-200 rounded-md">
				<p class="text-sm text-red-700 flex items-center gap-2">
					<AlertCircle class="w-4 h-4" />
					{submitError}
				</p>
			</div>
		{/if}

		<!-- Success Message -->
		{#if submitSuccess}
			<div class="p-3 bg-green-50 border border-green-200 rounded-md">
				<p class="text-sm text-green-700 flex items-center gap-2">
					<Check class="w-4 h-4" />
					Entry saved successfully!
				</p>
			</div>
		{/if}

		<!-- Actions -->
		<div class="flex justify-end gap-3 pt-4 border-t">
			<Button type="button" variant="outline" onclick={handleCancel}>
				Cancel
			</Button>
			<Button type="submit" disabled={!isValid || isSubmitting}>
				{#if isSubmitting}
					<Loader2 class="w-4 h-4 mr-2 animate-spin" />
					Saving...
				{:else}
					<Plus class="w-4 h-4 mr-2" />
					Add Entry
				{/if}
			</Button>
		</div>
	</form>
</Card>
