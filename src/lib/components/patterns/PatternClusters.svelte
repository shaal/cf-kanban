<script lang="ts">
  /**
   * TASK-072: Pattern Clustering Component
   *
   * Groups patterns by domain and displays them as clusters with:
   * - Cluster coloring using d3.scaleOrdinal
   * - Cluster labels as SVG text elements
   * - Expansion/collapse on click
   */
  import type { Pattern, PatternDomain } from '$lib/types/patterns';
  import { DOMAIN_CONFIGS } from '$lib/types/patterns';
  import type { ForceNode, ForceLink, ForceGraphData } from '$lib/components/viz/types';

  interface PatternCluster {
    id: string;
    domain: PatternDomain;
    patterns: Pattern[];
    centerX: number;
    centerY: number;
    radius: number;
    expanded: boolean;
    color: string;
  }

  interface Props {
    patterns: Pattern[];
    width?: number;
    height?: number;
    onClusterClick?: (cluster: PatternCluster) => void;
    onPatternClick?: (pattern: Pattern) => void;
    expandedDomains?: PatternDomain[];
  }

  let {
    patterns,
    width = 800,
    height = 600,
    onClusterClick,
    onPatternClick,
    expandedDomains = []
  }: Props = $props();

  // Domain colors using ordinal scale pattern
  const domainColorScale: Record<PatternDomain, string> = {
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

  // Group patterns by domain
  function groupByDomain(patterns: Pattern[]): Map<PatternDomain, Pattern[]> {
    const groups = new Map<PatternDomain, Pattern[]>();

    patterns.forEach(pattern => {
      const existing = groups.get(pattern.domain) || [];
      groups.set(pattern.domain, [...existing, pattern]);
    });

    return groups;
  }

  // Calculate cluster positions using circular layout
  function calculateClusterPositions(
    groups: Map<PatternDomain, Pattern[]>,
    width: number,
    height: number
  ): PatternCluster[] {
    const domains = Array.from(groups.keys());
    const centerX = width / 2;
    const centerY = height / 2;
    const layoutRadius = Math.min(width, height) / 3;

    return domains.map((domain, i) => {
      const angle = (2 * Math.PI * i) / domains.length - Math.PI / 2;
      const patterns = groups.get(domain) || [];
      const clusterRadius = 30 + patterns.length * 5;

      return {
        id: `cluster-${domain}`,
        domain,
        patterns,
        centerX: centerX + layoutRadius * Math.cos(angle),
        centerY: centerY + layoutRadius * Math.sin(angle),
        radius: clusterRadius,
        expanded: expandedDomains.includes(domain),
        color: domainColorScale[domain] || domainColorScale.general
      };
    });
  }

  // Calculate pattern positions within expanded cluster
  function getPatternPositions(
    cluster: PatternCluster,
    patterns: Pattern[]
  ): Array<{ pattern: Pattern; x: number; y: number }> {
    if (!cluster.expanded) return [];

    return patterns.map((pattern, i) => {
      const angle = (2 * Math.PI * i) / patterns.length;
      const radius = cluster.radius + 40;
      return {
        pattern,
        x: cluster.centerX + radius * Math.cos(angle),
        y: cluster.centerY + radius * Math.sin(angle)
      };
    });
  }

  // Computed clusters
  let clusters = $derived.by(() => {
    const groups = groupByDomain(patterns);
    return calculateClusterPositions(groups, width, height);
  });

  function handleClusterClick(cluster: PatternCluster) {
    onClusterClick?.(cluster);
  }
</script>

<svg {width} {height} class="pattern-clusters" role="img" aria-label="Pattern clusters visualization">
  <!-- Background -->
  <rect width="100%" height="100%" fill="#f8fafc" />

  <!-- Cluster connections (if any clusters are expanded) -->
  <g class="cluster-connections">
    {#each clusters as cluster}
      {#if cluster.expanded}
        {#each getPatternPositions(cluster, cluster.patterns) as { x, y }}
          <line
            x1={cluster.centerX}
            y1={cluster.centerY}
            x2={x}
            y2={y}
            stroke={cluster.color}
            stroke-width="1"
            stroke-opacity="0.3"
            stroke-dasharray="4 2"
          />
        {/each}
      {/if}
    {/each}
  </g>

  <!-- Clusters -->
  <g class="clusters">
    {#each clusters as cluster}
      <g class="cluster-group">
        <!-- Cluster background circle -->
        <circle
          cx={cluster.centerX}
          cy={cluster.centerY}
          r={cluster.radius}
          fill={cluster.color}
          fill-opacity="0.15"
          stroke={cluster.color}
          stroke-width="2"
          class="cluster-circle"
          class:expanded={cluster.expanded}
          role="button"
          tabindex="0"
          onclick={() => handleClusterClick(cluster)}
          onkeydown={(e) => e.key === 'Enter' && handleClusterClick(cluster)}
        />

        <!-- Cluster label -->
        <text
          x={cluster.centerX}
          y={cluster.centerY - cluster.radius - 10}
          text-anchor="middle"
          class="cluster-label"
          fill={cluster.color}
          font-size="12"
          font-weight="600"
        >
          {DOMAIN_CONFIGS[cluster.domain]?.label || cluster.domain}
        </text>

        <!-- Pattern count -->
        <text
          x={cluster.centerX}
          y={cluster.centerY}
          text-anchor="middle"
          dominant-baseline="middle"
          class="cluster-count"
          fill={cluster.color}
          font-size="18"
          font-weight="700"
        >
          {cluster.patterns.length}
        </text>

        <!-- Expand indicator -->
        <text
          x={cluster.centerX}
          y={cluster.centerY + 16}
          text-anchor="middle"
          class="cluster-hint"
          fill={cluster.color}
          font-size="10"
          fill-opacity="0.7"
        >
          {cluster.expanded ? 'collapse' : 'expand'}
        </text>

        <!-- Expanded pattern nodes -->
        {#if cluster.expanded}
          {#each getPatternPositions(cluster, cluster.patterns) as { pattern, x, y }}
            <g
              class="pattern-node"
              transform="translate({x}, {y})"
              role="button"
              tabindex="0"
              onclick={() => onPatternClick?.(pattern)}
              onkeydown={(e) => e.key === 'Enter' && onPatternClick?.(pattern)}
            >
              <circle
                r="15"
                fill={cluster.color}
                stroke="#fff"
                stroke-width="2"
                class="pattern-circle"
              />
              <title>{pattern.name}</title>
            </g>
          {/each}
        {/if}
      </g>
    {/each}
  </g>

  <!-- Legend -->
  <g class="legend" transform="translate(20, {height - 20 - clusters.length * 20})">
    {#each clusters as cluster, i}
      <g transform="translate(0, {i * 20})">
        <circle
          cx="8"
          cy="0"
          r="6"
          fill={cluster.color}
        />
        <text
          x="20"
          y="4"
          fill="#374151"
          font-size="11"
        >
          {DOMAIN_CONFIGS[cluster.domain]?.label || cluster.domain} ({cluster.patterns.length})
        </text>
      </g>
    {/each}
  </g>
</svg>

<style>
  .pattern-clusters {
    background: #f8fafc;
    border-radius: 0.5rem;
    border: 1px solid #e2e8f0;
  }

  .cluster-circle {
    cursor: pointer;
    transition: fill-opacity 0.2s ease, r 0.3s ease;
  }

  .cluster-circle:hover {
    fill-opacity: 0.25;
  }

  .cluster-circle.expanded {
    fill-opacity: 0.1;
  }

  .cluster-label {
    pointer-events: none;
    user-select: none;
  }

  .cluster-count {
    pointer-events: none;
    user-select: none;
  }

  .cluster-hint {
    pointer-events: none;
    user-select: none;
  }

  .pattern-node {
    cursor: pointer;
  }

  .pattern-circle {
    transition: filter 0.15s ease;
  }

  .pattern-node:hover .pattern-circle {
    filter: brightness(1.1) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
  }

  .legend {
    pointer-events: none;
  }
</style>
