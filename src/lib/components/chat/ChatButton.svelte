<script lang="ts">
	/**
	 * ChatButton Component
	 * GAP-8.1: AI Chat Assistant
	 *
	 * A floating action button that opens the chat assistant.
	 * Shows unread message count when chat is closed.
	 */
	import { scale } from 'svelte/transition';
	import { cn } from '$lib/utils';
	import {
		isOpen,
		unreadCount,
		toggleChat
	} from '$lib/stores/chat';
	import { MessageCircle, X } from 'lucide-svelte';
</script>

<button
	type="button"
	class={cn(
		'fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full shadow-lg transition-all duration-200',
		'flex items-center justify-center',
		'focus:outline-none focus:ring-2 focus:ring-offset-2',
		$isOpen
			? 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'
			: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:ring-blue-500'
	)}
	onclick={toggleChat}
	title={$isOpen ? 'Close chat' : 'Open chat assistant'}
	transition:scale={{ duration: 150 }}
>
	{#if $isOpen}
		<X class="w-6 h-6 text-white" />
	{:else}
		<MessageCircle class="w-6 h-6 text-white" />

		<!-- Unread badge -->
		{#if $unreadCount > 0}
			<span
				class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
				transition:scale={{ duration: 150 }}
			>
				{$unreadCount > 9 ? '9+' : $unreadCount}
			</span>
		{/if}
	{/if}
</button>
