<script lang="ts">
  /**
   * TASK-118: Helpful Tooltips Component
   *
   * A simple tooltip component for providing contextual help
   * throughout the application.
   */

  interface Props {
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
    maxWidth?: string;
    children: import('svelte').Snippet;
  }

  let {
    content,
    position = 'top',
    delay = 300,
    maxWidth = '200px',
    children
  }: Props = $props();

  let showTooltip = $state(false);
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  function handleMouseEnter() {
    timeoutId = setTimeout(() => {
      showTooltip = true;
    }, delay);
  }

  function handleMouseLeave() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    showTooltip = false;
  }

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-800',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-800',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-800',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-800',
  };
</script>

<div
  class="relative inline-block"
  role="tooltip"
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  onfocus={handleMouseEnter}
  onblur={handleMouseLeave}
>
  {@render children()}

  {#if showTooltip && content}
    <div
      class="absolute z-50 px-3 py-2 text-sm text-white bg-gray-800 rounded-lg shadow-lg whitespace-normal {positionClasses[position]}"
      style="max-width: {maxWidth};"
      role="tooltip"
    >
      {content}
      <div
        class="absolute w-0 h-0 border-4 {arrowClasses[position]}"
      ></div>
    </div>
  {/if}
</div>

<style>
  /* Animation for tooltip appearance */
  div[role="tooltip"] {
    animation: fadeIn 0.15s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
</style>
