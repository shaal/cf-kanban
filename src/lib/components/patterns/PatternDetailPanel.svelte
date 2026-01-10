<script lang="ts">
  /**
   * TASK-074: Pattern Detail Panel
   * GAP-3.4.4: Added transfer action for cross-project pattern transfer
   *
   * Displays detailed information about a selected pattern including:
   * - Pattern metadata (name, namespace, dates)
   * - Success rate history as sparkline
   * - Related patterns based on HNSW similarity
   * - Action buttons including transfer to project
   */
  import type { Pattern } from '$lib/types/patterns';
  import { DOMAIN_CONFIGS } from '$lib/types/patterns';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import PatternTransferModal from './PatternTransferModal.svelte';
  import {
    X, Calendar, Hash, TrendingUp, Clock, Tag, Link2,
    Copy, ExternalLink, Ticket, ArrowRightLeft
  } from 'lucide-svelte';

  interface Props {
    pattern: Pattern;
    relatedPatterns?: Pattern[];
    onClose: () => void;
    onPatternSelect: (pattern: Pattern) => void;
  }

  let { pattern, relatedPatterns = [], onClose, onPatternSelect }: Props = $props();

  // GAP-3.4.4: Transfer modal state
  let showTransferModal = $state(false);

  function openTransferModal() {
    showTransferModal = true;
  }

  function closeTransferModal() {
    showTransferModal = false;
  }

  function handleTransferComplete(result: { success: boolean; transferId: string; targetPatternId?: string }) {
    if (result.success) {
      // Could show a toast notification here
      console.log('Transfer completed:', result.transferId);
    }
    closeTransferModal();
  }

  // Format date for display
  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  // Format relative time
  function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }

  // Generate sparkline path from success history
  function getSparklinePath(history: { timestamp: Date; rate: number }[] | undefined): string {
    if (!history || history.length === 0) return '';

    const width = 200;
    const height = 40;
    const padding = 4;

    const points = history.map((point, i) => {
      const x = padding + (i / (history.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((point.rate - 50) / 50) * (height - 2 * padding);
      return `${x},${y}`;
    });

    return `M${points.join(' L')}`;
  }

  // Get success rate color
  function getSuccessRateColor(rate: number): string {
    if (rate >= 80) return '#22c55e'; // green
    if (rate >= 60) return '#eab308'; // yellow
    return '#ef4444'; // red
  }

  // Copy pattern value to clipboard
  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(pattern.value);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  // Apply pattern to a ticket (placeholder action)
  function applyToTicket() {
    // This would open a modal or navigate to ticket creation
    alert(`Apply pattern "${pattern.name}" to a new ticket`);
  }
</script>

<div class="pattern-detail-panel h-full flex flex-col">
  <!-- Header -->
  <div class="flex items-center justify-between p-4 border-b border-gray-200">
    <h3 class="text-lg font-semibold text-gray-900">Pattern Details</h3>
    <button
      class="p-1 text-gray-400 hover:text-gray-600 rounded"
      onclick={onClose}
      aria-label="Close panel"
    >
      <X class="w-5 h-5" />
    </button>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-4 space-y-4">
    <!-- Pattern Name and Domain -->
    <div>
      <div class="flex items-center gap-2 mb-2">
        <span
          class="px-2 py-0.5 text-xs font-medium rounded-full text-white"
          style="background-color: {DOMAIN_CONFIGS[pattern.domain]?.color || '#6b7280'}"
        >
          {DOMAIN_CONFIGS[pattern.domain]?.label || pattern.domain}
        </span>
      </div>
      <h4 class="text-xl font-bold text-gray-900">{pattern.name}</h4>
      <p class="text-sm text-gray-500 mt-1">{pattern.namespace}/{pattern.key}</p>
    </div>

    <!-- Pattern Value -->
    <div class="relative">
      <div class="bg-gray-50 rounded-lg p-3 pr-10">
        <p class="text-sm text-gray-700 whitespace-pre-wrap">{pattern.value}</p>
      </div>
      <button
        class="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
        onclick={copyToClipboard}
        title="Copy to clipboard"
      >
        <Copy class="w-4 h-4" />
      </button>
    </div>

    <!-- Success Rate -->
    <Card class="p-4">
      <div class="flex items-center justify-between mb-2">
        <h5 class="text-sm font-semibold text-gray-700">Success Rate</h5>
        <span
          class="text-2xl font-bold"
          style="color: {getSuccessRateColor(pattern.successRate)}"
        >
          {pattern.successRate.toFixed(1)}%
        </span>
      </div>

      <!-- Sparkline -->
      {#if pattern.successHistory && pattern.successHistory.length > 0}
        <div class="mt-2">
          <svg width="100%" height="50" viewBox="0 0 200 50" preserveAspectRatio="none">
            <!-- Background grid -->
            <line x1="0" y1="25" x2="200" y2="25" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="4 4" />

            <!-- Sparkline -->
            <path
              d={getSparklinePath(pattern.successHistory)}
              fill="none"
              stroke={getSuccessRateColor(pattern.successRate)}
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <div class="flex justify-between text-xs text-gray-400 mt-1">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </div>
      {/if}
    </Card>

    <!-- Metadata -->
    <div class="space-y-3">
      <div class="flex items-center gap-3 text-sm">
        <Hash class="w-4 h-4 text-gray-400" />
        <span class="text-gray-600">Usage Count:</span>
        <span class="font-medium text-gray-900">{pattern.usageCount}</span>
      </div>

      <div class="flex items-center gap-3 text-sm">
        <Calendar class="w-4 h-4 text-gray-400" />
        <span class="text-gray-600">Created:</span>
        <span class="font-medium text-gray-900">
          {formatDate(pattern.createdAt)}
          <span class="text-gray-400 font-normal">({formatRelativeTime(pattern.createdAt)})</span>
        </span>
      </div>

      <div class="flex items-center gap-3 text-sm">
        <Clock class="w-4 h-4 text-gray-400" />
        <span class="text-gray-600">Updated:</span>
        <span class="font-medium text-gray-900">
          {formatDate(pattern.updatedAt)}
          <span class="text-gray-400 font-normal">({formatRelativeTime(pattern.updatedAt)})</span>
        </span>
      </div>

      {#if pattern.tags && pattern.tags.length > 0}
        <div class="flex items-start gap-3 text-sm">
          <Tag class="w-4 h-4 text-gray-400 mt-0.5" />
          <span class="text-gray-600">Tags:</span>
          <div class="flex flex-wrap gap-1">
            {#each pattern.tags as tag}
              <span class="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                {tag}
              </span>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Related Patterns -->
    {#if relatedPatterns.length > 0}
      <div>
        <h5 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Link2 class="w-4 h-4" />
          Related Patterns
        </h5>
        <div class="space-y-2">
          {#each relatedPatterns as related}
            <button
              class="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              onclick={() => onPatternSelect(related)}
            >
              <div class="flex items-center justify-between">
                <span class="font-medium text-gray-900 text-sm">{related.name}</span>
                <span class="text-xs text-gray-500">{related.successRate.toFixed(0)}%</span>
              </div>
              <p class="text-xs text-gray-500 mt-1 line-clamp-1">{related.value}</p>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- Actions -->
  <div class="border-t border-gray-200 p-4 space-y-2">
    <Button class="w-full" onclick={applyToTicket}>
      <Ticket class="w-4 h-4 mr-2" />
      Apply to Ticket
    </Button>
    <!-- GAP-3.4.4: Transfer to Project action -->
    <Button variant="outline" class="w-full" onclick={openTransferModal}>
      <ArrowRightLeft class="w-4 h-4 mr-2" />
      Transfer to Project
    </Button>
    <Button variant="outline" class="w-full" onclick={copyToClipboard}>
      <Copy class="w-4 h-4 mr-2" />
      Copy Pattern
    </Button>
  </div>
</div>

<!-- GAP-3.4.4: Transfer Modal -->
{#if showTransferModal}
  <PatternTransferModal
    {pattern}
    onClose={closeTransferModal}
    onTransferComplete={handleTransferComplete}
  />
{/if}

<style>
  .line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
