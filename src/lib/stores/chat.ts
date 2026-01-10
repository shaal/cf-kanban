/**
 * Chat Store - Reactive store for AI Chat Assistant state
 * GAP-8.1: AI Chat Assistant
 *
 * Features:
 * - Message history management
 * - Chat open/close state
 * - Loading/processing states
 * - Persist recent conversation
 */

import { writable, derived, get } from 'svelte/store';

/**
 * Message roles
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Intent types for message classification
 */
export type MessageIntent =
	| 'capabilities' // "What can I do?" questions
	| 'explanation' // Explain agent/hook/worker
	| 'ticket_creation' // Create a ticket via conversation
	| 'configuration' // Configuration suggestions
	| 'general' // General conversation
	| 'navigation'; // Help navigating the app

/**
 * Ticket creation state for conversational ticket creation
 */
export interface TicketCreationState {
	title?: string;
	description?: string;
	priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
	labels?: string[];
	projectId?: string;
	step: 'idle' | 'collecting_title' | 'collecting_description' | 'collecting_priority' | 'confirming' | 'created';
}

/**
 * A single chat message
 */
export interface ChatMessage {
	id: string;
	role: MessageRole;
	content: string;
	intent?: MessageIntent;
	timestamp: Date;
	metadata?: {
		ticketId?: string;
		agentId?: string;
		hookId?: string;
		workerId?: string;
		suggestions?: string[];
	};
}

/**
 * Chat state
 */
interface ChatState {
	messages: ChatMessage[];
	isOpen: boolean;
	isLoading: boolean;
	ticketCreation: TicketCreationState;
	error: string | null;
}

const initialState: ChatState = {
	messages: [],
	isOpen: false,
	isLoading: false,
	ticketCreation: { step: 'idle' },
	error: null
};

// Create the main store
const chatStore = writable<ChatState>(initialState);

/**
 * Generate unique message ID
 */
function generateId(): string {
	return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Public read-only stores
 */
export const messages = derived(chatStore, ($state) => $state.messages);
export const isOpen = derived(chatStore, ($state) => $state.isOpen);
export const isLoading = derived(chatStore, ($state) => $state.isLoading);
export const ticketCreation = derived(chatStore, ($state) => $state.ticketCreation);
export const chatError = derived(chatStore, ($state) => $state.error);

/**
 * Count of unread messages (messages since last open)
 */
let lastSeenCount = 0;
export const unreadCount = derived(chatStore, ($state) => {
	if ($state.isOpen) {
		return 0;
	}
	const assistantMessages = $state.messages.filter((m) => m.role === 'assistant');
	return Math.max(0, assistantMessages.length - lastSeenCount);
});

/**
 * Toggle chat open/close
 */
export function toggleChat(): void {
	chatStore.update((state) => {
		if (!state.isOpen) {
			// Opening chat - mark all as seen
			lastSeenCount = state.messages.filter((m) => m.role === 'assistant').length;
		}
		return { ...state, isOpen: !state.isOpen };
	});
}

/**
 * Open chat
 */
export function openChat(): void {
	chatStore.update((state) => {
		lastSeenCount = state.messages.filter((m) => m.role === 'assistant').length;
		return { ...state, isOpen: true };
	});
}

/**
 * Close chat
 */
export function closeChat(): void {
	chatStore.update((state) => ({ ...state, isOpen: false }));
}

/**
 * Add a user message
 */
export function addUserMessage(content: string): ChatMessage {
	const message: ChatMessage = {
		id: generateId(),
		role: 'user',
		content,
		timestamp: new Date()
	};

	chatStore.update((state) => ({
		...state,
		messages: [...state.messages, message],
		error: null
	}));

	return message;
}

/**
 * Add an assistant message
 */
export function addAssistantMessage(
	content: string,
	intent?: MessageIntent,
	metadata?: ChatMessage['metadata']
): ChatMessage {
	const message: ChatMessage = {
		id: generateId(),
		role: 'assistant',
		content,
		intent,
		timestamp: new Date(),
		metadata
	};

	chatStore.update((state) => ({
		...state,
		messages: [...state.messages, message]
	}));

	return message;
}

/**
 * Add a system message (e.g., for errors or notifications)
 */
export function addSystemMessage(content: string): ChatMessage {
	const message: ChatMessage = {
		id: generateId(),
		role: 'system',
		content,
		timestamp: new Date()
	};

	chatStore.update((state) => ({
		...state,
		messages: [...state.messages, message]
	}));

	return message;
}

/**
 * Set loading state
 */
export function setLoading(loading: boolean): void {
	chatStore.update((state) => ({ ...state, isLoading: loading }));
}

/**
 * Set error state
 */
export function setError(error: string | null): void {
	chatStore.update((state) => ({ ...state, error }));
}

/**
 * Update ticket creation state
 */
export function updateTicketCreation(updates: Partial<TicketCreationState>): void {
	chatStore.update((state) => ({
		...state,
		ticketCreation: { ...state.ticketCreation, ...updates }
	}));
}

/**
 * Reset ticket creation state
 */
export function resetTicketCreation(): void {
	chatStore.update((state) => ({
		...state,
		ticketCreation: { step: 'idle' }
	}));
}

/**
 * Clear all messages
 */
export function clearMessages(): void {
	chatStore.update((state) => ({
		...state,
		messages: [],
		ticketCreation: { step: 'idle' },
		error: null
	}));
	lastSeenCount = 0;
}

/**
 * Get current state (for API calls)
 */
export function getChatState(): ChatState {
	return get(chatStore);
}

/**
 * Initialize chat with welcome message
 */
export function initializeChat(): void {
	const state = get(chatStore);
	if (state.messages.length === 0) {
		addAssistantMessage(
			'Hello! I\'m your Claude Flow assistant. I can help you with:\n\n' +
				'- Explaining agents, hooks, and workers\n' +
				'- Creating tickets via conversation\n' +
				'- Suggesting optimal configurations\n' +
				'- Navigating the application\n\n' +
				'What would you like to know?',
			'capabilities'
		);
	}
}
