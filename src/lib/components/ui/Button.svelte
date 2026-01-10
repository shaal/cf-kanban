<script lang="ts">
  /**
   * Button Component
   *
   * TASK-011: Create Base UI Components
   *
   * A versatile button component with multiple variants and sizes.
   */
  import { cn } from '$lib/utils';

  type Variant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  type Size = 'default' | 'sm' | 'lg' | 'icon';

  interface Props {
    variant?: Variant;
    size?: Size;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    class?: string;
    onclick?: (event: MouseEvent) => void;
    children?: import('svelte').Snippet;
  }

  let {
    variant = 'default',
    size = 'default',
    disabled = false,
    type = 'button',
    class: className = '',
    onclick,
    children
  }: Props = $props();

  const variants: Record<Variant, string> = {
    default: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
    ghost: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-500',
    link: 'text-blue-600 underline-offset-4 hover:underline focus:ring-blue-500'
  };

  const sizes: Record<Size, string> = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3 text-sm',
    lg: 'h-11 rounded-md px-8',
    icon: 'h-10 w-10'
  };
</script>

<button
  class={cn(
    'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className
  )}
  {type}
  {disabled}
  {onclick}
>
  {#if children}
    {@render children()}
  {/if}
</button>
