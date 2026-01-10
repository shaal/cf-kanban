<!--
  TASK-096: Sign Out Page

  Confirmation page for signing out.
-->
<script lang="ts">
  import { signOut } from '@auth/sveltekit/client';

  let loading = $state(false);

  async function handleSignOut() {
    loading = true;
    await signOut({ callbackUrl: '/' });
  }
</script>

<svelte:head>
  <title>Sign Out - CF Kanban</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8 text-center">
    <div>
      <h1 class="text-3xl font-extrabold text-gray-900">CF Kanban</h1>
      <h2 class="mt-6 text-2xl font-bold text-gray-900">
        Sign out
      </h2>
      <p class="mt-2 text-gray-600">
        Are you sure you want to sign out?
      </p>
    </div>

    <div class="flex flex-col gap-3">
      <button
        type="button"
        onclick={handleSignOut}
        disabled={loading}
        class="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
      >
        {#if loading}
          Signing out...
        {:else}
          Sign out
        {/if}
      </button>

      <a
        href="/projects"
        class="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Cancel
      </a>
    </div>
  </div>
</div>
