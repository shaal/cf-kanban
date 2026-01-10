/**
 * GAP-8.4: Hooks Catalog Page Server
 */

import type { PageServerLoad } from './$types';
import { HOOKS_CATALOG, getHooksByCategory } from '$lib/server/capabilities/hooks-data';
import type { HookCategory } from '$lib/types/capabilities';

export const load: PageServerLoad = async () => {
	// Group hooks by category
	const hooksByCategory: Record<string, typeof HOOKS_CATALOG> = {};

	const categories: HookCategory[] = [
		'core',
		'session',
		'intelligence',
		'neural',
		'coverage',
		'background'
	];

	for (const category of categories) {
		hooksByCategory[category] = getHooksByCategory(category);
	}

	return {
		hooks: HOOKS_CATALOG,
		hooksByCategory,
		totalHooks: HOOKS_CATALOG.length
	};
};
