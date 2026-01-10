<script lang="ts">
  /**
   * ForceGraph Component
   *
   * TASK-068 (D3 Agent dependency): Force-directed graph visualization
   *
   * A D3-powered force graph component for visualizing nodes and links
   * with interactive features like dragging, zooming, and node selection.
   */
  import { onMount, onDestroy } from 'svelte';
  import { cn } from '$lib/utils';

  /**
   * Node data structure for the force graph
   */
  export interface GraphNode {
    id: string;
    label: string;
    group?: string;
    color?: string;
    radius?: number;
    data?: Record<string, unknown>;
    x?: number;
    y?: number;
    fx?: number | null;
    fy?: number | null;
  }

  /**
   * Link data structure for the force graph
   */
  export interface GraphLink {
    source: string | GraphNode;
    target: string | GraphNode;
    value?: number;
    label?: string;
  }

  /**
   * Graph data structure
   */
  export interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
  }

  interface Props {
    data: GraphData;
    width?: number;
    height?: number;
    nodeRadius?: number;
    linkDistance?: number;
    chargeStrength?: number;
    onNodeClick?: (node: GraphNode) => void;
    onNodeHover?: (node: GraphNode | null) => void;
    selectedNodeId?: string | null;
    highlightedNodeIds?: string[];
    class?: string;
  }

  let {
    data,
    width = 800,
    height = 600,
    nodeRadius = 20,
    linkDistance = 100,
    chargeStrength = -300,
    onNodeClick,
    onNodeHover,
    selectedNodeId = null,
    highlightedNodeIds = [],
    class: className = ''
  }: Props = $props();

  let svgElement: SVGSVGElement;
  let simulation: ReturnType<typeof createSimulation> | null = null;
  let nodes: GraphNode[] = $state([]);
  let links: { source: GraphNode; target: GraphNode; value?: number; label?: string }[] = $state([]);
  let transform = $state({ x: 0, y: 0, k: 1 });
  let isDragging = $state(false);
  let draggedNode: GraphNode | null = $state(null);

  // Color scale for groups
  const colorScale = [
    '#4f46e5', // indigo
    '#0891b2', // cyan
    '#059669', // emerald
    '#d97706', // amber
    '#dc2626', // red
    '#7c3aed', // violet
    '#2563eb', // blue
    '#16a34a', // green
    '#ea580c', // orange
    '#be185d'  // pink
  ];

  function getGroupColor(group: string | undefined, index: number): string {
    if (!group) return colorScale[index % colorScale.length];
    const groupIndex = [...new Set(data.nodes.map(n => n.group))].indexOf(group);
    return colorScale[groupIndex % colorScale.length];
  }

  /**
   * Simple force simulation (minimal implementation)
   */
  function createSimulation() {
    const nodeMap = new Map<string, GraphNode>();

    // Initialize node positions
    const simulatedNodes = data.nodes.map((node, i) => {
      const angle = (2 * Math.PI * i) / data.nodes.length;
      const radius = Math.min(width, height) / 3;
      const simNode = {
        ...node,
        x: node.x ?? width / 2 + radius * Math.cos(angle),
        y: node.y ?? height / 2 + radius * Math.sin(angle),
        vx: 0,
        vy: 0
      };
      nodeMap.set(node.id, simNode);
      return simNode;
    });

    // Create links with node references
    const simulatedLinks = data.links.map(link => ({
      source: nodeMap.get(typeof link.source === 'string' ? link.source : link.source.id) as GraphNode,
      target: nodeMap.get(typeof link.target === 'string' ? link.target : link.target.id) as GraphNode,
      value: link.value,
      label: link.label
    })).filter(l => l.source && l.target);

    let alpha = 1;
    let alphaDecay = 0.02;
    let running = true;

    function tick() {
      if (!running || alpha < 0.01) return;

      // Apply forces
      simulatedNodes.forEach((node, i) => {
        // Center force
        const cx = width / 2 - (node.x ?? 0);
        const cy = height / 2 - (node.y ?? 0);
        node.vx = (node.vx ?? 0) + cx * 0.01 * alpha;
        node.vy = (node.vy ?? 0) + cy * 0.01 * alpha;

        // Repulsion between nodes
        simulatedNodes.forEach((other, j) => {
          if (i === j) return;
          const dx = (node.x ?? 0) - (other.x ?? 0);
          const dy = (node.y ?? 0) - (other.y ?? 0);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (chargeStrength / (dist * dist)) * alpha;
          node.vx = (node.vx ?? 0) + (dx / dist) * -force;
          node.vy = (node.vy ?? 0) + (dy / dist) * -force;
        });
      });

      // Link forces
      simulatedLinks.forEach(link => {
        const dx = (link.target.x ?? 0) - (link.source.x ?? 0);
        const dy = (link.target.y ?? 0) - (link.source.y ?? 0);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - linkDistance) * 0.1 * alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        link.source.vx = (link.source.vx ?? 0) + fx;
        link.source.vy = (link.source.vy ?? 0) + fy;
        link.target.vx = (link.target.vx ?? 0) - fx;
        link.target.vy = (link.target.vy ?? 0) - fy;
      });

      // Apply velocities
      simulatedNodes.forEach(node => {
        if (node.fx != null) {
          node.x = node.fx;
          node.vx = 0;
        } else {
          node.vx = (node.vx ?? 0) * 0.6;
          node.x = (node.x ?? 0) + (node.vx ?? 0);
        }

        if (node.fy != null) {
          node.y = node.fy;
          node.vy = 0;
        } else {
          node.vy = (node.vy ?? 0) * 0.6;
          node.y = (node.y ?? 0) + (node.vy ?? 0);
        }
      });

      alpha *= (1 - alphaDecay);
      nodes = [...simulatedNodes];
      links = [...simulatedLinks];

      if (running) {
        requestAnimationFrame(tick);
      }
    }

    return {
      start() {
        alpha = 1;
        running = true;
        tick();
      },
      stop() {
        running = false;
      },
      restart() {
        alpha = 0.3;
        if (!running) {
          running = true;
          tick();
        }
      },
      nodes: simulatedNodes,
      links: simulatedLinks
    };
  }

  function handleNodeMouseDown(event: MouseEvent, node: GraphNode) {
    event.preventDefault();
    isDragging = true;
    draggedNode = node;
    node.fx = node.x;
    node.fy = node.y;
  }

  function handleMouseMove(event: MouseEvent) {
    if (!isDragging || !draggedNode) return;

    const rect = svgElement.getBoundingClientRect();
    const x = (event.clientX - rect.left - transform.x) / transform.k;
    const y = (event.clientY - rect.top - transform.y) / transform.k;

    draggedNode.fx = x;
    draggedNode.fy = y;
    simulation?.restart();
  }

  function handleMouseUp() {
    if (draggedNode) {
      draggedNode.fx = null;
      draggedNode.fy = null;
    }
    isDragging = false;
    draggedNode = null;
  }

  function handleNodeClick(node: GraphNode) {
    if (!isDragging) {
      onNodeClick?.(node);
    }
  }

  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const rect = svgElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const newK = Math.max(0.1, Math.min(4, transform.k * scaleFactor));
    transform = {
      x: mouseX - (mouseX - transform.x) * (newK / transform.k),
      y: mouseY - (mouseY - transform.y) * (newK / transform.k),
      k: newK
    };
  }

  onMount(() => {
    simulation = createSimulation();
    simulation.start();
  });

  onDestroy(() => {
    simulation?.stop();
  });

  // Restart simulation when data changes
  $effect(() => {
    if (data && simulation) {
      simulation.stop();
      simulation = createSimulation();
      simulation.start();
    }
  });

  function isHighlighted(nodeId: string): boolean {
    return highlightedNodeIds.includes(nodeId);
  }

  function isSelected(nodeId: string): boolean {
    return selectedNodeId === nodeId;
  }
