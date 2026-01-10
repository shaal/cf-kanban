<script lang="ts">
	/**
	 * GAP-8.4: Capabilities Browser in Sidebar
	 *
	 * Expandable tree component showing Claude Flow V3 capabilities:
	 * - 60+ Agent types organized by category
	 * - 27 Hooks organized by category
	 * - 12 Background Workers organized by priority
	 *
	 * Features collapsible sections with real counts and
	 * links to detailed catalog pages.
	 */
	import { page } from '$app/stores';
	import {
		Bot,
		Anchor,
		Cog,
		ChevronDown,
		ChevronRight,
		ExternalLink,
		Code,
		Shield,
		Network,
		Vote,
		GitPullRequest,
		Compass,
		TestTube2,
		Server,
		Gauge
	} from 'lucide-svelte';
	import type { AgentCategory } from '$lib/types/agents';
	import { CATEGORY_CONFIG } from '$lib/types/agents';

	interface Props {
		/** Agent counts by category */
		agentCounts: Record<string, number>;
		/** Hook counts by category */
		hookCounts: Record<string, number>;
		/** Worker counts by priority */
		workerCounts: Record<string, number>;
		/** Total agent count */
		totalAgents: number;
		/** Total hook count */
		totalHooks: number;
		/** Total worker count */
		totalWorkers: number;
	}

	let {
		agentCounts,
		hookCounts,
		workerCounts,
		totalAgents,
		totalHooks,
		totalWorkers
	}: Props = $props();

	// Expansion state
	let expandedSections = $state<Set<string>>(new Set(['agents']));
	let expandedSubsections = $state<Set<string>>(new Set());

	function toggleSection(section: string) {
		if (expandedSections.has(section)) {
			expandedSections.delete(section);
		} else {
			expandedSections.add(section);
		}
		expandedSections = new Set(expandedSections);
	}

	function toggleSubsection(subsection: string) {
		if (expandedSubsections.has(subsection)) {
			expandedSubsections.delete(subsection);
		} else {
			expandedSubsections.add(subsection);
		}
		expandedSubsections = new Set(expandedSubsections);
	}

	// Category icon mapping
	const categoryIcons: Record<AgentCategory, typeof Bot> = {
		'core-development': Code,
		'v3-specialized': Shield,
		'swarm-coordination': Network,
		'consensus-distributed': Vote,
		'github-repository': GitPullRequest,
		'sparc-methodology': Compass,
		'testing-validation': TestTube2,
		'specialized-dev': Server,
		'performance-optimization': Gauge
	};

	// Check if current path matches
	function isActive(path: string): boolean {
		return $page.url.pathname === path || $page.url.pathname.startsWith(path + '/');
	}
</script>

