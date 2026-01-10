import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [svelte({ hot: !process.env.VITEST })],
	test: {
		include: ['tests/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./tests/setup.ts']
	},
	resolve: {
		alias: {
			'$lib': '/src/lib',
			'$app': '/.svelte-kit/runtime/app'
		}
	}
});
