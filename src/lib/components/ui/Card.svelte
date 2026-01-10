<script lang="ts">
  /**
   * Card Component
   *
   * TASK-011: Create Base UI Components
   *
   * A container component for grouped content.
   */
  import { cn } from '$lib/utils';

  interface Props {
    class?: string;
    style?: string;
    children?: import('svelte').Snippet;
  }

  let {
    class: className = '',
    style = '',
    children
  }: Props = $props();
</script>

<div
  class={cn(
    'rounded-lg border border-gray-200 bg-white shadow-sm',
    className
  )}
  {style}
>
  {#if children}
    {@render children()}
  {/if}
</div>
