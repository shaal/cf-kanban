<script lang="ts">
	/**
	 * Command Palette Trigger Button
	 * GAP-8.2: Command Palette (Cmd+K)
	 *
	 * A button that opens the command palette with keyboard shortcut indicator.
	 */

	import { Command, Search } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import { openCommandPalette } from '$lib/stores/command-palette';

	interface Props {
		class?: string;
		variant?: 'default' | 'compact' | 'icon';
	}

	let { class: className = '', variant = 'default' }: Props = $props();

	// Detect if running on Mac
	const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
	const modKey = isMac ? '⌘' : 'Ctrl';
</script>

{#if variant === 'icon'}
	<button
		type="button"
		class={cn(
			'p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100',
			'dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800',
			'transition-colors',
			className
		)}
		onclick={() => openCommandPalette()}
		aria-label="Open command palette"
		title="{modKey}+K"
		data-tour="command-trigger"
	>
		<Command class="h-5 w-5" />
	</button>
{:else if variant === 'compact'}
	<button
		type="button"
		class={cn(
			'flex items-center gap-2 px-3 py-1.5 rounded-md',
			'text-sm text-gray-500 bg-gray-100 hover:bg-gray-200',
			'dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700',
			'transition-colors',
			className
		)}
		onclick={() => openCommandPalette()}
		data-tour="command-trigger"
	>
		<Search class="h-4 w-4" />
		<span class="text-xs font-medium">{modKey}K</span>
	</button>
{:else}
	<button
		type="button"
		class={cn(
			'flex items-center gap-3 w-full max-w-xs px-4 py-2.5 rounded-lg',
			'text-sm text-gray-500 bg-gray-50 border border-gray-200',
			'hover:bg-gray-100 hover:border-gray-300',
			'dark:text-gray-400 dark:bg-gray-900 dark:border-gray-800',
			'dark:hover:bg-gray-800 dark:hover:border-gray-700',
			'transition-colors',
			className
		)}
		onclick={() => openCommandPalette()}
		data-tour="command-trigger"
	>
		<Search class="h-4 w-4 flex-shrink-0" />
		<span class="flex-1 text-left truncate">Search commands...</span>
		<kbd class="flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
			<span>{modKey}</span>
			<span>K</span>
		</kbd>
	</button>
{/if}
