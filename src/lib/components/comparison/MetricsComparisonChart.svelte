<script lang="ts">
  /**
   * GAP-UX.3: Metrics Comparison Chart Component
   *
   * A horizontal bar chart for comparing metrics across multiple projects.
   * Supports velocity, completion rate, cycle time, and other metrics.
   */
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import Card from '$lib/components/ui/Card.svelte';
  import type { ProjectComparisonData, ComparisonMetricType } from '$lib/types/project-comparison';
  import { getProjectColor, formatComparisonMetric } from '$lib/types/project-comparison';
  import { BarChart2 } from 'lucide-svelte';

  interface Props {
    projects: ProjectComparisonData[];
    metricType?: ComparisonMetricType;
    height?: number;
    showLabels?: boolean;
    animate?: boolean;
    class?: string;
  }

  let {
    projects,
    metricType = 'velocity',
    height = 200,
    showLabels = true,
    animate = true,
    class: className = ''
  }: Props = $props();

  let containerRef: HTMLDivElement | null = $state(null);
  let svgRef: SVGSVGElement | null = $state(null);
  let mounted = $state(false);
  let containerWidth = $state(400);

  // Config
  const marginTop = 20;
  const marginRight = 80;
  const marginBottom = 40;
  const marginLeft = 120;
  const barHeight = 24;
  const barGap = 8;

  // Calculate dynamic height based on number of projects
  let chartHeight = $derived(Math.max(
    height,
    marginTop + marginBottom + (projects.length * (barHeight + barGap))
  ));

  let innerWidth = $derived(containerWidth - marginLeft - marginRight);
  let innerHeight = $derived(chartHeight - marginTop - marginBottom);

  // Extract metric value from project based on type
  function getMetricValue(project: ProjectComparisonData): number {
    switch (metricType) {
      case 'velocity':
        return project.velocity;
      case 'completion':
        return project.ticketCount > 0
          ? (project.completedTickets / project.ticketCount) * 100
          : 0;
      case 'cycleTime':
        return project.avgCycleTime;
      case 'agents':
        return project.activeAgents;
      case 'patterns':
        return project.patternCount;
      default:
        return 0;
    }
  }

  // Get metric label
  function getMetricLabel(): string {
    switch (metricType) {
      case 'velocity':
        return 'Velocity (tickets/week)';
      case 'completion':
        return 'Completion Rate (%)';
      case 'cycleTime':
        return 'Avg Cycle Time (hours)';
      case 'agents':
        return 'Active Agents';
      case 'patterns':
        return 'Pattern Count';
      default:
        return '';
    }
  }

  // Prepare data for chart
  let chartData = $derived(
    projects.map((project, i) => ({
      id: project.id,
      name: project.name,
      value: getMetricValue(project),
      color: getProjectColor(i)
    }))
  );

  // Observe container width
  onMount(() => {
    mounted = true;

    if (containerRef) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          containerWidth = entry.contentRect.width || 400;
        }
      });
      resizeObserver.observe(containerRef);

      return () => resizeObserver.disconnect();
    }
  });

  function renderChart() {
    if (!svgRef || !mounted || chartData.length === 0) return;

    const svg = d3.select(svgRef);
    const g = svg.select('.chart-content');

    // Clear previous content
    g.selectAll('*').remove();

    // Create scales
    const maxValue = d3.max(chartData, d => d.value) ?? 0;
    const xScale = d3.scaleLinear()
      .domain([0, maxValue * 1.1])
      .range([0, innerWidth]);

    const yScale = d3.scaleBand<string>()
      .domain(chartData.map(d => d.id))
      .range([0, innerHeight])
      .padding(0.3);

    // Add grid lines
    const xGrid = g.append('g')
      .attr('class', 'grid');

    xGrid.selectAll('line')
      .data(xScale.ticks(5))
      .enter()
      .append('line')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#e5e7eb')
      .attr('stroke-dasharray', '2,2');

    // Add x-axis
    const xAxis = g.append('g')
      .attr('class', 'axis x-axis')
      .attr('transform', `translate(0, ${innerHeight})`);

    xAxis.call(d3.axisBottom(xScale).ticks(5));

    // Add y-axis labels (project names)
    const yLabels = g.append('g')
      .attr('class', 'y-labels');

    yLabels.selectAll('text')
      .data(chartData)
      .enter()
      .append('text')
      .attr('x', -10)
      .attr('y', d => (yScale(d.id) ?? 0) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('fill', '#374151')
      .attr('font-size', '12px')
      .text(d => d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name);

    // Add bars
    const bars = g.selectAll('.bar')
      .data(chartData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', d => yScale(d.id) ?? 0)
      .attr('height', yScale.bandwidth())
      .attr('fill', d => d.color)
      .attr('rx', 4)
      .attr('ry', 4);

    if (animate) {
      bars
        .attr('width', 0)
        .transition()
        .duration(750)
        .delay((_, i) => i * 100)
        .attr('width', d => xScale(d.value));
    } else {
      bars.attr('width', d => xScale(d.value));
    }

    // Add value labels
    if (showLabels) {
      const labels = g.selectAll('.value-label')
        .data(chartData)
        .enter()
        .append('text')
        .attr('class', 'value-label')
        .attr('y', d => (yScale(d.id) ?? 0) + yScale.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('fill', '#374151')
        .attr('font-size', '11px')
        .attr('font-weight', '500')
        .text(d => formatComparisonMetric(d.value, metricType));

      if (animate) {
        labels
          .attr('x', 5)
          .attr('opacity', 0)
          .transition()
          .delay(750)
          .duration(200)
          .attr('x', d => xScale(d.value) + 8)
          .attr('opacity', 1);
      } else {
        labels.attr('x', d => xScale(d.value) + 8);
      }
    }

    // Hover effects
    bars
      .on('mouseenter', function() {
        d3.select(this)
          .transition()
          .duration(100)
          .attr('opacity', 0.8);
      })
      .on('mouseleave', function() {
        d3.select(this)
          .transition()
          .duration(100)
          .attr('opacity', 1);
      });
  }

  $effect(() => {
    if (browser && mounted && chartData.length > 0 && innerWidth > 0) {
      renderChart();
    }
  });
</script>

<Card class="overflow-hidden {className}">
  <div class="p-4 border-b border-gray-100">
    <div class="flex items-center gap-2">
      <BarChart2 class="w-4 h-4 text-gray-500" />
      <h3 class="font-semibold text-gray-900 text-sm">{getMetricLabel()}</h3>
    </div>
  </div>

  <div bind:this={containerRef} class="p-4">
    {#if browser}
      {#if chartData.length === 0}
        <div class="flex items-center justify-center h-32 text-gray-500 text-sm">
          Select projects to compare
        </div>
      {:else}
        <svg
          bind:this={svgRef}
          width={containerWidth}
          height={chartHeight}
          role="img"
          aria-label="Metrics comparison chart"
        >
          <g class="chart-content" transform="translate({marginLeft}, {marginTop})">
            <!-- Content rendered by D3 -->
          </g>
        </svg>
      {/if}
    {:else}
      <div
        class="bg-gray-100 animate-pulse rounded"
        style="height: {chartHeight}px;"
      ></div>
    {/if}
  </div>
</Card>

<style>
  :global(.metrics-chart .axis path),
  :global(.metrics-chart .axis line) {
    stroke: #d1d5db;
  }

  :global(.metrics-chart .axis text) {
    fill: #6b7280;
    font-size: 11px;
  }

  :global(.metrics-chart .bar) {
    cursor: pointer;
  }
</style>
