<script lang="ts">
	/**
	 * Command Palette Component
	 * GAP-8.2: Command Palette (Cmd+K)
	 *
	 * A cmdk-style command palette with:
	 * - Fuzzy search across all agents, hooks, workers, and actions
	 * - Keyboard navigation (arrows, enter, escape)
	 * - Cmd+K shortcut opens globally
	 * - Grouped results by type
	 */

	import { onMount, onDestroy, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { Command } from 'bits-ui';
	import { Dialog } from 'bits-ui';
	import { cn } from '$lib/utils';
	import {
		commandPaletteOpen,
		commandQuery,
		selectedIndex,
		activeFilter,
		filteredCommands,
		groupedCommands,
		commandCount,
		closeCommandPalette,
		toggleCommandPalette,
		setQuery,
		setFilter,
		navigateUp,
		navigateDown
	} from '$lib/stores/command-palette';
	import { getTypeLabel, type CommandItem, type CommandType } from './command-data';

	// Dynamic icon imports
	import * as LucideIcons from 'lucide-svelte';
	import {
		Search,
		X,
		Command as CommandIcon,
		ArrowUp,
		ArrowDown,
		CornerDownLeft,
		Users,
		Webhook,
		Cpu,
		Navigation,
		Zap,
		HelpCircle
	} from 'lucide-svelte';

	// Refs with $state for reactivity
	let inputRef = $state<HTMLInputElement | null>(null);
	let listRef = $state<HTMLDivElement | null>(null);

	// Get icon component by name
	function getIcon(iconName: string) {
		const icons = LucideIcons as unknown as Record<string, typeof HelpCircle>;
		return icons[iconName] || HelpCircle;
	}

	// Type filter options
	const typeFilters: { type: CommandType | null; label: string; icon: typeof Search }[] = [
		{ type: null, label: 'All', icon: Search },
		{ type: 'navigation', label: 'Navigation', icon: Navigation },
		{ type: 'action', label: 'Actions', icon: Zap },
		{ type: 'agent', label: 'Agents', icon: Users },
		{ type: 'hook', label: 'Hooks', icon: Webhook },
		{ type: 'worker', label: 'Workers', icon: Cpu }
	];

	// Execute a command
	async function executeCommand(command: CommandItem) {
		closeCommandPalette();

		if (command.href) {
			await goto(command.href);
		} else if (command.action) {
			await command.action();
		} else {
			// Default action: log
			console.log(`Execute command: ${command.name} (${command.type})`);
		}
	}

	// Handle keyboard navigation
	function handleKeydown(event: KeyboardEvent) {
		const count = $commandCount;

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				navigateDown(count);
				scrollToSelected();
				break;
			case 'ArrowUp':
				event.preventDefault();
				navigateUp(count);
				scrollToSelected();
				break;
			case 'Enter':
				event.preventDefault();
				const commands = $filteredCommands;
				if (commands[$selectedIndex]) {
					executeCommand(commands[$selectedIndex]);
				}
				break;
			case 'Escape':
				event.preventDefault();
				closeCommandPalette();
				break;
			case 'Tab':
				event.preventDefault();
				// Cycle through type filters
				const currentIndex = typeFilters.findIndex(f => f.type === $activeFilter);
				const nextIndex = (currentIndex + 1) % typeFilters.length;
				setFilter(typeFilters[nextIndex].type);
				break;
		}
	}

	// Handle input changes
	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		setQuery(target.value);
	}

	// Scroll selected item into view
	async function scrollToSelected() {
		await tick();
		const selected = listRef?.querySelector('[data-selected="true"]');
		selected?.scrollIntoView({ block: 'nearest' });
	}

	// Global keyboard shortcut
	function handleGlobalKeydown(event: KeyboardEvent) {
		// Cmd+K or Ctrl+K
		if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
			event.preventDefault();
			toggleCommandPalette();
		}
	}

	// Focus input when dialog opens
	$effect(() => {
		if ($commandPaletteOpen && inputRef) {
			tick().then(() => inputRef?.focus());
		}
	});

	onMount(() => {
		window.addEventListener('keydown', handleGlobalKeydown);
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('keydown', handleGlobalKeydown);
		}
	});

	// Type colors for badges
	function getTypeColor(type: CommandType): string {
		switch (type) {
			case 'navigation': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
			case 'action': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
			case 'agent': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
			case 'hook': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
			case 'worker': return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300';
			default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
		}
	}
