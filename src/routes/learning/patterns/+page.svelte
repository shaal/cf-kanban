<script lang="ts">
  /**
   * TASK-071: Pattern Explorer Page
   *
   * Main page for exploring and visualizing Claude Flow patterns.
   * Displays patterns in a ForceGraph visualization with interactive features.
   */
  import type { PageData } from './$types';
  import ForceGraph from '$lib/components/viz/ForceGraph.svelte';
  import type { GraphNode, GraphData } from '$lib/components/viz/ForceGraph.svelte';
  import type { Pattern, PatternFilters, PatternDomain, PatternNode, PatternLink } from '$lib/types/patterns';
  import { DEFAULT_PATTERN_FILTERS, DOMAIN_CONFIGS } from '$lib/types/patterns';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import PatternDetailPanel from '$lib/components/patterns/PatternDetailPanel.svelte';
  import PatternFiltersPanel from '$lib/components/patterns/PatternFiltersPanel.svelte';
  import PatternComparisonPanel from '$lib/components/patterns/PatternComparisonPanel.svelte';
  import { Brain, Network, Filter, ChevronLeft, ChevronRight } from 'lucide-svelte';

  export let data: PageData;

  // State
  let selectedPattern: Pattern | null = $state(null);
  let hoveredPattern: Pattern | null = $state(null);
  let selectedPatterns: Pattern[] = $state([]);
  let showComparison = $state(false);
  let showFilters = $state(true);
  let showSidebar = $state(true);
  let filters: PatternFilters = $state({ ...DEFAULT_PATTERN_FILTERS });
  let highlightedNodeIds: string[] = $state([]);

  // Filter patterns based on current filters
  let filteredPatterns = $derived.by(() => {
    return data.patterns.filter(pattern => {
      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesSearch =
          pattern.name.toLowerCase().includes(query) ||
          pattern.value.toLowerCase().includes(query) ||
          pattern.key.toLowerCase().includes(query) ||
          pattern.tags?.some(tag => tag.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Success rate filter
      if (pattern.successRate < filters.minSuccessRate ||
          pattern.successRate > filters.maxSuccessRate) {
        return false;
      }

      // Usage count filter
      if (pattern.usageCount < filters.minUsageCount ||
          pattern.usageCount > filters.maxUsageCount) {
        return false;
      }

      // Date range filter
      if (filters.startDate && pattern.createdAt < filters.startDate) {
        return false;
      }
      if (filters.endDate && pattern.createdAt > filters.endDate) {
        return false;
      }

      // Domain filter
      if (filters.domains.length > 0 && !filters.domains.includes(pattern.domain)) {
        return false;
      }

      return true;
    });
  });

  // Convert patterns to graph data
  let graphData: GraphData = $derived.by(() => {
    const domainColors: Record<PatternDomain, string> = {
      auth: '#4f46e5',
      api: '#0891b2',
      testing: '#059669',
      database: '#d97706',
      ui: '#dc2626',
      performance: '#7c3aed',
      security: '#be185d',
      devops: '#2563eb',
      architecture: '#16a34a',
      general: '#6b7280'
    };

    const nodes: GraphNode[] = filteredPatterns.map(pattern => ({
      id: pattern.id,
      label: pattern.name,
      group: pattern.domain,
      color: domainColors[pattern.domain] || domainColors.general,
      radius: 15 + Math.min(pattern.usageCount / 5, 15),
      data: pattern
    }));

    // Create links
    const links: { source: string; target: string; value: number; label?: string }[] = [];
    const addedLinks = new Set<string>();

    filteredPatterns.forEach(pattern => {
      // Add links from relatedPatternIds
      pattern.relatedPatternIds?.forEach(relatedId => {
        const linkKey = [pattern.id, relatedId].sort().join('-');
        if (!addedLinks.has(linkKey) && filteredPatterns.some(p => p.id === relatedId)) {
          addedLinks.add(linkKey);
          links.push({
            source: pattern.id,
            target: relatedId,
            value: 2,
            label: 'related'
          });
        }
      });

      // Add domain links
      filteredPatterns
        .filter(p => p.domain === pattern.domain && p.id !== pattern.id)
        .slice(0, 2)
        .forEach(related => {
          const linkKey = [pattern.id, related.id].sort().join('-');
          if (!addedLinks.has(linkKey)) {
            addedLinks.add(linkKey);
            links.push({
              source: pattern.id,
              target: related.id,
              value: 1,
              label: 'same-domain'
            });
          }
        });
    });

    return { nodes, links };
  });

  function handleNodeClick(node: GraphNode) {
    const pattern = node.data as Pattern;

    // Multi-select with shift key
    if (window.event && (window.event as KeyboardEvent).shiftKey) {
      togglePatternSelection(pattern);
    } else {
      selectedPattern = pattern;
      selectedPatterns = [];
      showComparison = false;
    }
  }

  function handleNodeHover(node: GraphNode | null) {
    hoveredPattern = node ? (node.data as Pattern) : null;
  }

  function togglePatternSelection(pattern: Pattern) {
    const index = selectedPatterns.findIndex(p => p.id === pattern.id);
    if (index >= 0) {
      selectedPatterns = selectedPatterns.filter(p => p.id !== pattern.id);
    } else {
      selectedPatterns = [...selectedPatterns, pattern];
    }

    if (selectedPatterns.length >= 2) {
      showComparison = true;
    }
  }

  function clearSelection() {
    selectedPatterns = [];
    showComparison = false;
  }

  function handleFilterChange(newFilters: PatternFilters) {
    filters = newFilters;

    // Update highlighted nodes based on search
    if (filters.searchQuery) {
      highlightedNodeIds = filteredPatterns.map(p => p.id);
    } else {
      highlightedNodeIds = [];
    }
  }

  function toggleSidebar() {
    showSidebar = !showSidebar;
  }
</script>

<svelte:head>
  <title>Pattern Explorer | CF Kanban</title>
  <meta name="description" content="Explore and visualize Claude Flow learning patterns" />
</svelte:head>

<div class="pattern-explorer flex h-screen bg-gray-50 overflow-hidden">
  <!-- Main Content -->
  <div class="flex-1 flex flex-col overflow-hidden">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-indigo-100 rounded-lg">
            <Brain class="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 class="text-xl font-bold text-gray-900">Pattern Explorer</h1>
            <p class="text-sm text-gray-500">
              {filteredPatterns.length} of {data.totalPatterns} patterns |
              Avg success rate: {data.averageSuccessRate.toFixed(1)}%
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onclick={() => showFilters = !showFilters}
          >
            <Filter class="w-4 h-4 mr-1" />
            Filters
          </Button>

          {#if selectedPatterns.length >= 2}
            <Button
              variant="secondary"
              size="sm"
              onclick={() => showComparison = !showComparison}
            >
              Compare ({selectedPatterns.length})
            </Button>
          {/if}

          {#if selectedPatterns.length > 0}
            <Button variant="ghost" size="sm" onclick={clearSelection}>
              Clear
            </Button>
          {/if}
        </div>
      </div>
    </header>

    <!-- Filters Panel -->
    {#if showFilters}
      <div class="bg-white border-b border-gray-200 px-6 py-3">
        <PatternFiltersPanel
          {filters}
          domains={data.domains}
          onFilterChange={handleFilterChange}
        />
      </div>
    {/if}

    <!-- Graph Visualization -->
    <div class="flex-1 relative overflow-hidden">
      <ForceGraph
        data={graphData}
        width={window?.innerWidth ? window.innerWidth - (showSidebar ? 400 : 0) : 800}
        height={window?.innerHeight ? window.innerHeight - 200 : 600}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        selectedNodeId={selectedPattern?.id ?? null}
        {highlightedNodeIds}
        class="w-full h-full"
      />

      <!-- Domain Legend -->
      <div class="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3">
        <h4 class="text-xs font-semibold text-gray-600 mb-2">Domains</h4>
        <div class="grid grid-cols-2 gap-x-4 gap-y-1">
          {#each data.domains.slice(0, 10) as { domain, count, color }}
            <div class="flex items-center gap-2 text-xs">
              <span class="w-3 h-3 rounded-full" style="background-color: {color}"></span>
              <span class="text-gray-700">{DOMAIN_CONFIGS[domain]?.label || domain}</span>
              <span class="text-gray-400">({count})</span>
            </div>
          {/each}
        </div>
      </div>

      <!-- Hover Tooltip -->
      {#if hoveredPattern && !selectedPattern}
        <div class="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
          <h4 class="font-semibold text-gray-900">{hoveredPattern.name}</h4>
          <p class="text-sm text-gray-500 mt-1 line-clamp-2">{hoveredPattern.value}</p>
          <div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span>Success: {hoveredPattern.successRate.toFixed(1)}%</span>
            <span>Uses: {hoveredPattern.usageCount}</span>
          </div>
        </div>
      {/if}

      <!-- Sidebar Toggle -->
      <button
        class="absolute right-0 top-1/2 -translate-y-1/2 bg-white border border-gray-200 rounded-l-lg p-2 shadow-md hover:bg-gray-50"
        onclick={toggleSidebar}
        aria-label={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
      >
        {#if showSidebar}
          <ChevronRight class="w-5 h-5 text-gray-500" />
        {:else}
          <ChevronLeft class="w-5 h-5 text-gray-500" />
        {/if}
      </button>
    </div>
  </div>

  <!-- Sidebar -->
  {#if showSidebar}
    <aside class="w-96 bg-white border-l border-gray-200 overflow-y-auto">
      {#if showComparison && selectedPatterns.length >= 2}
        <PatternComparisonPanel
          patterns={selectedPatterns}
          onClose={() => showComparison = false}
        />
      {:else if selectedPattern}
        <PatternDetailPanel
          pattern={selectedPattern}
          relatedPatterns={filteredPatterns.filter(p =>
            selectedPattern?.relatedPatternIds?.includes(p.id)
          )}
          onClose={() => selectedPattern = null}
          onPatternSelect={(p) => selectedPattern = p}
        />
      {:else}
        <!-- Top Patterns -->
        <div class="p-4">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Top Patterns</h3>
          <div class="space-y-2">
            {#each data.topPatterns as pattern}
              <button
                class="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                onclick={() => selectedPattern = pattern}
              >
                <div class="flex items-center justify-between">
                  <span class="font-medium text-gray-900 text-sm">{pattern.name}</span>
                  <span class="text-xs text-green-600">{pattern.successRate.toFixed(1)}%</span>
                </div>
                <p class="text-xs text-gray-500 mt-1 line-clamp-1">{pattern.value}</p>
              </button>
            {/each}
          </div>
        </div>

        <!-- Instructions -->
        <div class="p-4 border-t border-gray-200">
          <h3 class="text-sm font-semibold text-gray-700 mb-2">Instructions</h3>
          <ul class="text-xs text-gray-500 space-y-1">
            <li>Click a node to view pattern details</li>
            <li>Shift+click to multi-select for comparison</li>
            <li>Scroll to zoom in/out</li>
            <li>Drag nodes to rearrange</li>
            <li>Use filters to find specific patterns</li>
          </ul>
        </div>
      {/if}
    </aside>
  {/if}
</div>

<style>
  .pattern-explorer {
    --sidebar-width: 24rem;
  }

  .line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
