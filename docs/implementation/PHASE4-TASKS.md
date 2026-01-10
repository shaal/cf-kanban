# Phase 4: Learning Visualization - Implementation Tasks

## Overview

**Duration**: Weeks 13-16
**Goal**: Visualize AI learning with D3.js graphs, pattern explorer, and memory browser
**Prerequisites**: Phase 3 complete (Claude Flow integration)

---

## Sprint 1: D3.js Foundation (Week 13)

### TASK-066: Set Up D3.js in SvelteKit
**Priority**: Critical
**Estimated**: 1 hour

- [ ] Install D3.js and types
- [ ] Create D3 wrapper component for Svelte
- [ ] Handle SSR (client-only rendering)
- [ ] Set up responsive container

```bash
npm install d3
npm install -D @types/d3
```

```svelte
<!-- src/lib/components/viz/D3Container.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import * as d3 from 'd3';

  export let width: number | 'auto' = 'auto';
  export let height: number = 400;

  let container: HTMLDivElement;
  let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  let actualWidth: number;

  onMount(() => {
    if (!browser) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        actualWidth = entry.contentRect.width;
        dispatch('resize', { width: actualWidth, height });
      }
    });

    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  });

  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  export function getSvg() {
    return svg;
  }

  export function getD3() {
    return d3;
  }
</script>

<div
  bind:this={container}
  class="d3-container"
  style="width: {width === 'auto' ? '100%' : `${width}px`}; height: {height}px;"
>
  {#if browser}
    <svg
      bind:this={svg}
      width={actualWidth || 0}
      {height}
      class="d3-svg"
    >
      <slot />
    </svg>
  {/if}
</div>

<style>
  .d3-container {
    position: relative;
    overflow: hidden;
  }
  .d3-svg {
    display: block;
  }
</style>
```

**Acceptance Criteria**:
- D3.js loads without SSR errors
- Responsive container works
- SVG accessible for child components

---

### TASK-067: Create Base Chart Components
**Priority**: Critical
**Estimated**: 1.5 hours

- [ ] Create line chart component
- [ ] Create bar chart component
- [ ] Create area chart component
- [ ] Add animations and transitions

---

### TASK-068: Implement Force-Directed Graph
**Priority**: Critical
**Estimated**: 2 hours

- [ ] Create force simulation setup
- [ ] Implement node dragging
- [ ] Add zoom and pan
- [ ] Handle node/link updates

```svelte
<!-- src/lib/components/viz/ForceGraph.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as d3 from 'd3';

  interface Node {
    id: string;
    label: string;
    group?: string;
    value?: number;
  }

  interface Link {
    source: string;
    target: string;
    strength?: number;
  }

  export let nodes: Node[] = [];
  export let links: Link[] = [];
  export let width = 800;
  export let height = 600;

  let svg: SVGSVGElement;
  let simulation: d3.Simulation<Node, Link>;

  onMount(() => {
    initSimulation();
  });

  $: if (simulation && (nodes || links)) {
    updateSimulation();
  }

  function initSimulation() {
    const svgSelection = d3.select(svg);

    // Clear existing
    svgSelection.selectAll('*').remove();

    // Create groups
    const g = svgSelection.append('g');
    const linkGroup = g.append('g').attr('class', 'links');
    const nodeGroup = g.append('g').attr('class', 'nodes');

    // Add zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svgSelection.call(zoom);

    // Initialize simulation
    simulation = d3.forceSimulation<Node>(nodes)
      .force('link', d3.forceLink<Node, Link>(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    simulation.on('tick', () => {
      linkGroup.selectAll('line')
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodeGroup.selectAll('g')
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    updateSimulation();
  }

  function updateSimulation() {
    const svgSelection = d3.select(svg);
    const linkGroup = svgSelection.select('.links');
    const nodeGroup = svgSelection.select('.nodes');

    // Update links
    const link = linkGroup.selectAll('line')
      .data(links, (d: any) => `${d.source}-${d.target}`);

    link.exit().remove();

    link.enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1);

    // Update nodes
    const node = nodeGroup.selectAll('g')
      .data(nodes, (d: any) => d.id);

    node.exit().remove();

    const nodeEnter = node.enter()
      .append('g')
      .call(drag(simulation));

    nodeEnter.append('circle')
      .attr('r', 20)
      .attr('fill', (d) => colorScale(d.group || 'default'));

    nodeEnter.append('text')
      .attr('dy', 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', 'white')
      .text(d => d.label.substring(0, 8));

    // Restart simulation
    simulation.nodes(nodes);
    simulation.force<d3.ForceLink<Node, Link>>('link')?.links(links);
    simulation.alpha(0.3).restart();
  }

  const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

  function drag(simulation: d3.Simulation<Node, Link>) {
    return d3.drag<SVGGElement, Node>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
  }

  onDestroy(() => {
    simulation?.stop();
  });
</script>

<svg bind:this={svg} {width} {height} class="force-graph">
</svg>
```

