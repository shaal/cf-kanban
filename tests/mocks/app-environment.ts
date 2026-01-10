/**
 * Mock for $app/environment
 *
 * This mock provides the browser and other environment variables
 * needed by SvelteKit components during testing.
 */

// Default to browser: true for most tests
export const browser = true;
export const dev = true;
export const building = false;
export const version = 'test';
