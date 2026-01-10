<script lang="ts">
  /**
   * GAP-UX.3: Timeline Comparison Component
   *
   * A multi-line chart showing activity trends over time for
   * multiple projects in parallel.
   */
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import type { ProjectComparisonData, ActivityPoint } from '$lib/types/project-comparison';
  import { getProjectColor } from '$lib/types/project-comparison';
  import { Activity, Calendar, TrendingUp } from 'lucide-svelte';

  type MetricKey = 'ticketsCompleted' | 'ticketsCreated' | 'activeAgents';

  interface Props {
    projects: ProjectComparisonData[];
    height?: number;
    animate?: boolean;
    class?: string;
  }

  let {
    projects,
    height = 280,
    animate = true,
    class: className = ''
  }: Props = $props();

  let containerRef: HTMLDivElement | null = $state(null);
  let svgRef: SVGSVGElement | null = $state(null);
  let mounted = $state(false);
  let containerWidth = $state(600);
  let selectedMetric = $state<MetricKey>('ticketsCompleted');

  // Config
  const marginTop = 30;
  const marginRight = 20;
  const marginBottom = 50;
  const marginLeft = 50;

  let innerWidth = $derived(containerWidth - marginLeft - marginRight);
  let innerHeight = $derived(height - marginTop - marginBottom);

  // Metric options
  const metricOptions: { key: MetricKey; label: string }[] = [
    { key: 'ticketsCompleted', label: 'Completed' },
    { key: 'ticketsCreated', label: 'Created' },
    { key: 'activeAgents', label: 'Agents' }
  ];

  // Prepare data for chart - combine all project timelines
  let chartData = $derived(() => {
    return projects.map((project, i) => ({
      id: project.id,
      name: project.name,
      color: getProjectColor(i),
      data: project.recentActivity || []
    }));
  });

  // Get all unique dates across all projects
  let allDates = $derived(() => {
    const dates = new Set<string>();
    chartData().forEach(series => {
      series.data.forEach(point => dates.add(point.date));
    });
    return Array.from(dates).sort();
  });

  // Get max value for selected metric
  let maxValue = $derived(() => {
    let max = 0;
    chartData().forEach(series => {
      series.data.forEach(point => {
        const value = point[selectedMetric];
        if (value > max) max = value;
      });
    });
    return max;
  });

  // Observe container width
  onMount(() => {
    mounted = true;

    if (containerRef) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          containerWidth = entry.contentRect.width || 600;
        }
      });
      resizeObserver.observe(containerRef);

      return () => resizeObserver.disconnect();
    }
  });

  function renderChart() {
    if (!svgRef || !mounted || chartData().length === 0) return;

    const svg = d3.select(svgRef);
    const g = svg.select('.chart-content');

    // Clear previous content
    g.selectAll('*').remove();

    const dates = allDates();
    if (dates.length === 0) return;

    // Create scales
    const xScale = d3.scalePoint<string>()
      .domain(dates)
      .range([0, innerWidth])
      .padding(0.5);

    const yScale = d3.scaleLinear()
      .domain([0, maxValue() * 1.1 || 10])
      .range([innerHeight, 0]);

    // Add grid lines
    const yGrid = g.append('g')
      .attr('class', 'grid');

    yGrid.selectAll('line')
      .data(yScale.ticks(5))
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#e5e7eb')
      .attr('stroke-dasharray', '2,2');

    // Add axes
    const xAxis = g.append('g')
      .attr('class', 'axis x-axis')
      .attr('transform', `translate(0, ${innerHeight})`);

    xAxis.call(
      d3.axisBottom(xScale)
        .tickFormat(d => {
          const date = new Date(d);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        })
    );

    // Rotate x-axis labels if many dates
    if (dates.length > 7) {
      xAxis.selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .attr('dx', '-0.5em')
        .attr('dy', '0.5em');
    }

    const yAxis = g.append('g')
      .attr('class', 'axis y-axis');

    yAxis.call(d3.axisLeft(yScale).ticks(5));

    // Create line generator
    const line = d3.line<ActivityPoint>()
      .x(d => xScale(d.date) ?? 0)
      .y(d => yScale(d[selectedMetric]))
      .curve(d3.curveMonotoneX);

    // Draw lines for each project
    chartData().forEach((series, seriesIndex) => {
      if (series.data.length === 0) return;

      // Add the line path
      const path = g.append('path')
        .datum(series.data)
        .attr('class', 'line')
        .attr('fill', 'none')
        .attr('stroke', series.color)
        .attr('stroke-width', 2.5)
        .attr('d', line);

      // Animate the line drawing
      if (animate) {
        const totalLength = path.node()?.getTotalLength() || 0;
        path
          .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
          .attr('stroke-dashoffset', totalLength)
          .transition()
          .duration(1000)
          .delay(seriesIndex * 200)
          .ease(d3.easeLinear)
          .attr('stroke-dashoffset', 0);
      }

      // Add dots at data points
      const dots = g.selectAll(`.dot-${seriesIndex}`)
        .data(series.data)
        .enter()
        .append('circle')
        .attr('class', `dot dot-${seriesIndex}`)
        .attr('cx', d => xScale(d.date) ?? 0)
        .attr('cy', d => yScale(d[selectedMetric]))
        .attr('r', 4)
        .attr('fill', series.color)
        .attr('stroke', 'white')
        .attr('stroke-width', 2);

      if (animate) {
        dots
          .attr('opacity', 0)
          .transition()
          .duration(200)
          .delay((_, i) => 1000 + seriesIndex * 200 + i * 50)
          .attr('opacity', 1);
      }

      // Hover effects for dots
      dots
        .on('mouseenter', function(event, d) {
          d3.select(this)
            .transition()
            .duration(100)
            .attr('r', 6);

          // Show tooltip
          const tooltip = g.append('g')
            .attr('class', 'tooltip')
            .attr('transform', `translate(${xScale(d.date) ?? 0}, ${yScale(d[selectedMetric]) - 15})`);

          tooltip.append('rect')
            .attr('x', -40)
            .attr('y', -20)
            .attr('width', 80)
            .attr('height', 20)
            .attr('fill', 'white')
            .attr('stroke', series.color)
            .attr('rx', 4);

          tooltip.append('text')
            .attr('text-anchor', 'middle')
            .attr('y', -6)
            .attr('font-size', '11px')
            .attr('fill', '#374151')
            .text(`${series.name}: ${d[selectedMetric]}`);
        })
        .on('mouseleave', function() {
          d3.select(this)
            .transition()
            .duration(100)
            .attr('r', 4);

          g.selectAll('.tooltip').remove();
        });
    });
  }

  $effect(() => {
    if (browser && mounted && chartData().length > 0 && innerWidth > 0) {
      renderChart();
    }
  });
