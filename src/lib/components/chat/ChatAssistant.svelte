<script lang="ts">
	/**
	 * ChatAssistant Component
	 * GAP-8.1: AI Chat Assistant
	 *
	 * A floating chat panel that provides:
	 * - Natural language interface to Claude Flow capabilities
	 * - Answers about features and agents
	 * - Conversational ticket creation
	 * - Configuration suggestions
	 */
	import { onMount, tick } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { page } from '$app/stores';
	import { cn } from '$lib/utils';
	import Button from '$lib/components/ui/Button.svelte';
	import {
		messages,
		isOpen,
		isLoading,
		ticketCreation,
		chatError,
		toggleChat,
		closeChat,
		addUserMessage,
		addAssistantMessage,
		addSystemMessage,
		setLoading,
		setError,
		updateTicketCreation,
		resetTicketCreation,
		clearMessages,
		initializeChat,
		getChatState,
		type ChatMessage,
		type MessageIntent
	} from '$lib/stores/chat';
	import { currentProject } from '$lib/stores/projects';
	import {
		MessageCircle,
		X,
		Send,
		Loader2,
		Bot,
		User,
		Trash2,
		Sparkles,
		Ticket,
		HelpCircle,
		Settings,
		Navigation
	} from 'lucide-svelte';

	// State
	let inputValue = $state('');
	let messagesContainer = $state<HTMLDivElement | null>(null);
	let inputRef = $state<HTMLInputElement | null>(null);

	// Derived values
	let currentProjectId = $derived($currentProject?.id);

	// Icon mapping for intents
	const intentIcons: Record<MessageIntent, typeof Sparkles> = {
		capabilities: Sparkles,
		explanation: HelpCircle,
		ticket_creation: Ticket,
		configuration: Settings,
		navigation: Navigation,
		general: MessageCircle
	};

	// Scroll to bottom when new messages arrive
	async function scrollToBottom() {
		await tick();
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}

	// Watch for message changes
	$effect(() => {
		if ($messages.length > 0) {
			scrollToBottom();
		}
	});

	// Focus input when chat opens
	$effect(() => {
		if ($isOpen && inputRef) {
			tick().then(() => inputRef?.focus());
		}
	});

	// Initialize on mount
	onMount(() => {
		initializeChat();
	});

	/**
	 * Send a message to the chat API
	 */
	async function sendMessage() {
		const message = inputValue.trim();
		if (!message || $isLoading) return;

		// Add user message
		addUserMessage(message);
		inputValue = '';
		setLoading(true);
		setError(null);

		try {
			const state = getChatState();
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message,
					ticketCreation: state.ticketCreation,
					context: {
						currentProjectId,
						currentPage: $page.url.pathname
					}
				})
			});

			if (!response.ok) {
				throw new Error('Failed to get response');
			}

			const data = await response.json();

			// Update ticket creation state if returned
			if (data.ticketCreation) {
				updateTicketCreation(data.ticketCreation);

				// If ticket is ready to be created, make the API call
				if (data.ticketCreation.step === 'created' && currentProjectId) {
					await createTicket(data.ticketCreation);
				}
			}

			// Add assistant response
			addAssistantMessage(data.content, data.intent, data.metadata);
		} catch (err) {
			console.error('Chat error:', err);
			setError('Failed to send message. Please try again.');
			addSystemMessage('Sorry, I encountered an error. Please try again.');
		} finally {
			setLoading(false);
		}
	}

	/**
	 * Create a ticket via the API
	 */
	async function createTicket(ticketData: {
		title?: string;
		description?: string;
		priority?: string;
		projectId?: string;
	}) {
		const projectId = ticketData.projectId || currentProjectId;
		if (!projectId || !ticketData.title) {
			addSystemMessage('Unable to create ticket: missing project or title.');
			resetTicketCreation();
			return;
		}

		try {
			const response = await fetch(`/api/projects/${projectId}/tickets`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: ticketData.title,
					description: ticketData.description,
					priority: ticketData.priority || 'MEDIUM',
					labels: []
				})
			});

			if (!response.ok) {
				throw new Error('Failed to create ticket');
			}

			const ticket = await response.json();
			addAssistantMessage(
				`Ticket created successfully!\n\n**${ticket.title}** (${ticket.priority})\n\nID: \`${ticket.id}\`\n\nWhat else can I help you with?`,
				'ticket_creation',
				{ ticketId: ticket.id }
			);
		} catch (err) {
			console.error('Ticket creation error:', err);
			addSystemMessage('Failed to create ticket. Please try again or use the Kanban board.');
		} finally {
			resetTicketCreation();
		}
	}

	/**
	 * Handle keyboard events in input
	 */
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
		if (event.key === 'Escape') {
			closeChat();
		}
	}

	/**
	 * Handle suggestion click
	 */
	function handleSuggestion(suggestion: string) {
		inputValue = suggestion;
		sendMessage();
	}

	/**
	 * Format message content with markdown-like styling
	 */
	function formatContent(content: string): string {
		return content
			// Bold
			.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
			// Code blocks
			.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 rounded p-2 text-xs overflow-x-auto my-2"><code>$2</code></pre>')
			// Inline code
			.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">$1</code>')
			// Line breaks
			.replace(/\n/g, '<br>');
	}
