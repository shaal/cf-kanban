<script lang="ts">
	/**
	 * Root Layout
	 * Includes global components like the Command Palette (GAP-8.2)
	 */
	import '../app.css';
	import { CommandPalette } from '$lib/components/command';

	let { children } = $props();
</script>

<!-- Global Command Palette (Cmd+K) -->
<CommandPalette />

{@render children()}