</script>

<Card class="overflow-hidden {className}">
  <div class="p-4 border-b border-gray-100">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Activity class="w-4 h-4 text-blue-600" />
        <h3 class="font-semibold text-gray-900 text-sm">Activity Timeline</h3>
      </div>

      <!-- Metric Toggle -->
      <div class="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
        {#each metricOptions as option}
          <button
            class="px-2 py-1 text-xs rounded transition-colors
              {selectedMetric === option.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}"
            onclick={() => (selectedMetric = option.key)}
          >
            {option.label}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <div bind:this={containerRef} class="p-4">
    {#if browser}
      {#if chartData().length === 0 || allDates().length === 0}
        <div class="flex flex-col items-center justify-center h-40 text-gray-500 text-sm">
          <Calendar class="w-8 h-8 text-gray-300 mb-2" />
          <span>No activity data available</span>
        </div>
      {:else}
        <svg
          bind:this={svgRef}
          width={containerWidth}
          {height}
          role="img"
          aria-label="Timeline comparison chart"
        >
          <g class="chart-content" transform="translate({marginLeft}, {marginTop})">
            <!-- Content rendered by D3 -->
          </g>
        </svg>

        <!-- Legend -->
        <div class="flex flex-wrap justify-center gap-4 mt-2">
          {#each chartData() as series}
            <div class="flex items-center gap-1.5 text-xs text-gray-600">
              <div
                class="w-3 h-0.5 rounded"
                style="background-color: {series.color}"
              ></div>
              <span class="truncate max-w-[120px]" title={series.name}>
                {series.name}
              </span>
            </div>
          {/each}
        </div>
      {/if}
    {:else}
      <div
        class="bg-gray-100 animate-pulse rounded"
        style="height: {height}px;"
      ></div>
    {/if}
  </div>
</Card>

<style>
  :global(.timeline-chart .axis path),
  :global(.timeline-chart .axis line) {
    stroke: #d1d5db;
  }

  :global(.timeline-chart .axis text) {
    fill: #6b7280;
    font-size: 11px;
  }

  :global(.timeline-chart .line) {
    fill: none;
  }

  :global(.timeline-chart .dot) {
    cursor: pointer;
  }
</style>
