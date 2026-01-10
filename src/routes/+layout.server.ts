/**
 * TASK-099: Root Layout Server Load
 *
 * Provides session data to all pages for auth state.
 */

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  const session = await event.locals.auth();

  return {
    session
  };
};
