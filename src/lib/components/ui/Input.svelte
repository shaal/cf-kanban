<script lang="ts">
  /**
   * Input Component
   *
   * TASK-011: Create Base UI Components
   *
   * A styled input component with consistent styling.
   */
  import { cn } from '$lib/utils';

  interface Props {
    type?: 'text' | 'email' | 'password' | 'search' | 'number' | 'tel' | 'url';
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    readonly?: boolean;
    id?: string;
    name?: string;
    class?: string;
    oninput?: (event: Event) => void;
    onchange?: (event: Event) => void;
  }

  let {
    type = 'text',
    value = $bindable(''),
    placeholder = '',
    disabled = false,
    required = false,
    readonly = false,
    id,
    name,
    class: className = '',
    oninput,
    onchange
  }: Props = $props();
</script>

<input
  class={cn(
    'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm',
    'placeholder:text-gray-400',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100',
    className
  )}
  {type}
  bind:value
  {placeholder}
  {disabled}
  {required}
  {readonly}
  {id}
  {name}
  {oninput}
  {onchange}
/>
