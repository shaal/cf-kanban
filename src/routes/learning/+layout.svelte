<script lang="ts">
	/**
	 * GAP-8.4: Learning Section Layout with Capabilities Sidebar
	 *
	 * Main layout for the learning section featuring:
	 * - Sidebar with capabilities browser tree
	 * - Navigation to learning subsections
	 * - Collapsible sidebar for mobile
	 */
	import { page } from '$app/stores';
	import { CapabilitiesTree } from '$lib/components/capabilities';
	import {
		Brain,
		Database,
		Share2,
		GitCompare,
		Bot,
		ChevronRight,
		Home,
		Menu,
		X,
		Sparkles
	} from 'lucide-svelte';

	let { children, data } = $props();

	// Mobile sidebar state
	let sidebarOpen = $state(false);

	// Navigation items for learning section
	const navItems = [
		{
			href: '/learning/agents',
			label: 'Agent Catalog',
			icon: Bot,
			description: 'Browse 60+ agent types',
			tourId: 'nav-agents'
		},
		{
			href: '/learning/neural',
			label: 'Neural Training',
			icon: Brain,
			description: 'SONA, MoE, EWC metrics',
			tourId: 'nav-neural'
		},
		{
			href: '/learning/patterns',
			label: 'Patterns',
			icon: GitCompare,
			description: 'Learned patterns library',
			tourId: 'nav-patterns'
		},
		{
			href: '/learning/memory',
			label: 'Memory',
			icon: Database,
			description: 'AgentDB memory store',
			tourId: 'nav-memory'
		},
		{
			href: '/learning/transfer',
			label: 'Transfer',
			icon: Share2,
			description: 'Share patterns via IPFS',
			tourId: 'nav-transfer'
		}
	];

	// Check if nav item is active
	function isActive(href: string): boolean {
		return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
	}

	// Get breadcrumb from path
	let breadcrumbs = $derived.by(() => {
		const path = $page.url.pathname;
		const parts = path.split('/').filter(Boolean);
		const crumbs: { label: string; href: string }[] = [];

		let currentPath = '';
		for (const part of parts) {
			currentPath += `/${part}`;
			const label = part.charAt(0).toUpperCase() + part.slice(1);
			crumbs.push({ label, href: currentPath });
		}

		return crumbs;
	});
</script>

<svelte:head>
	<title>Learning | CF Kanban</title>
</svelte:head>

<div class="learning-layout flex h-screen bg-gray-100">
	<!-- Mobile sidebar backdrop -->
	{#if sidebarOpen}
		<button
			type="button"
			class="fixed inset-0 z-40 bg-black/50 lg:hidden"
			onclick={() => (sidebarOpen = false)}
			aria-label="Close sidebar"
		></button>
	{/if}

	<!-- Sidebar -->
	<aside
		class="sidebar fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 lg:translate-x-0"
		class:translate-x-0={sidebarOpen}
		class:-translate-x-full={!sidebarOpen}
	>
		<!-- Logo/Header -->
		<div class="p-4 border-b border-gray-200">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
						<Sparkles class="w-5 h-5 text-white" />
					</div>
					<div>
						<h1 class="font-bold text-lg text-gray-900">Learning</h1>
						<p class="text-xs text-gray-500">Claude Flow V3</p>
					</div>
				</div>
				<button
					type="button"
					class="lg:hidden p-1 rounded hover:bg-gray-100"
					onclick={() => (sidebarOpen = false)}
				>
					<X class="w-5 h-5 text-gray-500" />
				</button>
			</div>
		</div>

		<!-- Navigation -->
		<nav class="flex-shrink-0 p-4 border-b border-gray-200">
			<h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
				Sections
			</h2>
			<div class="space-y-1">
				{#each navItems as item}
					{@const active = isActive(item.href)}
					<a
						href={item.href}
						class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm
							{active
								? 'bg-indigo-50 text-indigo-700 font-medium'
								: 'text-gray-700 hover:bg-gray-50'}"
						onclick={() => (sidebarOpen = false)}
						data-tour={item.tourId}
					>
						<item.icon class="w-4 h-4 flex-shrink-0 {active ? 'text-indigo-600' : 'text-gray-400'}" />
						<div class="flex-1 min-w-0">
							<span class="block">{item.label}</span>
							{#if !active}
								<span class="block text-xs text-gray-400 truncate">
									{item.description}
								</span>
							{/if}
						</div>
						{#if active}
							<ChevronRight class="w-4 h-4 flex-shrink-0 text-indigo-400" />
						{/if}
					</a>
				{/each}
			</div>
		</nav>

		<!-- Capabilities Tree -->
		<div class="flex-1 overflow-y-auto p-4">
			<h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
				Capabilities
			</h2>
			<CapabilitiesTree
				agentCounts={data.agentCounts}
				hookCounts={data.hookCounts}
				workerCounts={data.workerCounts}
				totalAgents={data.totalAgents}
				totalHooks={data.totalHooks}
				totalWorkers={data.totalWorkers}
			/>
		</div>

		<!-- Footer -->
		<div class="p-4 border-t border-gray-200">
			<a
				href="/"
				class="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
			>
				<Home class="w-4 h-4" />
				<span>Back to Projects</span>
			</a>
		</div>
	</aside>

	<!-- Main Content -->
	<main class="flex-1 flex flex-col overflow-hidden">
		<!-- Top Bar -->
		<header class="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex-shrink-0">
			<div class="flex items-center justify-between">
				<!-- Mobile menu button + Breadcrumb -->
				<div class="flex items-center gap-3">
					<button
						type="button"
						class="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"
						onclick={() => (sidebarOpen = true)}
					>
						<Menu class="w-5 h-5 text-gray-600" />
					</button>

					<nav class="flex items-center gap-2 text-sm">
						{#each breadcrumbs as crumb, index}
							{#if index > 0}
								<ChevronRight class="w-4 h-4 text-gray-400" />
							{/if}
							{#if index === breadcrumbs.length - 1}
								<span class="font-medium text-gray-900">{crumb.label}</span>
							{:else}
								<a
									href={crumb.href}
									class="text-gray-500 hover:text-gray-900 transition-colors"
								>
									{crumb.label}
								</a>
							{/if}
						{/each}
					</nav>
				</div>

				<!-- Quick stats (desktop only) -->
				<div class="hidden md:flex items-center gap-4 text-sm">
					<div class="flex items-center gap-1.5 text-gray-500">
						<Bot class="w-4 h-4 text-purple-500" />
						<span>{data.totalAgents} Agents</span>
					</div>
					<div class="flex items-center gap-1.5 text-gray-500">
						<span class="w-2 h-2 rounded-full bg-blue-500"></span>
						<span>{data.totalHooks} Hooks</span>
					</div>
					<div class="flex items-center gap-1.5 text-gray-500">
						<span class="w-2 h-2 rounded-full bg-orange-500"></span>
						<span>{data.totalWorkers} Workers</span>
					</div>
				</div>
			</div>
		</header>

		<!-- Page Content -->
		<div class="flex-1 overflow-auto">
			{@render children()}
		</div>
	</main>
</div>

<style>
	.learning-layout {
		min-height: 100vh;
	}

	.sidebar {
		box-shadow: 0 0 20px rgba(0, 0, 0, 0.05);
	}

	@media (min-width: 1024px) {
		.sidebar {
			box-shadow: none;
		}
	}
</style>
