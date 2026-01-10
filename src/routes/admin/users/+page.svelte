<script lang="ts">
  /**
   * TASK-101: User Management Page
   *
   * List users with pagination, invite new users,
   * change roles, and view activity.
   */
  import type { PageData } from './$types';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import {
    Users,
    UserPlus,
    Search,
    ChevronLeft,
    ChevronRight,
    MoreVertical,
    Mail,
    Shield,
    Clock,
    CheckCircle,
    XCircle,
    Trash2,
    Edit
  } from 'lucide-svelte';
  import { getRoleDisplayName, getRoleBadgeVariant } from '$lib/types/admin';
  import type { UserRole } from '@prisma/client';

  export let data: PageData;

  // State
  let searchQuery = $state('');
  let selectedRole = $state<UserRole | ''>('');
  let showInviteModal = $state(false);
  let showEditModal = $state(false);
  let selectedUser = $state<(typeof data.users.data)[0] | null>(null);

  // Invite form state
  let inviteEmail = $state('');
  let inviteName = $state('');
  let inviteRole = $state<UserRole>('MEMBER');
  let inviteError = $state('');

  // Pagination
  let currentPage = $state(data.users.page);

  // Filter users based on search
  let filteredUsers = $derived.by(() => {
    let users = data.users.data;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      users = users.filter(
        (u) =>
          u.email.toLowerCase().includes(query) ||
          u.name?.toLowerCase().includes(query)
      );
    }

    if (selectedRole) {
      users = users.filter((u) => u.role === selectedRole);
    }

    return users;
  });

  // Role options for select
  const roleOptions: { value: UserRole; label: string }[] = [
    { value: 'OWNER', label: 'Owner' },
    { value: 'ADMIN', label: 'Administrator' },
    { value: 'MEMBER', label: 'Member' },
    { value: 'VIEWER', label: 'Viewer' }
  ];

  async function handleInvite() {
    inviteError = '';

    if (!inviteEmail) {
      inviteError = 'Email is required';
      return;
    }

    try {
      const response = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName || undefined,
          role: inviteRole
        })
      });

      if (!response.ok) {
        const error = await response.json();
        inviteError = error.message || 'Failed to invite user';
        return;
      }

      // Reset form and close modal
      inviteEmail = '';
      inviteName = '';
      inviteRole = 'MEMBER';
      showInviteModal = false;

      // Refresh data
      window.location.reload();
    } catch (err) {
      inviteError = 'Failed to invite user';
    }
  }

  async function handleRoleChange(userId: string, newRole: UserRole) {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  }

  function formatDate(date: Date | null): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  }
</script>

<div class="user-management">
  <!-- Page Header -->
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">User Management</h1>
      <p class="text-gray-500 mt-1">
        {data.users.total} users total
      </p>
    </div>
    <Button onclick={() => (showInviteModal = true)}>
      <UserPlus class="w-4 h-4 mr-2" />
      Invite User
    </Button>
  </div>

  <!-- Filters -->
  <Card class="p-4 mb-6">
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="flex-1 relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="search"
          placeholder="Search by name or email..."
          bind:value={searchQuery}
          class="pl-10"
        />
      </div>
      <select
        bind:value={selectedRole}
        class="h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Roles</option>
        {#each roleOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>
  </Card>

  <!-- Users Table -->
  <Card>
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              User
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Role
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Status
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Last Login
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Projects
            </th>
            <th
              class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each filteredUsers as user}
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center"
                  >
                    {#if user.avatarUrl}
                      <img
                        src={user.avatarUrl}
                        alt={user.name || user.email}
                        class="w-10 h-10 rounded-full"
                      />
                    {:else}
                      <Users class="w-5 h-5 text-gray-500" />
                    {/if}
                  </div>
                  <div>
                    <div class="font-medium text-gray-900">
                      {user.name || 'Unnamed'}
                    </div>
                    <div class="text-sm text-gray-500">{user.email}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  <Shield class="w-3 h-3 mr-1" />
                  {getRoleDisplayName(user.role)}
                </Badge>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                {#if user.isActive}
                  <div class="flex items-center gap-1 text-green-600">
                    <CheckCircle class="w-4 h-4" />
                    <span class="text-sm">Active</span>
                  </div>
                {:else if user.invitedAt && !user.acceptedAt}
                  <div class="flex items-center gap-1 text-amber-600">
                    <Mail class="w-4 h-4" />
                    <span class="text-sm">Pending</span>
                  </div>
                {:else}
                  <div class="flex items-center gap-1 text-gray-500">
                    <XCircle class="w-4 h-4" />
                    <span class="text-sm">Inactive</span>
                  </div>
                {/if}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div class="flex items-center gap-1">
                  <Clock class="w-4 h-4" />
                  {formatDate(user.lastLoginAt)}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {user.projectCount ?? 0}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <div class="flex items-center justify-end gap-2">
                  <select
                    value={user.role}
                    onchange={(e) => handleRoleChange(user.id, (e.target as HTMLSelectElement).value as UserRole)}
                    class="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    {#each roleOptions as option}
                      <option value={option.value}>{option.label}</option>
                    {/each}
                  </select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onclick={() => handleDelete(user.id)}
                    class="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 class="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    {#if data.users.totalPages > 1}
      <div
        class="px-6 py-4 border-t border-gray-200 flex items-center justify-between"
      >
        <p class="text-sm text-gray-500">
          Showing {(currentPage - 1) * data.users.limit + 1} to
          {Math.min(currentPage * data.users.limit, data.users.total)} of
          {data.users.total} users
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
            Page {currentPage} of {data.users.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= data.users.totalPages}
            onclick={() => (window.location.href = `?page=${currentPage + 1}`)}
          >
            <ChevronRight class="w-4 h-4" />
          </Button>
        </div>
      </div>
    {/if}
  </Card>
</div>

<!-- Invite Modal -->
{#if showInviteModal}
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    onclick={() => (showInviteModal = false)}
  >
    <div
      class="bg-white rounded-lg shadow-xl w-full max-w-md p-6"
      onclick={(e) => e.stopPropagation()}
    >
      <h2 class="text-xl font-bold text-gray-900 mb-4">Invite User</h2>

      {#if inviteError}
        <div class="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {inviteError}
        </div>
      {/if}

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <Input
            type="email"
            bind:value={inviteEmail}
            placeholder="user@example.com"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <Input type="text" bind:value={inviteName} placeholder="John Doe" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <select
            bind:value={inviteRole}
            class="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm"
          >
            {#each roleOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="flex justify-end gap-3 mt-6">
        <Button variant="outline" onclick={() => (showInviteModal = false)}>
          Cancel
        </Button>
        <Button onclick={handleInvite}>
          <UserPlus class="w-4 h-4 mr-2" />
          Send Invitation
        </Button>
      </div>
    </div>
  </div>
{/if}
