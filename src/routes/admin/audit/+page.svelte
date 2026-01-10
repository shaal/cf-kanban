<script lang="ts">
  /**
   * TASK-104: Audit Log Viewer Page
   *
   * View, filter, and export audit logs.
   */
  import type { PageData } from './$types';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import {
    FileText,
    Search,
    Download,
    ChevronLeft,
    ChevronRight,
    Filter,
    Calendar,
    User,
    AlertCircle,
    Users,
    FolderKanban,
    Ticket,
    Settings,
    Shield
  } from 'lucide-svelte';
  import { getActionDisplayName } from '$lib/types/admin';
  import type { AuditAction } from '@prisma/client';

  export let data: PageData;

  // State
  let searchQuery = $state('');
  let selectedAction = $state<AuditAction | ''>('');
  let selectedEntityType = $state('');
  let showSensitiveOnly = $state(false);
  let startDate = $state('');
  let endDate = $state('');
  let showFilters = $state(false);

  // Pagination
  let currentPage = $state(data.logs.page);

  // Available actions for filter
  const actionOptions: { value: AuditAction; label: string }[] = [
    { value: 'USER_CREATED', label: 'User Created' },
    { value: 'USER_UPDATED', label: 'User Updated' },
    { value: 'USER_DELETED', label: 'User Deleted' },
    { value: 'USER_INVITED', label: 'User Invited' },
    { value: 'USER_ROLE_CHANGED', label: 'Role Changed' },
    { value: 'USER_LOGIN', label: 'User Login' },
    { value: 'USER_LOGOUT', label: 'User Logout' },
    { value: 'PROJECT_CREATED', label: 'Project Created' },
    { value: 'PROJECT_UPDATED', label: 'Project Updated' },
    { value: 'PROJECT_DELETED', label: 'Project Deleted' },
    { value: 'PROJECT_ARCHIVED', label: 'Project Archived' },
    { value: 'PROJECT_MEMBER_ADDED', label: 'Member Added' },
    { value: 'PROJECT_MEMBER_REMOVED', label: 'Member Removed' },
    { value: 'SETTINGS_UPDATED', label: 'Settings Updated' },
    { value: 'PERMISSION_DENIED', label: 'Permission Denied' },
    { value: 'SENSITIVE_DATA_ACCESSED', label: 'Sensitive Access' }
  ];

  const entityTypes = ['User', 'Project', 'Ticket', 'SystemSettings'];

  // Filter logs
  let filteredLogs = $derived.by(() => {
    let logs = data.logs.data;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.description.toLowerCase().includes(query) ||
          l.userEmail.toLowerCase().includes(query)
      );
    }

    return logs;
  });

  function getActionIcon(action: AuditAction) {
    if (action.startsWith('USER_')) return Users;
    if (action.startsWith('PROJECT_')) return FolderKanban;
    if (action.startsWith('TICKET_')) return Ticket;
    if (action.startsWith('SETTINGS_')) return Settings;
    return Shield;
  }

  function getActionColor(action: AuditAction): string {
    if (action === 'PERMISSION_DENIED' || action === 'USER_DELETED' || action === 'PROJECT_DELETED') {
      return 'text-red-600 bg-red-100';
    }
    if (action === 'SENSITIVE_DATA_ACCESSED' || action === 'USER_ROLE_CHANGED') {
      return 'text-amber-600 bg-amber-100';
    }
    if (action.includes('CREATED') || action.includes('ADDED')) {
      return 'text-green-600 bg-green-100';
    }
    return 'text-blue-600 bg-blue-100';
  }

  function formatDate(date: Date): string {
    return new Date(date).toLocaleString();
  }

  async function exportCSV() {
    try {
      const params = new URLSearchParams();
      if (selectedAction) params.set('action', selectedAction);
      if (selectedEntityType) params.set('entityType', selectedEntityType);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/api/admin/audit/export?format=csv&${params}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export:', err);
    }
  }

  async function exportJSON() {
    try {
      const params = new URLSearchParams();
      if (selectedAction) params.set('action', selectedAction);
      if (selectedEntityType) params.set('entityType', selectedEntityType);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/api/admin/audit/export?format=json&${params}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export:', err);
    }
  }

  function applyFilters() {
    const params = new URLSearchParams();
    if (selectedAction) params.set('action', selectedAction);
    if (selectedEntityType) params.set('entityType', selectedEntityType);
    if (showSensitiveOnly) params.set('sensitive', 'true');
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    window.location.href = `?${params}`;
  }
