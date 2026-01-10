import adapterAuto from '@sveltejs/adapter-auto';
import adapterNode from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Use node adapter for production Docker builds, auto adapter for development
const isProduction = process.env.NODE_ENV === 'production';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: isProduction
			? adapterNode({
					out: 'build',
					precompress: true,
					envPrefix: ''
				})
			: adapterAuto(),
		alias: {
			$lib: './src/lib',
			'$lib/*': './src/lib/*',
			$components: './src/lib/components',
			'$components/*': './src/lib/components/*'
		}
	}
};

export default config;
