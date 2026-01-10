<script lang="ts">
  /**
   * TASK-100: Admin Layout
   *
   * Main layout for the admin panel with navigation sidebar
   * and role-based access verification.
   */
  import { page } from '$app/stores';
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import {
    Users,
    FolderKanban,
    Settings,
    FileText,
    Shield,
    Home,
    ChevronRight
  } from 'lucide-svelte';

  let { children, data } = $props();

  // Navigation items
  const navItems = [
    {
      href: '/admin',
      label: 'Dashboard',
      icon: Home,
      exact: true
    },
    {
      href: '/admin/users',
      label: 'Users',
      icon: Users,
      description: 'Manage users and roles'
    },
    {
      href: '/admin/projects',
      label: 'Projects',
      icon: FolderKanban,
      description: 'Project overview'
    },
    {
      href: '/admin/settings',
      label: 'Settings',
      icon: Settings,
      description: 'System configuration'
    },
    {
      href: '/admin/audit',
      label: 'Audit Logs',
      icon: FileText,
      description: 'Activity history'
    }
  ];

  // Check if nav item is active
  function isActive(href: string, exact: boolean = false): boolean {
    if (exact) {
      return $page.url.pathname === href;
    }
    return $page.url.pathname.startsWith(href);
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
  <title>Admin Panel | CF Kanban</title>
</svelte:head>

<div class="admin-layout flex h-screen bg-gray-100">
  <!-- Sidebar -->
  <aside class="w-64 bg-gray-900 text-white flex flex-col">
    <!-- Logo/Header -->
    <div class="p-4 border-b border-gray-800">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-indigo-600 rounded-lg">
          <Shield class="w-5 h-5" />
        </div>
        <div>
          <h1 class="font-bold text-lg">Admin Panel</h1>
          <p class="text-xs text-gray-400">CF Kanban</p>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 p-4 space-y-1">
      {#each navItems as item}
        {@const active = isActive(item.href, item.exact)}
        <a
          href={item.href}
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
            {active
              ? 'bg-indigo-600 text-white'
              : 'text-gray-300 hover:bg-gray-800 hover:text-white'}"
        >
          <item.icon class="w-5 h-5 flex-shrink-0" />
          <div class="flex-1 min-w-0">
            <span class="block font-medium text-sm">{item.label}</span>
            {#if item.description && !active}
              <span class="block text-xs text-gray-500 truncate">
                {item.description}
              </span>
            {/if}
          </div>
          {#if active}
            <ChevronRight class="w-4 h-4 flex-shrink-0" />
          {/if}
        </a>
      {/each}
    </nav>

    <!-- Footer -->
    <div class="p-4 border-t border-gray-800">
      <a
        href="/"
        class="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <Home class="w-4 h-4" />
        <span>Back to App</span>
      </a>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="flex-1 overflow-auto">
    <!-- Top Bar -->
    <header class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex items-center justify-between">
        <!-- Breadcrumb -->
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

        <!-- User Info (placeholder for auth integration) -->
        <div class="flex items-center gap-3">
          <Badge variant="warning">Admin</Badge>
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <Users class="w-4 h-4 text-gray-500" />
            </div>
            <span class="text-sm font-medium text-gray-700">Admin User</span>
          </div>
        </div>
      </div>
    </header>

    <!-- Page Content -->
    <div class="p-6">
      {@render children()}
    </div>
  </main>
</div>

<style>
  .admin-layout {
    min-height: 100vh;
  }
</style>
