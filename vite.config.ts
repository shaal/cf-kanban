import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		// Code splitting configuration for TASK-091
		rollupOptions: {
			output: {
				// Manual chunks for optimal code splitting
				manualChunks: {
					// D3 library in its own chunk (large dependency)
					'd3-vendor': ['d3'],
					// Visualization components
					'viz-utils': [
						'./src/lib/components/viz/D3Container.svelte',
						'./src/lib/components/viz/LineChart.svelte',
						'./src/lib/components/viz/BarChart.svelte'
					]
				}
			}
		},
		// Chunk size warnings
		chunkSizeWarningLimit: 500
	},
	// Optimize dependencies
	optimizeDeps: {
		include: ['d3'],
		exclude: []
	}
});
