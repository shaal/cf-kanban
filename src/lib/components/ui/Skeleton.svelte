<script lang="ts">
  /**
   * Skeleton Component
   *
   * TASK-020: Polish and Documentation
   *
   * A loading placeholder component with pulse animation.
   * Used to show loading states for content.
   */
  import { cn } from '$lib/utils';

  export let className = '';
</script>

<div
  class={cn(
    'animate-pulse bg-gray-200 rounded',
    className
  )}
  role="status"
  aria-label="Loading..."
></div>

<style>
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
</style>
