<script lang="ts">
	import type { PageData } from './$types';
	import KanbanBoard from '$lib/components/kanban/KanbanBoard.svelte';
	import { invalidateAll } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import { ArrowLeft, Plus } from 'lucide-svelte';

	export let data: PageData;

	let showCreateModal = false;
	let isTransitioning = false;
	let transitionError = '';

	async function handleTicketMove(
		event: CustomEvent<{ ticketId: string; newStatus: string }>
	) {
		const { ticketId, newStatus } = event.detail;

		isTransitioning = true;
		transitionError = '';

		try {
			const response = await fetch('/api/tickets/' + ticketId + '/transition', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					toState: newStatus,
					triggeredBy: 'user'
				})
			});

			if (response.ok) {
				await invalidateAll();
			} else {
				const errorData = await response.json();
				transitionError = errorData.message || 'Failed to move ticket';
				await invalidateAll();
			}
		} catch (err) {
			transitionError = 'Network error occurred';
			await invalidateAll();
		} finally {
			isTransitioning = false;
		}
	}

	async function handleCreateTicket(event: SubmitEvent) {
		const form = event.currentTarget as HTMLFormElement;
		const formData = new FormData(form);

		const response = await fetch('/api/projects/' + data.project.id + '/tickets', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				title: formData.get('title'),
				description: formData.get('description'),
				priority: formData.get('priority'),
				labels: (formData.get('labels') as string)
					?.split(',')
					.map((l) => l.trim())
					.filter(Boolean) || []
			})
		});

		if (response.ok) {
			showCreateModal = false;
			await invalidateAll();
		}
	}
</script>

<svelte:head>
	<title>{data.project.name} | CF Kanban</title>
</svelte:head>

<main class="min-h-screen">
	<header class="bg-white border-b px-6 py-4">
		<div class="flex items-center gap-4">
			<a href="/" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
				<ArrowLeft class="w-5 h-5" />
			</a>
			<div class="flex-1">
				<h1 class="text-2xl font-bold">{data.project.name}</h1>
				{#if data.project.description}
					<p class="text-gray-600 mt-1">{data.project.description}</p>
				{/if}
			</div>
			<Button on:click={() => (showCreateModal = true)}>
				<Plus class="w-4 h-4 mr-2" />
				New Ticket
			</Button>
		</div>

		{#if transitionError}
			<div class="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
				{transitionError}
			</div>
		{/if}
	</header>

	{#if isTransitioning}
		<div class="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
			Updating...
		</div>
	{/if}

	<KanbanBoard
		projectId={data.project.id}
		tickets={data.tickets}
		on:ticketMove={handleTicketMove}
	/>
</main>

{#if showCreateModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		on:click|self={() => (showCreateModal = false)}
		on:keydown={(e) => e.key === 'Escape' && (showCreateModal = false)}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
			<h2 class="text-lg font-semibold mb-4">Create New Ticket</h2>
			<form on:submit|preventDefault={handleCreateTicket} class="space-y-4">
				<div>
					<label for="title" class="block text-sm font-medium mb-1">Title</label>
					<input
						type="text"
						id="title"
						name="title"
						required
						class="w-full px-3 py-2 border rounded-md"
					/>
				</div>

				<div>
					<label for="description" class="block text-sm font-medium mb-1">Description</label>
					<textarea
						id="description"
						name="description"
						class="w-full px-3 py-2 border rounded-md resize-none"
						rows="3"
					></textarea>
				</div>

				<div>
					<label for="priority" class="block text-sm font-medium mb-1">Priority</label>
					<select id="priority" name="priority" class="w-full px-3 py-2 border rounded-md">
						<option value="LOW">Low</option>
						<option value="MEDIUM" selected>Medium</option>
						<option value="HIGH">High</option>
						<option value="CRITICAL">Critical</option>
					</select>
				</div>

				<div>
					<label for="labels" class="block text-sm font-medium mb-1">
						Labels (comma-separated)
					</label>
					<input
						type="text"
						id="labels"
						name="labels"
						placeholder="bug, frontend, urgent"
						class="w-full px-3 py-2 border rounded-md"
					/>
				</div>

				<div class="flex justify-end gap-2 pt-4">
					<Button type="button" variant="ghost" on:click={() => (showCreateModal = false)}>
						Cancel
					</Button>
					<Button type="submit">Create Ticket</Button>
				</div>
			</form>
		</div>
	</div>
{/if}
