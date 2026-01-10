<!--
  TASK-099: Auth Guard Component

  Protects content and shows appropriate UI based on auth state.
  Handles loading states and redirects for unauthenticated users.
-->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  interface Props {
    /** Required role to view content (optional) */
    requiredRole?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
    /** URL to redirect to when not authenticated */
    redirectTo?: string;
    /** Show loading spinner while checking auth */
    showLoading?: boolean;
    /** Fallback content when not authorized (instead of redirect) */
    children?: import('svelte').Snippet;
    /** Content to show when not authorized */
    fallback?: import('svelte').Snippet;
    /** Content to show while loading */
    loading?: import('svelte').Snippet;
  }

  let {
    requiredRole,
    redirectTo = '/auth/signin',
    showLoading = true,
    children,
    fallback,
    loading
  }: Props = $props();

  // Role hierarchy for comparison
  const roleHierarchy: Record<string, number> = {
    OWNER: 4,
    ADMIN: 3,
    MEMBER: 2,
    VIEWER: 1
  };

  // Derived auth state from page data
  const session = $derived($page.data.session);
  const isAuthenticated = $derived(!!session?.user);
  const userRole = $derived(session?.user?.role || 'VIEWER');
  const isLoading = $derived(session === undefined);

  const hasRequiredRole = $derived(() => {
    if (!requiredRole) return true;
    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    return userLevel >= requiredLevel;
  });

  const isAuthorized = $derived(isAuthenticated && hasRequiredRole());

  // Handle redirect for unauthenticated users
  $effect(() => {
    if (!isLoading && !isAuthenticated && !fallback) {
      const callbackUrl = encodeURIComponent($page.url.pathname + $page.url.search);
      goto(`${redirectTo}?callbackUrl=${callbackUrl}`);
    }
  });
</script>

{#if isLoading && showLoading}
  {#if loading}
    {@render loading()}
  {:else}
    <div class="flex items-center justify-center min-h-[200px]">
      <div class="flex flex-col items-center gap-4">
        <svg class="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  {/if}
{:else if isAuthorized}
  {#if children}
    {@render children()}
  {/if}
{:else if !isAuthenticated && fallback}
  {@render fallback()}
{:else if !hasRequiredRole() && fallback}
  {@render fallback()}
{:else if !hasRequiredRole()}
  <div class="flex items-center justify-center min-h-[200px]">
    <div class="text-center">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
      <p class="mt-1 text-sm text-gray-500">
        You don't have permission to view this content.
      </p>
      <div class="mt-6">
        <a
          href="/projects"
          class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Go to Projects
        </a>
      </div>
    </div>
  </div>
{/if}