<div class="capabilities-tree text-sm">
	<!-- Agents Section -->
	<div class="section">
		<button
			type="button"
			class="section-header group"
			class:active={isActive('/learning/agents')}
			onclick={() => toggleSection('agents')}
		>
			<div class="flex items-center gap-2 flex-1">
				{#if expandedSections.has('agents')}
					<ChevronDown class="w-4 h-4 text-gray-400 flex-shrink-0" />
				{:else}
					<ChevronRight class="w-4 h-4 text-gray-400 flex-shrink-0" />
				{/if}
				<Bot class="w-4 h-4 text-purple-500 flex-shrink-0" />
				<span class="font-medium">Agents</span>
			</div>
			<span class="count-badge">{totalAgents}</span>
		</button>

		{#if expandedSections.has('agents')}
			<div class="subsection-container">
				<!-- Link to full catalog -->
				<a
					href="/learning/agents"
					class="catalog-link"
					class:active={isActive('/learning/agents')}
				>
					<ExternalLink class="w-3.5 h-3.5" />
					<span>View Full Catalog</span>
				</a>

				<!-- Agent categories -->
				{#each Object.entries(CATEGORY_CONFIG) as [category, config]}
					{@const count = agentCounts[category] || 0}
					{@const Icon = categoryIcons[category as AgentCategory]}
					{#if count > 0}
						<button
							type="button"
							class="subsection-item"
							onclick={() => toggleSubsection(`agent-${category}`)}
						>
							<div class="flex items-center gap-2 flex-1 min-w-0">
								{#if expandedSubsections.has(`agent-${category}`)}
									<ChevronDown class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
								{:else}
									<ChevronRight class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
								{/if}
								<Icon class="w-3.5 h-3.5 flex-shrink-0" style="color: {config.color}" />
								<span class="truncate">{config.label}</span>
							</div>
							<span class="count-badge-sm">{count}</span>
						</button>

						{#if expandedSubsections.has(`agent-${category}`)}
							<div class="description-text">
								{config.description}
							</div>
						{/if}
					{/if}
				{/each}
			</div>
		{/if}
	</div>

	<!-- Hooks Section -->
	<div class="section">
		<button
			type="button"
			class="section-header group"
			onclick={() => toggleSection('hooks')}
		>
			<div class="flex items-center gap-2 flex-1">
				{#if expandedSections.has('hooks')}
					<ChevronDown class="w-4 h-4 text-gray-400 flex-shrink-0" />
				{:else}
					<ChevronRight class="w-4 h-4 text-gray-400 flex-shrink-0" />
				{/if}
				<Anchor class="w-4 h-4 text-blue-500 flex-shrink-0" />
				<span class="font-medium">Hooks</span>
			</div>
			<span class="count-badge">{totalHooks}</span>
		</button>

		{#if expandedSections.has('hooks')}
			<div class="subsection-container">
				<!-- Link to hooks page (future) -->
				<a href="/learning/hooks" class="catalog-link">
					<ExternalLink class="w-3.5 h-3.5" />
					<span>View Hooks Catalog</span>
				</a>

				<!-- Hook categories -->
				{#each Object.entries(hookCounts) as [category, count]}
					<div class="subsection-item-static">
						<div class="flex items-center gap-2 flex-1">
							<span class="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></span>
							<span class="truncate capitalize">{category.replace('-', ' ')}</span>
						</div>
						<span class="count-badge-sm">{count}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Workers Section -->
	<div class="section">
		<button
			type="button"
			class="section-header group"
			onclick={() => toggleSection('workers')}
		>
			<div class="flex items-center gap-2 flex-1">
				{#if expandedSections.has('workers')}
					<ChevronDown class="w-4 h-4 text-gray-400 flex-shrink-0" />
				{:else}
					<ChevronRight class="w-4 h-4 text-gray-400 flex-shrink-0" />
				{/if}
				<Cog class="w-4 h-4 text-orange-500 flex-shrink-0" />
				<span class="font-medium">Workers</span>
			</div>
			<span class="count-badge">{totalWorkers}</span>
		</button>

		{#if expandedSections.has('workers')}
			<div class="subsection-container">
				<!-- Link to workers page (future) -->
				<a href="/learning/workers" class="catalog-link">
					<ExternalLink class="w-3.5 h-3.5" />
					<span>View Workers Catalog</span>
				</a>

				<!-- Worker priorities -->
				{#each Object.entries(workerCounts) as [priority, count]}
					{@const colors = {
						critical: 'bg-red-500',
						high: 'bg-amber-500',
						normal: 'bg-green-500',
						low: 'bg-gray-400'
					}}
					<div class="subsection-item-static">
						<div class="flex items-center gap-2 flex-1">
							<span class="w-1.5 h-1.5 rounded-full {colors[priority as keyof typeof colors]} flex-shrink-0"></span>
							<span class="truncate capitalize">{priority} Priority</span>
						</div>
						<span class="count-badge-sm">{count}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.capabilities-tree {
		padding: 0.5rem 0;
	}

	.section {
		margin-bottom: 0.25rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.5rem 0.75rem;
		text-align: left;
		border-radius: 0.375rem;
		transition: background-color 150ms;
	}

	.section-header:hover {
		background-color: rgba(0, 0, 0, 0.05);
	}

	.section-header.active {
		background-color: rgba(99, 102, 241, 0.1);
		color: #4f46e5;
	}

	.subsection-container {
		margin-left: 1rem;
		padding-left: 0.75rem;
		border-left: 1px solid rgba(0, 0, 0, 0.1);
		margin-top: 0.25rem;
		margin-bottom: 0.5rem;
	}

	.catalog-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.5rem;
		font-size: 0.75rem;
		color: #6366f1;
		border-radius: 0.25rem;
		transition: background-color 150ms;
		margin-bottom: 0.25rem;
	}

	.catalog-link:hover {
		background-color: rgba(99, 102, 241, 0.1);
	}

	.catalog-link.active {
		background-color: rgba(99, 102, 241, 0.15);
		font-weight: 500;
	}

	.subsection-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.375rem 0.5rem;
		text-align: left;
		font-size: 0.8125rem;
		color: #4b5563;
		border-radius: 0.25rem;
		transition: background-color 150ms;
	}

	.subsection-item:hover {
		background-color: rgba(0, 0, 0, 0.05);
	}

	.subsection-item-static {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.375rem 0.5rem;
		font-size: 0.8125rem;
		color: #4b5563;
	}

	.description-text {
		padding: 0.25rem 0.5rem 0.5rem 1.5rem;
		font-size: 0.75rem;
		color: #6b7280;
		line-height: 1.4;
	}

	.count-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.5rem;
		padding: 0.125rem 0.375rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: #6b7280;
		background-color: rgba(0, 0, 0, 0.05);
		border-radius: 9999px;
	}

	.count-badge-sm {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.25rem;
		padding: 0.0625rem 0.25rem;
		font-size: 0.6875rem;
		font-weight: 500;
		color: #9ca3af;
		background-color: rgba(0, 0, 0, 0.04);
		border-radius: 9999px;
	}
</style>
