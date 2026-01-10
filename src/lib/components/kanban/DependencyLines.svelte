<script lang="ts">
  /**
   * DependencyLines Component
   *
   * GAP-3.2.4: Ticket Dependency Detection
   *
   * Draws SVG lines/arrows between tickets that have dependencies.
   * Lines are drawn from dependency tickets to dependent tickets.
   */
  import { untrack } from 'svelte';
  import type { Ticket } from '$lib/types';

  interface Props {
    /** All tickets to analyze for dependencies */
    tickets?: Ticket[];
    /** Whether to show the lines */
    visible?: boolean;
    /** CSS class for the container */
    class?: string;
  }

  let {
    tickets = [],
    visible = true,
    class: className = ''
  }: Props = $props();

  interface DependencyLine {
    fromId: string;
    toId: string;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    isComplete: boolean;
  }

  let lines = $state<DependencyLine[]>([]);
  let containerRef: HTMLDivElement | null = null;
  let svgRef: SVGSVGElement | null = null;
  let resizeObserver: ResizeObserver | null = null;

  /**
   * Calculate lines between dependent tickets
   */
  function calculateLines() {
    if (!containerRef || !visible) {
      lines = [];
      return;
    }

    const newLines: DependencyLine[] = [];

    for (const ticket of tickets) {
      if (!ticket.dependencyIds || ticket.dependencyIds.length === 0) {
        continue;
      }

      const toElement = document.querySelector(`[data-ticket-id="${ticket.id}"]`);
      if (!toElement) continue;

      const toRect = toElement.getBoundingClientRect();
      const containerRect = containerRef.getBoundingClientRect();

      for (const depId of ticket.dependencyIds) {
        const fromElement = document.querySelector(`[data-ticket-id="${depId}"]`);
        if (!fromElement) continue;

        const fromRect = fromElement.getBoundingClientRect();

        // Find the dependency ticket to check if it's complete
        const depTicket = tickets.find(t => t.id === depId);
        const isComplete = depTicket?.status === 'DONE';

        // Calculate positions relative to container
        // Draw from the right side of the dependency to the left side of the dependent
        newLines.push({
          fromId: depId,
          toId: ticket.id,
          fromX: fromRect.right - containerRect.left,
          fromY: fromRect.top + fromRect.height / 2 - containerRect.top,
          toX: toRect.left - containerRect.left,
          toY: toRect.top + toRect.height / 2 - containerRect.top,
          isComplete
        });
      }
    }

    lines = newLines;
  }

  /**
   * Generate SVG path for a curved arrow
   */
  function generatePath(line: DependencyLine): string {
    const { fromX, fromY, toX, toY } = line;
    const midX = (fromX + toX) / 2;

    // Use a bezier curve for a nice arc
    // If the target is to the left, curve up; if to the right, curve normally
    if (toX > fromX) {
      // Normal left-to-right flow
      return `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX - 8} ${toY}`;
    } else {
      // Right-to-left (or same column) - curve over the top
      const curveHeight = Math.min(50, Math.abs(toX - fromX) / 2 + 30);
      const topY = Math.min(fromY, toY) - curveHeight;
      return `M ${fromX} ${fromY} C ${fromX + 30} ${fromY}, ${fromX + 30} ${topY}, ${midX} ${topY} C ${toX - 30} ${topY}, ${toX - 30} ${toY}, ${toX - 8} ${toY}`;
    }
  }

  // Svelte 5 runes mode: use $effect for lifecycle
  $effect(() => {
    // Initial calculation after DOM is ready
    const timeout = setTimeout(calculateLines, 100);

    // Set up resize observer to recalculate on layout changes
    resizeObserver = new ResizeObserver(() => {
      untrack(() => calculateLines());
    });

    if (containerRef) {
      resizeObserver.observe(containerRef);
    }

    // Also recalculate on scroll
    const handleScroll = () => untrack(() => calculateLines());
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('scroll', handleScroll, true);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  });

  // Recalculate when tickets or visibility changes
  $effect(() => {
    // Read the dependencies
    void tickets;
    void visible;
    // Recalculate after a brief delay
    const timeout = setTimeout(() => untrack(() => calculateLines()), 50);
    return () => clearTimeout(timeout);
  });
</script>

{#if visible && lines.length > 0}
  <svg
    class="absolute inset-0 pointer-events-none z-10 overflow-visible {className}"
    bind:this={svgRef}
  >
    <defs>
      <!-- Arrow marker for incomplete dependencies -->
      <marker
        id="arrow-incomplete"
        markerWidth="8"
        markerHeight="8"
        refX="6"
        refY="4"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M 0 0 L 8 4 L 0 8 z" fill="#f59e0b" />
      </marker>

      <!-- Arrow marker for complete dependencies -->
      <marker
        id="arrow-complete"
        markerWidth="8"
        markerHeight="8"
        refX="6"
        refY="4"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M 0 0 L 8 4 L 0 8 z" fill="#22c55e" />
      </marker>
    </defs>

    {#each lines as line (line.fromId + '-' + line.toId)}
      <path
        d={generatePath(line)}
        fill="none"
        stroke={line.isComplete ? '#22c55e' : '#f59e0b'}
        stroke-width="2"
        stroke-dasharray={line.isComplete ? 'none' : '5,5'}
        marker-end={line.isComplete ? 'url(#arrow-complete)' : 'url(#arrow-incomplete)'}
        opacity="0.7"
      />
    {/each}
  </svg>
{/if}

<!-- Hidden container element to get bounding rect -->
<div
  bind:this={containerRef}
  class="absolute inset-0 pointer-events-none"
  style="z-index: -1;"
></div>