**Acceptance Criteria**:
- Force simulation runs smoothly
- Nodes draggable
- Zoom and pan work
- Updates handle gracefully

---

### TASK-069: Add Graph Animations
**Priority**: High
**Estimated**: 1 hour

- [ ] Animate node entrance/exit
- [ ] Animate link transitions
- [ ] Add hover effects
- [ ] Implement smooth updates

---

### TASK-070: Create Graph Legend and Controls
**Priority**: High
**Estimated**: 1 hour

- [ ] Add color legend for groups
- [ ] Create filter controls
- [ ] Add search functionality
- [ ] Implement highlight on search

---

## Sprint 2: Pattern Explorer (Week 14)

### TASK-071: Create Pattern Explorer Page
**Priority**: Critical
**Estimated**: 1.5 hours

- [ ] Create `/src/routes/learning/patterns/+page.svelte`
- [ ] Fetch patterns from Claude Flow memory
- [ ] Display in force graph
- [ ] Add sidebar with pattern details

---

### TASK-072: Implement Pattern Clustering
**Priority**: Critical
**Estimated**: 2 hours

- [ ] Group patterns by domain (auth, api, testing, etc.)
- [ ] Apply cluster coloring
- [ ] Add cluster labels
- [ ] Implement cluster expansion/collapse

---

### TASK-073: Add Pattern Search and Filter
**Priority**: High
**Estimated**: 1.5 hours

- [ ] Create search input with debounce
- [ ] Filter by success rate
- [ ] Filter by date range
- [ ] Filter by usage count

---

### TASK-074: Create Pattern Detail Panel
**Priority**: High
**Estimated**: 1 hour

- [ ] Display pattern metadata
- [ ] Show success rate history
- [ ] List related patterns
- [ ] Add "Apply to Ticket" action

---

### TASK-075: Add Pattern Comparison View
**Priority**: Medium
**Estimated**: 1.5 hours

- [ ] Select multiple patterns
- [ ] Side-by-side comparison
- [ ] Diff visualization
- [ ] Success rate comparison chart

---

## Sprint 3: Neural Dashboard (Week 15)

### TASK-076: Create Neural Training Page
**Priority**: Critical
**Estimated**: 1.5 hours

- [ ] Create `/src/routes/learning/neural/+page.svelte`
- [ ] Fetch training metrics from Claude Flow
- [ ] Display SONA adaptation speed
- [ ] Show MoE expert utilization

---

### TASK-077: Implement Training Metrics Charts
**Priority**: Critical
**Estimated**: 2 hours

- [ ] Create loss/accuracy chart over time
- [ ] Create expert utilization breakdown
- [ ] Add EWC++ forgetting prevention status
- [ ] Implement real-time updates

---

### TASK-078: Create Training Configuration Panel
**Priority**: High
**Estimated**: 1.5 hours

- [ ] Display current training config
- [ ] Allow config adjustments (epochs, learning rate)
- [ ] Trigger manual training
- [ ] Show training history

---

