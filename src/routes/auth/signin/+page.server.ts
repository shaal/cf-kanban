/**
 * TASK-096: Sign In Page Server
 *
 * Handles server-side rendering for the sign in page.
 */

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const session = await event.locals.auth();

  // If already signed in, redirect to callback URL or projects
  if (session?.user) {
    const callbackUrl = event.url.searchParams.get('callbackUrl') || '/projects';
    throw redirect(303, callbackUrl);
  }

  return {
    session: null
  };
};
