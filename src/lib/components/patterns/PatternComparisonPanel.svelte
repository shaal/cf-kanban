<script lang="ts">
  /**
   * TASK-075: Pattern Comparison Panel
   *
   * Side-by-side comparison of multiple selected patterns with:
   * - Visual diff of pattern properties
   * - Success rate comparison bar chart
   * - Property comparison table
   */
  import type { Pattern, PatternDomain } from '$lib/types/patterns';
  import { DOMAIN_CONFIGS } from '$lib/types/patterns';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { X, ArrowRight, BarChart2, GitCompare } from 'lucide-svelte';

  interface Props {
    patterns: Pattern[];
    onClose: () => void;
  }

  let { patterns, onClose }: Props = $props();

  // Get all properties to compare
  const comparisonProperties = [
    { key: 'domain', label: 'Domain' },
    { key: 'namespace', label: 'Namespace' },
    { key: 'successRate', label: 'Success Rate' },
    { key: 'usageCount', label: 'Usage Count' },
    { key: 'createdAt', label: 'Created' },
    { key: 'updatedAt', label: 'Updated' }
  ] as const;

  // Check if values are different across patterns
  function areValuesDifferent(key: string): boolean {
    if (patterns.length < 2) return false;

    const values = patterns.map(p => {
      const value = p[key as keyof Pattern];
      if (value instanceof Date) return value.getTime();
      return value;
    });

    return !values.every(v => v === values[0]);
  }

  // Format value for display
  function formatValue(pattern: Pattern, key: string): string {
    const value = pattern[key as keyof Pattern];

    if (key === 'successRate') {
      return `${(value as number).toFixed(1)}%`;
    }
    if (key === 'domain') {
      return DOMAIN_CONFIGS[value as PatternDomain]?.label || String(value);
    }
    if (value instanceof Date) {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric'
      }).format(value);
    }
    return String(value ?? '-');
  }

  // Get max success rate for scaling bar chart
  function getMaxSuccessRate(): number {
    return Math.max(...patterns.map(p => p.successRate), 100);
  }

  // Get bar width percentage
  function getBarWidth(rate: number): number {
    return (rate / getMaxSuccessRate()) * 100;
  }

  // Get success rate color
  function getSuccessRateColor(rate: number): string {
    if (rate >= 80) return '#22c55e';
    if (rate >= 60) return '#eab308';
    return '#ef4444';
  }

  // Calculate overall similarity score
  function calculateSimilarityScore(): number {
    if (patterns.length < 2) return 100;

    let matches = 0;
    let total = 0;

    comparisonProperties.forEach(({ key }) => {
      total++;
      if (!areValuesDifferent(key)) {
        matches++;
      }
    });

    // Check domain match
    const sameDomain = patterns.every(p => p.domain === patterns[0].domain);
    if (sameDomain) matches++;
    total++;

    return Math.round((matches / total) * 100);
  }

  const similarityScore = $derived(calculateSimilarityScore());
</script>

