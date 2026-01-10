/**
 * TASK-101: User Management Page Server
 *
 * Server-side data loading for user management.
 */

import type { PageServerLoad } from './$types';
import { userService } from '$lib/server/admin/user-service';
import type { PaginatedResponse, UserWithActivity } from '$lib/types/admin';
import type { UserRole } from '@prisma/client';

export interface UserManagementData {
  users: PaginatedResponse<UserWithActivity>;
}

export const load: PageServerLoad = async ({
  url
}): Promise<UserManagementData> => {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const role = url.searchParams.get('role') as UserRole | null;
  const search = url.searchParams.get('search') || undefined;
  const isActive = url.searchParams.get('active');

  const users = await userService.listUsers(
    { page, limit, sortBy: 'createdAt', sortOrder: 'desc' },
    {
      role: role || undefined,
      isActive: isActive ? isActive === 'true' : undefined,
      search
    }
  );

  return {
    users
  };
};