</script>

<Dialog.Root
	bind:open={$commandPaletteOpen}
	onOpenChange={(open) => {
		if (!open) closeCommandPalette();
	}}
>
	<Dialog.Portal>
		<Dialog.Overlay
			class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
		/>
		<Dialog.Content
			class="fixed left-[50%] top-[20%] z-50 w-full max-w-2xl translate-x-[-50%] rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900"
			onkeydown={handleKeydown}
		>
			<Command.Root
				class="flex flex-col"
				shouldFilter={false}
			>
				<!-- Search Header -->
				<div class="flex items-center border-b border-gray-200 dark:border-gray-800 px-4">
					<Search class="h-5 w-5 text-gray-400 flex-shrink-0" />
					<input
						bind:this={inputRef}
						type="text"
						value={$commandQuery}
						oninput={handleInput}
						placeholder="Search agents, hooks, workers, actions..."
						class="flex-1 h-14 bg-transparent px-3 text-base outline-none placeholder:text-gray-400 dark:text-white"
					/>
					{#if $commandQuery}
						<button
							type="button"
							class="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
							onclick={() => setQuery('')}
						>
							<X class="h-4 w-4 text-gray-400" />
						</button>
					{/if}
				</div>

				<!-- Filter Tabs -->
				<div class="flex items-center gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
					{#each typeFilters as filter}
						{@const FilterIcon = filter.icon}
						<button
							type="button"
							class={cn(
								'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap',
								$activeFilter === filter.type
									? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
									: 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
							)}
							onclick={() => setFilter(filter.type)}
						>
							<FilterIcon class="h-3.5 w-3.5" />
							{filter.label}
						</button>
					{/each}
				</div>

				<!-- Results List -->
				<Command.List
					class="max-h-[400px] overflow-y-auto p-2"
					bind:ref={listRef}
				>
					<Command.Empty class="py-12 text-center text-gray-500">
						No results found for "{$commandQuery}"
					</Command.Empty>

					{#each [...$groupedCommands.entries()] as [type, commands]}
						<Command.Group class="mb-2">
							<div class="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
								{getTypeLabel(type)}
							</div>

							{#each commands as command}
								{@const globalIndex = $filteredCommands.indexOf(command)}
								{@const isSelected = globalIndex === $selectedIndex}
								{@const IconComponent = getIcon(command.icon)}
								<Command.Item
									value={command.id}
									onSelect={() => executeCommand(command)}
									class={cn(
										'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
										isSelected
											? 'bg-gray-100 dark:bg-gray-800'
											: 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
									)}
									data-selected={isSelected}
								>
									<!-- Icon -->
									<div class={cn(
										'flex items-center justify-center w-9 h-9 rounded-lg',
										getTypeColor(command.type)
									)}>
										<IconComponent class="h-4 w-4" />
									</div>

									<!-- Content -->
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<span class="font-medium text-gray-900 dark:text-white truncate">
												{command.name}
											</span>
											<span class={cn(
												'px-1.5 py-0.5 text-[10px] font-medium rounded',
												getTypeColor(command.type)
											)}>
												{command.type}
											</span>
										</div>
										<p class="text-sm text-gray-500 dark:text-gray-400 truncate">
											{command.description}
										</p>
									</div>

									<!-- Enter indicator for selected -->
									{#if isSelected}
										<div class="flex items-center gap-1 text-xs text-gray-400">
											<CornerDownLeft class="h-3 w-3" />
										</div>
									{/if}
								</Command.Item>
							{/each}
						</Command.Group>
					{/each}
				</Command.List>

				<!-- Footer -->
				<div class="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500">
					<div class="flex items-center gap-4">
						<span class="flex items-center gap-1">
							<ArrowUp class="h-3 w-3" />
							<ArrowDown class="h-3 w-3" />
							Navigate
						</span>
						<span class="flex items-center gap-1">
							<CornerDownLeft class="h-3 w-3" />
							Select
						</span>
						<span class="flex items-center gap-1">
							<span class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono">Tab</span>
							Filter
						</span>
						<span class="flex items-center gap-1">
							<span class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono">Esc</span>
							Close
						</span>
					</div>
					<div class="flex items-center gap-1">
						<span class="text-gray-400">{$commandCount} results</span>
					</div>
				</div>
			</Command.Root>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