### TASK-079: Add Neural Pattern Viewer
**Priority**: High
**Estimated**: 1.5 hours

- [ ] List trained patterns
- [ ] Visualize pattern embeddings (t-SNE/UMAP)
- [ ] Show pattern confidence
- [ ] Predict pattern for new task

---

## Sprint 4: Memory Browser & Transfer (Week 16)

### TASK-080: Create Memory Browser Page
**Priority**: Critical
**Estimated**: 1.5 hours

- [ ] Create `/src/routes/learning/memory/+page.svelte`
- [ ] List all namespaces
- [ ] Show entry count per namespace
- [ ] Navigate into namespace

---

### TASK-081: Implement Namespace Viewer
**Priority**: Critical
**Estimated**: 1.5 hours

- [ ] List entries in namespace
- [ ] Pagination/virtual scrolling
- [ ] Entry details view
- [ ] Delete entry action

---

### TASK-082: Add Semantic Search
**Priority**: High
**Estimated**: 1.5 hours

- [ ] Create search input
- [ ] Call Claude Flow memory search
- [ ] Display results with similarity scores
- [ ] Highlight matching terms

---

### TASK-083: Create Manual Memory Entry
**Priority**: Medium
**Estimated**: 1 hour

- [ ] Form to add new entry
- [ ] Namespace selection
- [ ] Key/value input
- [ ] Tags input

---

### TASK-084: Create Cross-Project Transfer Page
**Priority**: Critical
**Estimated**: 1.5 hours

- [ ] Create `/src/routes/learning/transfer/+page.svelte`
- [ ] List available patterns for transfer
- [ ] Show pattern project origin
- [ ] Transfer button with confirmation

---

### TASK-085: Implement Transfer Preview
**Priority**: High
**Estimated**: 1.5 hours

- [ ] Show pattern details before transfer
- [ ] Estimate compatibility
- [ ] Preview how it would apply
- [ ] Warning for potential conflicts

---

### TASK-086: Add Transfer History
**Priority**: High
**Estimated**: 1 hour

- [ ] Log all transfers
- [ ] Show success/failure
- [ ] Performance impact after transfer
- [ ] Rollback capability

---

### TASK-087: Create Sharing Controls
**Priority**: High
**Estimated**: 1 hour

- [ ] Project sharing settings
- [ ] Public/private patterns toggle
- [ ] Share to specific projects
- [ ] Opt-out of global patterns

---

## Sprint 5: Testing (Week 16 continued)

### TASK-088: Add Visual Regression Tests
**Priority**: High
**Estimated**: 1.5 hours

- [ ] Set up Playwright visual tests
- [ ] Screenshot D3 visualizations
- [ ] Compare against baselines
- [ ] CI integration

---

### TASK-089: Add Accessibility Tests
**Priority**: High
**Estimated**: 1 hour

- [ ] Ensure graphs are keyboard navigable
- [ ] Add ARIA labels
- [ ] Screen reader testing
- [ ] Color contrast verification

---

### TASK-090: Add Performance Tests
**Priority**: High
**Estimated**: 1.5 hours

- [ ] Measure render time for large graphs
- [ ] Test with 1000+ nodes
- [ ] Memory usage monitoring
- [ ] Frame rate verification (<60fps)

---

## Phase 4 Completion Checklist

- [ ] All 25 tasks completed (TASK-066 to TASK-090)
- [ ] D3.js visualizations render smoothly
- [ ] Pattern Explorer functional with search/filter
- [ ] Neural dashboard shows real metrics
- [ ] Memory browser allows exploration
- [ ] Cross-project transfer works
- [ ] All tests passing
- [ ] Store implementation pattern:

```bash
npx @claude-flow/cli@latest memory store \
  --key "impl-phase4-complete" \
  --value "Phase 4 complete. D3.js visualizations: force graph, charts. Pattern Explorer with clustering. Neural training dashboard. Memory browser with semantic search. Cross-project transfer." \
  --namespace cf-kanban-impl
```
