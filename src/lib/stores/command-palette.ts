/**
 * Command Palette Store
 * GAP-8.2: Command Palette (Cmd+K)
 *
 * Global state management for the command palette.
 */

import { writable, derived } from 'svelte/store';
import type { CommandItem, CommandType } from '$lib/components/command/command-data';
import { getAllCommands, searchCommands, groupCommandsByType } from '$lib/components/command/command-data';

/**
 * Whether the command palette is open
 */
export const commandPaletteOpen = writable(false);

/**
 * Current search query
 */
export const commandQuery = writable('');

/**
 * Currently selected index
 */
export const selectedIndex = writable(0);

/**
 * Active filter (null = show all)
 */
export const activeFilter = writable<CommandType | null>(null);

/**
 * All available commands
 */
export const allCommands = writable<CommandItem[]>(getAllCommands());

/**
 * Filtered commands based on query and filter
 */
export const filteredCommands = derived(
	[allCommands, commandQuery, activeFilter],
	([$allCommands, $query, $filter]) => {
		let commands = $allCommands;

		// Apply type filter
		if ($filter) {
			commands = commands.filter(cmd => cmd.type === $filter);
		}

		// Apply search
		if ($query.trim()) {
			commands = searchCommands($query, commands);
		}

		return commands;
	}
);

/**
 * Grouped commands for display
 */
export const groupedCommands = derived(
	filteredCommands,
	($filtered) => groupCommandsByType($filtered)
);

/**
 * Total count of filtered commands
 */
export const commandCount = derived(
	filteredCommands,
	($filtered) => $filtered.length
);

/**
 * Open the command palette
 */
export function openCommandPalette() {
	commandPaletteOpen.set(true);
	commandQuery.set('');
	selectedIndex.set(0);
	activeFilter.set(null);
}

/**
 * Close the command palette
 */
export function closeCommandPalette() {
	commandPaletteOpen.set(false);
	commandQuery.set('');
	selectedIndex.set(0);
	activeFilter.set(null);
}

/**
 * Toggle the command palette
 */
export function toggleCommandPalette() {
	commandPaletteOpen.update(open => {
		if (!open) {
			commandQuery.set('');
			selectedIndex.set(0);
			activeFilter.set(null);
		}
		return !open;
	});
}

/**
 * Navigate selection up
 */
export function navigateUp(maxIndex: number) {
	selectedIndex.update(i => (i - 1 + maxIndex) % maxIndex);
}

/**
 * Navigate selection down
 */
export function navigateDown(maxIndex: number) {
	selectedIndex.update(i => (i + 1) % maxIndex);
}

/**
 * Reset selection to first item
 */
export function resetSelection() {
	selectedIndex.set(0);
}

/**
 * Set the search query
 */
export function setQuery(query: string) {
	commandQuery.set(query);
	selectedIndex.set(0);
}

/**
 * Set the active filter
 */
export function setFilter(filter: CommandType | null) {
	activeFilter.set(filter);
	selectedIndex.set(0);
}

/**
 * Refresh commands (e.g., after dynamic updates)
 */
export function refreshCommands() {
	allCommands.set(getAllCommands());
}
