<script lang="ts">
  /**
   * Badge Component
   *
   * TASK-011: Create Base UI Components
   *
   * A small label component for status, priority, or tags.
   */
  import { cn } from '$lib/utils';

  type Variant = 'default' | 'secondary' | 'destructive' | 'outline' | 'warning';

  interface Props {
    variant?: Variant;
    class?: string;
    children?: import('svelte').Snippet;
  }

  let {
    variant = 'default',
    class: className = '',
    children
  }: Props = $props();

  const variants: Record<Variant, string> = {
    default: 'bg-blue-100 text-blue-800 border-blue-200',
    secondary: 'bg-gray-100 text-gray-800 border-gray-200',
    destructive: 'bg-red-100 text-red-800 border-red-200',
    outline: 'bg-transparent text-gray-700 border-gray-300',
    warning: 'bg-orange-100 text-orange-800 border-orange-200'
  };
</script>

<span
  class={cn(
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
    'transition-colors',
    variants[variant],
    className
  )}
>
  {#if children}
    {@render children()}
  {/if}
</span>
