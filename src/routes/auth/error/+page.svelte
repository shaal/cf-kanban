<!--
  TASK-096: Auth Error Page

  Displays authentication errors with helpful messages.
-->
<script lang="ts">
  import { page } from '$app/stores';

  const errorMessages: Record<string, string> = {
    Configuration: 'There is a problem with the server configuration.',
    AccessDenied: 'You do not have access to this resource.',
    Verification: 'The verification link has expired or is invalid.',
    OAuthSignin: 'Error connecting to the authentication provider.',
    OAuthCallback: 'Error during authentication callback.',
    OAuthCreateAccount: 'Could not create user account.',
    EmailCreateAccount: 'Could not create user account.',
    Callback: 'Error during authentication callback.',
    OAuthAccountNotLinked: 'This email is already associated with another account.',
    EmailSignin: 'The email could not be sent.',
    CredentialsSignin: 'Sign in failed. Check your credentials.',
    SessionRequired: 'Please sign in to access this page.',
    Default: 'An error occurred during authentication.'
  };

  const error = $derived($page.url.searchParams.get('error') || 'Default');
  const errorMessage = $derived(errorMessages[error] || errorMessages.Default);
</script>

<svelte:head>
  <title>Authentication Error - CF Kanban</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8 text-center">
    <div>
      <h1 class="text-3xl font-extrabold text-gray-900">CF Kanban</h1>
      <div class="mt-6">
        <svg class="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 class="mt-4 text-2xl font-bold text-gray-900">
        Authentication Error
      </h2>
      <p class="mt-2 text-gray-600">
        {errorMessage}
      </p>
    </div>

    <div class="flex flex-col gap-3">
      <a
        href="/auth/signin"
        class="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Try again
      </a>

      <a
        href="/"
        class="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Go home
      </a>
    </div>
  </div>
</div>