</script>

<div class="audit-logs">
  <!-- Page Header -->
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Audit Logs</h1>
      <p class="text-gray-500 mt-1">
        {data.logs.total} entries total
      </p>
    </div>
    <div class="flex items-center gap-3">
      <Button variant="outline" onclick={() => (showFilters = !showFilters)}>
        <Filter class="w-4 h-4 mr-2" />
        Filters
      </Button>
      <div class="relative group">
        <Button variant="outline">
          <Download class="w-4 h-4 mr-2" />
          Export
        </Button>
        <div class="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
          <button
            class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-t-lg"
            onclick={exportCSV}
          >
            Export as CSV
          </button>
          <button
            class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-b-lg"
            onclick={exportJSON}
          >
            Export as JSON
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Filters Panel -->
  {#if showFilters}
    <Card class="p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Action Type
          </label>
          <select
            bind:value={selectedAction}
            class="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm"
          >
            <option value="">All Actions</option>
            {#each actionOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Entity Type
          </label>
          <select
            bind:value={selectedEntityType}
            class="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm"
          >
            <option value="">All Entities</option>
            {#each entityTypes as type}
              <option value={type}>{type}</option>
            {/each}
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <Input type="date" bind:value={startDate} />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <Input type="date" bind:value={endDate} />
        </div>
      </div>

      <div class="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            bind:checked={showSensitiveOnly}
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span class="text-sm text-gray-700">Show sensitive operations only</span>
        </label>
        <Button onclick={applyFilters}>Apply Filters</Button>
      </div>
    </Card>
  {/if}

  <!-- Search Bar -->
  <Card class="p-4 mb-6">
    <div class="relative">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <Input
        type="search"
        placeholder="Search by description or user email..."
        bind:value={searchQuery}
        class="pl-10"
      />
    </div>
  </Card>

  <!-- Logs List -->
  <Card>
    <div class="divide-y divide-gray-200">
      {#each filteredLogs as log}
        <div class="p-4 hover:bg-gray-50">
          <div class="flex items-start gap-4">
            <!-- Icon -->
            <div class="p-2 rounded-lg {getActionColor(log.action)}">
              <svelte:component this={getActionIcon(log.action)} class="w-5 h-5" />
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-medium text-gray-900">
                  {getActionDisplayName(log.action)}
                </span>
                {#if log.isSensitive}
                  <Badge variant="warning" class="flex items-center gap-1">
                    <AlertCircle class="w-3 h-3" />
                    Sensitive
                  </Badge>
                {/if}
                <Badge variant="secondary">{log.entityType}</Badge>
              </div>

              <p class="text-sm text-gray-600 mt-1">{log.description}</p>

              <div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span class="flex items-center gap-1">
                  <User class="w-3 h-3" />
                  {log.userName || log.userEmail}
                </span>
                <span class="flex items-center gap-1">
                  <Calendar class="w-3 h-3" />
                  {formatDate(log.createdAt)}
                </span>
                {#if log.ipAddress}
                  <span>{log.ipAddress}</span>
                {/if}
              </div>
            </div>

            <!-- Entity ID -->
            {#if log.entityId}
              <div class="text-xs text-gray-400 font-mono">
                {log.entityId.slice(0, 8)}...
              </div>
            {/if}
          </div>
        </div>
      {:else}
        <div class="p-12 text-center">
          <FileText class="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 mb-2">No logs found</h3>
          <p class="text-gray-500">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'No audit logs have been recorded yet'}
          </p>
        </div>
      {/each}
    </div>

    <!-- Pagination -->
    {#if data.logs.totalPages > 1}
      <div
        class="px-6 py-4 border-t border-gray-200 flex items-center justify-between"
      >
        <p class="text-sm text-gray-500">
          Showing {(currentPage - 1) * data.logs.limit + 1} to
          {Math.min(currentPage * data.logs.limit, data.logs.total)} of
          {data.logs.total} entries
        </p>
        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onclick={() => (window.location.href = `?page=${currentPage - 1}`)}
          >
            <ChevronLeft class="w-4 h-4" />
          </Button>
          <span class="text-sm text-gray-700">
            Page {currentPage} of {data.logs.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= data.logs.totalPages}
            onclick={() => (window.location.href = `?page=${currentPage + 1}`)}
          >
            <ChevronRight class="w-4 h-4" />
          </Button>
        </div>
      </div>
    {/if}
  </Card>
</div>
