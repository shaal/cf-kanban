<script lang="ts">
	/**
	 * Project Kanban Board Page
	 *
	 * TASK-034: Connect Kanban board to WebSocket
	 * GAP-3.2.6: Feedback Interaction UI Enhancement
	 * GAP-3.2.4: Ticket Dependency Detection
	 *
	 * Features:
	 * - Real-time ticket updates via WebSocket
	 * - Optimistic UI updates with rollback
	 * - Connection status indicator
	 * - Project room management (join/leave)
	 * - Ticket detail modal for viewing/answering questions (GAP-3.2.6)
	 * - Ticket dependencies with blocking logic (GAP-3.2.4)
	 */
	import { onMount, onDestroy } from 'svelte';
	import type { PageData } from './$types';
	import type { Ticket } from '$lib/types';
	import KanbanBoard from '$lib/components/kanban/KanbanBoard.svelte';
	import TicketDetailModal from '$lib/components/kanban/TicketDetailModal.svelte';
	import { invalidateAll } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import { ConnectionIndicator, SystemStatusIndicator } from '$lib/components/ui';
	import { ArrowLeft, Plus } from 'lucide-svelte';
	import {
		connect,
		disconnect,
		joinProject,
		leaveProject,
		onTicketCreated,
		onTicketUpdated,
		onTicketDeleted,
		onTicketMoved,
		connectionStatus
	} from '$lib/stores/socket';
	import {
		tickets,
		setTickets,
		addTicket,
		updateTicket,
		removeTicket,
		moveTicket
	} from '$lib/stores/tickets';
	import {
		resolvePositionConflict,
		setPositionVersion,
		clearPositions
	} from '$lib/stores/position';
	import {
		addPendingOperation,
		confirmOperation,
		rollbackOperation,
		hasPending
	} from '$lib/stores/optimistic';

	export let data: PageData;

	let showCreateModal = false;
	let isTransitioning = false;
	let transitionError = '';

	// GAP-3.2.6: Ticket detail modal state
	let showTicketDetail = false;
	let selectedTicket: Ticket | null = null;

	// Unsubscribe functions for socket events
	let unsubscribers: (() => void)[] = [];

	// Initialize tickets store from server data
	$: setTickets(data.tickets);

	// WebSocket URL (use relative URL in browser, will be handled by proxy/server)
	const SOCKET_URL = typeof window !== 'undefined'
		? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
		: '';

	onMount(() => {
		// Connect to WebSocket server
		if (SOCKET_URL) {
			connect(SOCKET_URL);
		}

		// Join this project's room
		joinProject(data.project.id);

		// Subscribe to real-time events
		unsubscribers.push(
			onTicketCreated((ticket) => {
				addTicket(ticket);
			}),
			onTicketUpdated((update) => {
				updateTicket(update.id, update);
			}),
			onTicketDeleted((ticketId) => {
				removeTicket(ticketId);
			}),
			onTicketMoved((event) => {
				// Use conflict resolution for position updates
				const resolution = resolvePositionConflict(
					event.ticketId,
					event.version,
					event.newPosition
				);

				if (resolution.accepted) {
					moveTicket(event.ticketId, event.newStatus as any, event.newPosition);
				}
			})
		);
	});

	onDestroy(() => {
		// Unsubscribe from all events
		unsubscribers.forEach((unsub) => unsub());

		// Leave project room and disconnect
		leaveProject(data.project.id);
		clearPositions();
		disconnect();
	});

	async function handleTicketMove(
		event: CustomEvent<{ ticketId: string; newStatus: string }>
	) {
		const { ticketId, newStatus } = event.detail;

		// Find the current ticket to get previous state
		const currentTicket = $tickets.find((t) => t.id === ticketId);
		if (!currentTicket) return;

		const previousState = {
			status: currentTicket.status,
			position: currentTicket.position
		};

		// TASK-037: Optimistic update - update UI immediately
		const operationId = addPendingOperation({
			type: 'move',
			ticketId,
			previousState,
			newState: { status: newStatus, position: currentTicket.position }
		});

		// Apply optimistic update to store
		moveTicket(ticketId, newStatus as any, currentTicket.position);

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
				// Confirm the optimistic update
				confirmOperation(operationId);
				await invalidateAll();
			} else {
				const errorData = await response.json();
				transitionError = errorData.message || 'Failed to move ticket';

				// Rollback the optimistic update
				const rollback = rollbackOperation(operationId);
				if (rollback && rollback.state) {
					moveTicket(ticketId, rollback.state.status as any, rollback.state.position as number);
				}
				await invalidateAll();
			}
		} catch (err) {
			transitionError = 'Network error occurred';

			// Rollback the optimistic update
			const rollback = rollbackOperation(operationId);
			if (rollback && rollback.state) {
				moveTicket(ticketId, rollback.state.status as any, rollback.state.position as number);
			}
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

	/**
	 * GAP-3.2.6: Handle ticket click to open detail modal
	 */
	function handleTicketClick(event: CustomEvent<{ ticket: Ticket }>) {
		selectedTicket = event.detail.ticket;
		showTicketDetail = true;
	}

	/**
	 * GAP-3.2.6: Handle ticket detail modal close
	 */
	function handleTicketDetailClose() {
		showTicketDetail = false;
		selectedTicket = null;
	}

	/**
	 * GAP-3.2.6: Handle ticket resume from detail modal
	 */
	async function handleTicketResume() {
		await invalidateAll();
		handleTicketDetailClose();
	}

	/**
	 * GAP-3.2.6: Handle ticket update from detail modal
	 */
	async function handleTicketUpdate() {
		await invalidateAll();
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
				<div class="flex items-center gap-3">
					<h1 class="text-2xl font-bold">{data.project.name}</h1>
					<ConnectionIndicator showLabel={false} size="sm" />
					<!-- GAP-3.5.2: System status indicator -->
					<SystemStatusIndicator showLabel={false} size="sm" />
				</div>
				{#if data.project.description}
					<p class="text-gray-600 mt-1">{data.project.description}</p>
				{/if}
			</div>
			{#if $hasPending}
				<span class="text-sm text-yellow-600 animate-pulse">Syncing...</span>
			{/if}
			<Button onclick={() => (showCreateModal = true)} data-tour="create-ticket">
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
		on:ticketClick={handleTicketClick}
	/>
</main>

<!-- GAP-3.2.6: Ticket detail modal + GAP-3.2.4: Dependencies -->
<TicketDetailModal
	bind:open={showTicketDetail}
	ticket={selectedTicket}
	availableTickets={data.tickets}
	on:close={handleTicketDetailClose}
	on:resume={handleTicketResume}
	on:updated={handleTicketUpdate}
/>

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
					<Button type="button" variant="ghost" onclick={() => (showCreateModal = false)}>
						Cancel
					</Button>
					<Button type="submit">Create Ticket</Button>
				</div>
			</form>
		</div>
	</div>
{/if}