</script>

<!-- Chat Panel -->
{#if $isOpen}
	<div
		class="fixed bottom-20 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] h-[32rem] max-h-[calc(100vh-8rem)] flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700"
		transition:fly={{ y: 20, duration: 200 }}
	>
		<!-- Header -->
		<header class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-xl">
			<div class="flex items-center gap-2 text-white">
				<Bot class="w-5 h-5" />
				<span class="font-semibold">Claude Flow Assistant</span>
			</div>
			<div class="flex items-center gap-1">
				<button
					type="button"
					class="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
					onclick={() => clearMessages()}
					title="Clear conversation"
				>
					<Trash2 class="w-4 h-4" />
				</button>
				<button
					type="button"
					class="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
					onclick={closeChat}
					title="Close"
				>
					<X class="w-4 h-4" />
				</button>
			</div>
		</header>

		<!-- Messages -->
		<div
			bind:this={messagesContainer}
			class="flex-1 overflow-y-auto p-4 space-y-4"
		>
			{#each $messages as message (message.id)}
				<div
					class={cn(
						'flex gap-3',
						message.role === 'user' ? 'flex-row-reverse' : ''
					)}
				>
					<!-- Avatar -->
					<div
						class={cn(
							'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
							message.role === 'user'
								? 'bg-blue-100 dark:bg-blue-900/30'
								: message.role === 'system'
									? 'bg-amber-100 dark:bg-amber-900/30'
									: 'bg-purple-100 dark:bg-purple-900/30'
						)}
					>
						{#if message.role === 'user'}
							<User class="w-4 h-4 text-blue-600 dark:text-blue-400" />
						{:else if message.role === 'system'}
							<HelpCircle class="w-4 h-4 text-amber-600 dark:text-amber-400" />
						{:else}
							{@const IntentIcon = message.intent ? intentIcons[message.intent] : Bot}
							<IntentIcon class="w-4 h-4 text-purple-600 dark:text-purple-400" />
						{/if}
					</div>

					<!-- Message bubble -->
					<div
						class={cn(
							'flex-1 max-w-[85%] rounded-lg px-3 py-2 text-sm',
							message.role === 'user'
								? 'bg-blue-600 text-white ml-auto'
								: message.role === 'system'
									? 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
									: 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
						)}
					>
						{#if message.role === 'user'}
							{message.content}
						{:else}
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html formatContent(message.content)}
						{/if}
					</div>
				</div>

				<!-- Suggestions -->
				{#if message.role === 'assistant' && message.metadata?.suggestions && message === $messages[$messages.length - 1]}
					<div class="flex flex-wrap gap-2 pl-11">
						{#each message.metadata.suggestions as suggestion}
							<button
								type="button"
								class="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
								onclick={() => handleSuggestion(suggestion)}
							>
								{suggestion}
							</button>
						{/each}
					</div>
				{/if}
			{/each}

			<!-- Loading indicator -->
			{#if $isLoading}
				<div class="flex gap-3">
					<div class="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
						<Loader2 class="w-4 h-4 text-purple-600 dark:text-purple-400 animate-spin" />
					</div>
					<div class="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-500">
						Thinking...
					</div>
				</div>
			{/if}
		</div>

		<!-- Error banner -->
		{#if $chatError}
			<div class="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm border-t border-red-200 dark:border-red-800">
				{$chatError}
			</div>
		{/if}

		<!-- Input area -->
		<div class="p-3 border-t border-gray-200 dark:border-gray-700">
			<div class="flex items-center gap-2">
				<input
					bind:this={inputRef}
					bind:value={inputValue}
					type="text"
					placeholder="Ask me anything..."
					class="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
					onkeydown={handleKeydown}
					disabled={$isLoading}
				/>
				<button
					type="button"
					class={cn(
						'p-2 rounded-lg transition-colors',
						inputValue.trim() && !$isLoading
							? 'bg-blue-600 text-white hover:bg-blue-700'
							: 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
					)}
					onclick={sendMessage}
					disabled={!inputValue.trim() || $isLoading}
				>
					{#if $isLoading}
						<Loader2 class="w-4 h-4 animate-spin" />
					{:else}
						<Send class="w-4 h-4" />
					{/if}
				</button>
			</div>
			<p class="mt-2 text-[10px] text-gray-400 text-center">
				Press Enter to send, Escape to close
			</p>
		</div>
	</div>
{/if}