<div class="pattern-comparison-panel h-full flex flex-col">
  <!-- Header -->
  <div class="flex items-center justify-between p-4 border-b border-gray-200">
    <div class="flex items-center gap-2">
      <GitCompare class="w-5 h-5 text-indigo-600" />
      <h3 class="text-lg font-semibold text-gray-900">
        Compare Patterns ({patterns.length})
      </h3>
    </div>
    <button
      class="p-1 text-gray-400 hover:text-gray-600 rounded"
      onclick={onClose}
      aria-label="Close comparison"
    >
      <X class="w-5 h-5" />
    </button>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-4 space-y-4">
    <!-- Pattern Names -->
    <div class="grid gap-2" style="grid-template-columns: repeat({patterns.length}, 1fr)">
      {#each patterns as pattern}
        <div class="p-3 bg-gray-50 rounded-lg">
          <span
            class="inline-block px-2 py-0.5 text-xs font-medium rounded-full text-white mb-1"
            style="background-color: {DOMAIN_CONFIGS[pattern.domain]?.color || '#6b7280'}"
          >
            {DOMAIN_CONFIGS[pattern.domain]?.label || pattern.domain}
          </span>
          <h4 class="font-semibold text-gray-900 text-sm">{pattern.name}</h4>
        </div>
      {/each}
    </div>

    <!-- Similarity Score -->
    <Card class="p-4">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-gray-700">Similarity Score</span>
        <span
          class="text-2xl font-bold"
          class:text-green-600={similarityScore >= 70}
          class:text-yellow-600={similarityScore >= 40 && similarityScore < 70}
          class:text-red-600={similarityScore < 40}
        >
          {similarityScore}%
        </span>
      </div>
      <div class="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-300"
          class:bg-green-500={similarityScore >= 70}
          class:bg-yellow-500={similarityScore >= 40 && similarityScore < 70}
          class:bg-red-500={similarityScore < 40}
          style="width: {similarityScore}%"
        ></div>
      </div>
    </Card>

    <!-- Success Rate Comparison Bar Chart -->
    <Card class="p-4">
      <h5 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <BarChart2 class="w-4 h-4" />
        Success Rate Comparison
      </h5>
      <div class="space-y-3">
        {#each patterns as pattern}
          <div class="flex items-center gap-3">
            <span class="text-xs text-gray-600 w-24 truncate" title={pattern.name}>
              {pattern.name}
            </span>
            <div class="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full flex items-center justify-end pr-2"
                style="width: {getBarWidth(pattern.successRate)}%; background-color: {getSuccessRateColor(pattern.successRate)}"
              >
                <span class="text-xs font-medium text-white">
                  {pattern.successRate.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </Card>

    <!-- Property Comparison Table -->
    <Card class="p-4">
      <h5 class="text-sm font-semibold text-gray-700 mb-3">Property Comparison</h5>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200">
              <th class="text-left py-2 pr-4 font-medium text-gray-600">Property</th>
              {#each patterns as pattern, i}
                <th class="text-left py-2 px-2 font-medium text-gray-600">
                  Pattern {i + 1}
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each comparisonProperties as { key, label }}
              {@const isDifferent = areValuesDifferent(key)}
              <tr class="border-b border-gray-100" class:bg-yellow-50={isDifferent}>
                <td class="py-2 pr-4 text-gray-700 font-medium">{label}</td>
                {#each patterns as pattern}
                  <td class="py-2 px-2" class:text-yellow-700={isDifferent}>
                    {formatValue(pattern, key)}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="text-xs text-gray-500 mt-2">
        Rows highlighted in yellow indicate differences between patterns.
      </p>
    </Card>

    <!-- Pattern Values Side by Side -->
    <div>
      <h5 class="text-sm font-semibold text-gray-700 mb-3">Pattern Values</h5>
      <div class="grid gap-3" style="grid-template-columns: repeat({patterns.length}, 1fr)">
        {#each patterns as pattern}
          <div class="p-3 bg-gray-50 rounded-lg">
            <p class="text-xs text-gray-600 whitespace-pre-wrap">{pattern.value}</p>
          </div>
        {/each}
      </div>
    </div>

    <!-- Usage Comparison -->
    <Card class="p-4">
      <h5 class="text-sm font-semibold text-gray-700 mb-3">Usage Statistics</h5>
      <div class="grid gap-4" style="grid-template-columns: repeat({patterns.length}, 1fr)">
        {#each patterns as pattern}
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-900">{pattern.usageCount}</div>
            <div class="text-xs text-gray-500">uses</div>
          </div>
        {/each}
      </div>
    </Card>
  </div>

  <!-- Actions -->
  <div class="border-t border-gray-200 p-4">
    <Button variant="outline" class="w-full" onclick={onClose}>
      Close Comparison
    </Button>
  </div>
</div>
