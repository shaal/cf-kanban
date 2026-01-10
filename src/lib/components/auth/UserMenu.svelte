<!--
  TASK-099: User Menu Component

  Displays user avatar and dropdown menu with sign out option.
-->
<script lang="ts">
  import { page } from '$app/stores';
  import { signOut } from '@auth/sveltekit/client';

  let isOpen = $state(false);

  const session = $derived($page.data.session);
  const user = $derived(session?.user);

  function toggleMenu() {
    isOpen = !isOpen;
  }

  function closeMenu() {
    isOpen = false;
  }

  async function handleSignOut() {
    closeMenu();
    await signOut({ callbackUrl: '/' });
  }

  // Close menu when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu')) {
      closeMenu();
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

{#if user}
  <div class="relative user-menu">
    <button
      type="button"
      onclick={toggleMenu}
      class="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      {#if user.image}
        <img
          src={user.image}
          alt={user.name || user.email}
          class="h-8 w-8 rounded-full"
        />
      {:else}
        <div class="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-medium">
          {(user.name || user.email || '?')[0].toUpperCase()}
        </div>
      {/if}
      <span class="hidden sm:block text-sm text-gray-700">{user.name || user.email}</span>
      <svg class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    {#if isOpen}
      <div class="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
        <div class="py-1">
          <div class="px-4 py-2 border-b border-gray-100">
            <p class="text-sm font-medium text-gray-900">{user.name || 'User'}</p>
            <p class="text-xs text-gray-500 truncate">{user.email}</p>
            {#if user.role}
              <span class="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                {user.role}
              </span>
            {/if}
          </div>

          <a
            href="/settings/profile"
            onclick={closeMenu}
            class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Your Profile
          </a>

          <a
            href="/settings"
            onclick={closeMenu}
            class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Settings
          </a>

          <div class="border-t border-gray-100">
            <button
              type="button"
              onclick={handleSignOut}
              class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
{:else}
  <a
    href="/auth/signin"
    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
  >
    Sign in
  </a>
{/if}
