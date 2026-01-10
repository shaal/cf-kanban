<script lang="ts">
  /**
   * Error Page Component
   *
   * TASK-020: Polish and Documentation
   *
   * Displays error information to users in a friendly way.
   */
  import { page } from '$app/stores';
  import Button from '$lib/components/ui/Button.svelte';
  import { AlertTriangle, Home, ArrowLeft } from 'lucide-svelte';
</script>

<svelte:head>
  <title>Error {$page.status} | CF Kanban</title>
</svelte:head>

<main class="min-h-screen bg-gray-50 flex items-center justify-center p-6">
  <div class="text-center max-w-md">
    <!-- Error icon -->
    <div class="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
      <AlertTriangle class="w-10 h-10 text-red-600" />
    </div>

    <!-- Error code -->
    <h1 class="text-6xl font-bold text-gray-200 mb-2">
      {$page.status}
    </h1>

    <!-- Error message -->
    <p class="text-xl text-gray-600 mb-2">
      {#if $page.status === 404}
        Page not found
      {:else if $page.status === 500}
        Something went wrong
      {:else}
        An error occurred
      {/if}
    </p>

    {#if $page.error?.message}
      <p class="text-gray-500 mb-8">
        {$page.error.message}
      </p>
    {:else}
      <p class="text-gray-500 mb-8">
        {#if $page.status === 404}
          The page you're looking for doesn't exist or has been moved.
        {:else}
          We're sorry, but something unexpected happened. Please try again.
        {/if}
      </p>
    {/if}

    <!-- Actions -->
    <div class="flex flex-col sm:flex-row gap-3 justify-center">
      <Button on:click={() => history.back()} variant="outline">
        <ArrowLeft class="w-4 h-4 mr-2" />
        Go Back
      </Button>
      <a href="/">
        <Button>
          <Home class="w-4 h-4 mr-2" />
          Return Home
        </Button>
      </a>
    </div>
  </div>
</main>
