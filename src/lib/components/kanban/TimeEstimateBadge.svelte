<script lang="ts">
  /**
   * GAP-3.2.3: Time Estimate Badge Component
   *
   * Displays estimated completion time for tickets with:
   * - Formatted duration (e.g., "2.5h", "1.2d")
   * - Confidence indicator via tooltip
   * - Visual styling based on estimate basis
   */
  import { onMount } from 'svelte';
  import { Clock, History, TrendingUp, Check } from 'lucide-svelte';
  import { cn } from '$lib/utils';
  import {
    getTimeEstimate,
    getTicketTimeEstimate,
    getConfidenceLabel,
    type TimeEstimate
  } from '$lib/stores/time-estimates';

  interface Props {
    ticketId: string;
    /** Compact mode for small displays */
    compact?: boolean;
    /** Show confidence indicator */
    showConfidence?: boolean;
    class?: string;
  }

  let {
    ticketId,
    compact = false,
    showConfidence = false,
    class: className = ''
  }: Props = $props();

  // Subscribe to estimate store for this ticket
  const estimateStore = getTicketTimeEstimate(ticketId);
  const { estimate, loading, error } = $derived($estimateStore);

  // Fetch estimate on mount
  onMount(() => {
    getTimeEstimate(ticketId);
  });

  /**
   * Get icon based on estimate basis
   */
  function getEstimateIcon(basedOn: TimeEstimate['basedOn'] | 'actual') {
    switch (basedOn) {
      case 'actual':
        return Check;
      case 'historical':
        return History;
      case 'hybrid':
        return TrendingUp;
      default:
        return Clock;
    }
  }

  /**
   * Get background color based on estimate basis
   */
  function getBasisColor(basedOn: TimeEstimate['basedOn'] | 'actual'): string {
    switch (basedOn) {
      case 'actual':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'historical':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'hybrid':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  }

  /**
   * Build tooltip text
   */
  function getTooltip(est: TimeEstimate & { isActual?: boolean }): string {
    if (est.isActual) {
      return `Actual time: ${est.formatted}`;
    }

    const parts = [
      `Estimate: ${est.formatted}`,
      `Range: ${est.formattedRange}`,
      `Confidence: ${getConfidenceLabel(est.confidence)} (${Math.round(est.confidence * 100)}%)`
    ];

    if (est.basedOn === 'historical') {
      parts.push('Based on similar completed tickets');
    } else if (est.basedOn === 'hybrid') {
      parts.push('Based on complexity + historical data');
    } else {
      parts.push('Based on complexity analysis');
    }

    return parts.join('\n');
  }
</script>

{#if loading}
  <!-- Loading state -->
  <span
    class={cn(
      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs',
      'bg-gray-100 text-gray-400 border border-gray-200',
      'animate-pulse',
      className
    )}
  >
    <Clock class="w-3 h-3" />
    {#if !compact}
      <span>...</span>
    {/if}
  </span>
{:else if estimate && !error}
  {@const Icon = getEstimateIcon(estimate.basedOn)}
  {@const isActual = 'isActual' in estimate && estimate.isActual}
  <span
    class={cn(
      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border',
      getBasisColor(isActual ? 'actual' : estimate.basedOn),
      className
    )}
    title={getTooltip(estimate)}
  >
    <Icon class="w-3 h-3" />
    <span>{estimate.formatted}</span>
    {#if showConfidence && !isActual && !compact}
      <span class="opacity-60 text-[10px]">
        ({Math.round(estimate.confidence * 100)}%)
      </span>
    {/if}
  </span>
{:else if error}
  <!-- Error state - show nothing or minimal indicator -->
  <span
    class={cn(
      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs',
      'bg-gray-50 text-gray-400 border border-gray-100',
      className
    )}
    title="Estimate unavailable"
  >
    <Clock class="w-3 h-3 opacity-50" />
  </span>
{/if}