</script>

<svg
  bind:this={svgElement}
  {width}
  {height}
  class={cn('force-graph', className)}
  role="img"
  aria-label="Force-directed graph visualization"
  onmousemove={handleMouseMove}
  onmouseup={handleMouseUp}
  onmouseleave={handleMouseUp}
  onwheel={handleWheel}
>
  <g transform="translate({transform.x}, {transform.y}) scale({transform.k})">
    <!-- Links -->
    <g class="links">
      {#each links as link}
        <line
          x1={link.source.x}
          y1={link.source.y}
          x2={link.target.x}
          y2={link.target.y}
          stroke="#94a3b8"
          stroke-width={Math.sqrt(link.value ?? 1)}
          stroke-opacity="0.6"
        />
      {/each}
    </g>

    <!-- Nodes -->
    <g class="nodes">
      {#each nodes as node, i}
        {@const radius = node.radius ?? nodeRadius}
        {@const color = node.color ?? getGroupColor(node.group, i)}
        <g
          class="node-group"
          transform="translate({node.x}, {node.y})"
          role="button"
          tabindex="0"
          aria-label={node.label}
          onmousedown={(e) => handleNodeMouseDown(e, node)}
          onclick={() => handleNodeClick(node)}
          onmouseenter={() => onNodeHover?.(node)}
          onmouseleave={() => onNodeHover?.(null)}
          onkeydown={(e) => e.key === 'Enter' && handleNodeClick(node)}
        >
          <!-- Selection ring -->
          {#if isSelected(node.id)}
            <circle
              r={radius + 4}
              fill="none"
              stroke="#3b82f6"
              stroke-width="3"
              class="selection-ring"
            />
          {/if}

          <!-- Highlight ring -->
          {#if isHighlighted(node.id) && !isSelected(node.id)}
            <circle
              r={radius + 3}
              fill="none"
              stroke="#fbbf24"
              stroke-width="2"
              class="highlight-ring"
            />
          {/if}

          <!-- Node circle -->
          <circle
            r={radius}
            fill={color}
            stroke="#fff"
            stroke-width="2"
            class="node-circle"
            class:cursor-grab={!isDragging}
            class:cursor-grabbing={isDragging}
          />

          <!-- Node label -->
          <text
            y={radius + 14}
            text-anchor="middle"
            class="node-label"
            fill="#374151"
            font-size="12"
          >
            {node.label}
          </text>
        </g>
      {/each}
    </g>
  </g>
</svg>

<style>
  .force-graph {
    background: #f8fafc;
    border-radius: 0.5rem;
    border: 1px solid #e2e8f0;
  }

  .node-group {
    outline: none;
  }

  .node-circle {
    transition: filter 0.2s ease;
  }

  .node-group:hover .node-circle {
    filter: brightness(1.1);
  }

  .node-group:focus .node-circle {
    filter: brightness(1.1);
  }

  .node-label {
    pointer-events: none;
    user-select: none;
  }

  .selection-ring {
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .cursor-grab {
    cursor: grab;
  }

  .cursor-grabbing {
    cursor: grabbing;
  }
</style>
