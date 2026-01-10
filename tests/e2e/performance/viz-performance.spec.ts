/**
 * TASK-090: Performance Tests for D3 Visualizations
 *
 * This test suite measures and validates performance of visualization components:
 * - Render time for force graphs with increasing node counts (100, 500, 1000+)
 * - Memory usage during graph interactions
 * - Frame rate during animations (target: 60fps, minimum: 30fps)
 * - Performance budgets to fail tests if exceeded
 *
 * Performance budgets:
 * - 100 nodes: < 500ms render time
 * - 500 nodes: < 2000ms render time
 * - 1000 nodes: < 5000ms render time
 * - Interaction latency: < 100ms
 * - Memory increase: < 50MB
 * - Frame rate: >= 30fps (target: 60fps)
 */

import { test, expect, type Page } from '@playwright/test';
import {
  VizPage,
  PerformanceHelper,
  DataGenerator,
  VIZ_CONFIG,
  waitForIdle,
  type PerformanceMetrics,
  type GraphData,
} from '../utils/viz-helpers';

// Configure longer timeout for performance tests
test.describe.configure({ timeout: 120000 });

// Shared fixtures
let vizPage: VizPage;
let perfHelper: PerformanceHelper;

test.beforeEach(async ({ page }) => {
  vizPage = new VizPage(page);
  perfHelper = new PerformanceHelper(page);
});

/**
 * Helper to load graph data and wait for render
 */
async function loadGraph(page: Page, data: GraphData): Promise<void> {
  await page.evaluate((graphData) => {
    window.postMessage({ type: 'SET_GRAPH_DATA', data: graphData }, '*');
  }, data);
  await page.waitForSelector('[data-testid="force-graph"] .node');
}

test.describe('ForceGraph Render Performance', () => {
  test('renders 100 nodes within 500ms', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await waitForIdle(page);

    const graphData = DataGenerator.generateGraph(100, 0.1);

    const renderTime = await perfHelper.measureRenderTime(
      async () => await loadGraph(page, graphData),
      '[data-testid="force-graph"] .node'
    );

    console.log(`Render time for 100 nodes: ${renderTime.toFixed(2)}ms`);

    expect(renderTime).toBeLessThan(VIZ_CONFIG.performanceBudgets.renderTime100Nodes);
  });

  test('renders 500 nodes within 2000ms', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await waitForIdle(page);

    const graphData = DataGenerator.generateGraph(500, 0.05);

    const renderTime = await perfHelper.measureRenderTime(
      async () => await loadGraph(page, graphData),
      '[data-testid="force-graph"] .node'
    );

    console.log(`Render time for 500 nodes: ${renderTime.toFixed(2)}ms`);

    expect(renderTime).toBeLessThan(VIZ_CONFIG.performanceBudgets.renderTime500Nodes);
  });

  test('renders 1000 nodes within 5000ms', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await waitForIdle(page);

    const graphData = DataGenerator.generateGraph(1000, 0.02);

    const renderTime = await perfHelper.measureRenderTime(
      async () => await loadGraph(page, graphData),
      '[data-testid="force-graph"] .node'
    );

    console.log(`Render time for 1000 nodes: ${renderTime.toFixed(2)}ms`);

    expect(renderTime).toBeLessThan(VIZ_CONFIG.performanceBudgets.renderTime1000Nodes);
  });

  test('handles 2000 nodes without crashing', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await waitForIdle(page);

    const graphData = DataGenerator.generateGraph(2000, 0.01);

    // Should complete without throwing
    await expect(async () => {
      await loadGraph(page, graphData);
      await page.waitForSelector('[data-testid="force-graph"] .node', { timeout: 30000 });
    }).not.toThrow();

    // Verify nodes were rendered
    const nodeCount = await vizPage.getNodeCount();
    expect(nodeCount).toBe(2000);
  });

  test('scales linearly with node count', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await waitForIdle(page);

    const renderTimes: { nodes: number; time: number }[] = [];

    for (const nodeCount of [50, 100, 200, 400]) {
      const graphData = DataGenerator.generateGraph(nodeCount, 0.1);

      const renderTime = await perfHelper.measureRenderTime(
        async () => await loadGraph(page, graphData),
        '[data-testid="force-graph"] .node'
      );

      renderTimes.push({ nodes: nodeCount, time: renderTime });

      // Reset for next iteration
      await page.evaluate(() => {
        window.postMessage({ type: 'CLEAR_GRAPH' }, '*');
      });
      await page.waitForTimeout(100);
    }

    console.log('Render times by node count:');
    renderTimes.forEach(({ nodes, time }) => {
      console.log(`  ${nodes} nodes: ${time.toFixed(2)}ms`);
    });

    // Check that scaling is roughly linear (within 3x of linear)
    const ratio100to200 = renderTimes[2].time / renderTimes[1].time;
    const ratio200to400 = renderTimes[3].time / renderTimes[2].time;

    expect(ratio100to200).toBeLessThan(3);
    expect(ratio200to400).toBeLessThan(3);
  });
});

test.describe('ForceGraph Frame Rate', () => {
  test('maintains 30fps during drag interaction', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await waitForIdle(page);

    const graphData = DataGenerator.generateGraph(100, 0.1);
    await loadGraph(page, graphData);
    await vizPage.waitForSimulationStable();

    const frameRate = await perfHelper.measureFrameRate(async () => {
      const node = page.locator('[data-testid="force-graph"] .node').first();
      const box = await node.boundingBox();

      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();

        // Drag in a circle
        for (let i = 0; i < 36; i++) {
          const angle = (i * 10 * Math.PI) / 180;
          const x = box.x + 100 + Math.cos(angle) * 50;
          const y = box.y + 100 + Math.sin(angle) * 50;
          await page.mouse.move(x, y, { steps: 2 });
        }

        await page.mouse.up();
      }
    }, 3000);

    console.log(`Frame rate during drag: ${frameRate.toFixed(2)} fps`);

    expect(frameRate).toBeGreaterThanOrEqual(VIZ_CONFIG.minFrameRate);
  });

  test('maintains 30fps during zoom interaction', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await waitForIdle(page);

    const graphData = DataGenerator.generateGraph(100, 0.1);
    await loadGraph(page, graphData);
    await vizPage.waitForSimulationStable();

    const graph = vizPage.getForceGraph();
    await graph.hover();

    const frameRate = await perfHelper.measureFrameRate(async () => {
      // Zoom in and out repeatedly
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, -100);
        await page.waitForTimeout(100);
      }
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, 100);
        await page.waitForTimeout(100);
      }
    }, 3000);

    console.log(`Frame rate during zoom: ${frameRate.toFixed(2)} fps`);

    expect(frameRate).toBeGreaterThanOrEqual(VIZ_CONFIG.minFrameRate);
  });

  test('maintains 30fps with 500 nodes', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await waitForIdle(page);

    const graphData = DataGenerator.generateGraph(500, 0.03);
    await loadGraph(page, graphData);
    await vizPage.waitForSimulationStable();

    const frameRate = await perfHelper.measureFrameRate(async () => {
      const node = page.locator('[data-testid="force-graph"] .node').first();
      const box = await node.boundingBox();

      if (box) {
        await page.mouse.move(box.x, box.y);
        await page.mouse.down();

        for (let i = 0; i < 20; i++) {
          await page.mouse.move(box.x + i * 10, box.y + i * 5, { steps: 2 });
        }

        await page.mouse.up();
      }
    }, 3000);

    console.log(`Frame rate with 500 nodes: ${frameRate.toFixed(2)} fps`);

    expect(frameRate).toBeGreaterThanOrEqual(VIZ_CONFIG.minFrameRate);
  });

  test('targets 60fps on simple interactions', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await waitForIdle(page);

    const graphData = DataGenerator.generateGraph(50, 0.1);
    await loadGraph(page, graphData);
    await vizPage.waitForSimulationStable();

    const frameRate = await perfHelper.measureFrameRate(async () => {
      // Simple hover interactions
      const nodes = page.locator('[data-testid="force-graph"] .node');
      const count = await nodes.count();

      for (let i = 0; i < Math.min(count, 10); i++) {
        await nodes.nth(i).hover();
        await page.waitForTimeout(50);
      }
    }, 2000);

    console.log(`Frame rate on hover: ${frameRate.toFixed(2)} fps`);

    // Should be close to 60fps for simple interactions
    expect(frameRate).toBeGreaterThanOrEqual(45);
  });
});

test.describe('Memory Usage', () => {
  test('memory increase stays under 50MB for 100 nodes', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await waitForIdle(page);

    const initialMemory = await perfHelper.measureMemoryUsage();

    const graphData = DataGenerator.generateGraph(100, 0.1);
    await loadGraph(page, graphData);
    await vizPage.waitForSimulationStable();

    const finalMemory = await perfHelper.measureMemoryUsage();
    const memoryIncrease = finalMemory - initialMemory;

    console.log(`Memory increase for 100 nodes: ${memoryIncrease.toFixed(2)} MB`);

    expect(memoryIncrease).toBeLessThan(VIZ_CONFIG.performanceBudgets.memoryIncrease);
  });

  test('memory increase stays under 100MB for 500 nodes', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await waitForIdle(page);

    const initialMemory = await perfHelper.measureMemoryUsage();

    const graphData = DataGenerator.generateGraph(500, 0.03);
    await loadGraph(page, graphData);
    await vizPage.waitForSimulationStable();

    const finalMemory = await perfHelper.measureMemoryUsage();
    const memoryIncrease = finalMemory - initialMemory;

    console.log(`Memory increase for 500 nodes: ${memoryIncrease.toFixed(2)} MB`);

    expect(memoryIncrease).toBeLessThan(100);
  });

  test('memory is released when graph is cleared', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await waitForIdle(page);

    const initialMemory = await perfHelper.measureMemoryUsage();

    // Load large graph
    const graphData = DataGenerator.generateGraph(500, 0.03);
    await loadGraph(page, graphData);
    await vizPage.waitForSimulationStable();

    const loadedMemory = await perfHelper.measureMemoryUsage();

    // Clear graph
    await page.evaluate(() => {
      window.postMessage({ type: 'CLEAR_GRAPH' }, '*');
    });
    await page.waitForTimeout(500);

    // Force garbage collection if available
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });
    await page.waitForTimeout(500);

    const clearedMemory = await perfHelper.measureMemoryUsage();

    console.log(`Memory: initial=${initialMemory.toFixed(2)}MB, loaded=${loadedMemory.toFixed(2)}MB, cleared=${clearedMemory.toFixed(2)}MB`);

    // Memory should decrease significantly after clearing
    const memoryRecovered = loadedMemory - clearedMemory;
    const recoveryRatio = memoryRecovered / (loadedMemory - initialMemory);

    expect(recoveryRatio).toBeGreaterThan(0.5); // At least 50% memory recovered
  });

  test('no memory leak during repeated updates', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await waitForIdle(page);

    const memoryReadings: number[] = [];

    for (let i = 0; i < 10; i++) {
      const graphData = DataGenerator.generateGraph(100, 0.1);
      await loadGraph(page, graphData);
      await page.waitForTimeout(200);

      const memory = await perfHelper.measureMemoryUsage();
      memoryReadings.push(memory);
    }

    console.log('Memory readings over updates:', memoryReadings.map(m => m.toFixed(2)));

    // Memory shouldn't grow unboundedly
    const growthRate = (memoryReadings[9] - memoryReadings[0]) / memoryReadings[0];

    expect(growthRate).toBeLessThan(0.5); // Less than 50% growth over 10 iterations
  });
});

test.describe('Interaction Latency', () => {
  test('node click response under 100ms', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await waitForIdle(page);

    const graphData = DataGenerator.generateGraph(100, 0.1);
    await loadGraph(page, graphData);
    await vizPage.waitForSimulationStable();

    const latency = await perfHelper.measureInteractionLatency(
      async () => {
        const node = page.locator('[data-testid="force-graph"] .node').first();
        await node.click();
      },
      '[data-testid="node-tooltip"], [data-testid="node-detail-popover"]'
    );

    console.log(`Click latency: ${latency}ms`);

    expect(latency).toBeLessThan(VIZ_CONFIG.performanceBudgets.interactionLatency);
  });

  test('tooltip display under 50ms', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await waitForIdle(page);

    const graphData = DataGenerator.generateGraph(100, 0.1);
    await loadGraph(page, graphData);
    await vizPage.waitForSimulationStable();

    const node = page.locator('[data-testid="force-graph"] .node').first();
    const box = await node.boundingBox();

    const start = Date.now();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    }
    await page.waitForSelector('[data-testid="node-tooltip"]');
    const latency = Date.now() - start;

    console.log(`Tooltip latency: ${latency}ms`);

    expect(latency).toBeLessThan(50);
  });

  test('zoom response under 16ms (one frame)', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await waitForIdle(page);

    const graphData = DataGenerator.generateGraph(100, 0.1);
    await loadGraph(page, graphData);
    await vizPage.waitForSimulationStable();

    const graph = vizPage.getForceGraph();
    await graph.hover();

    // Measure time for zoom to be applied
    const zoomTime = await page.evaluate(async () => {
      return new Promise<number>((resolve) => {
        const svg = document.querySelector('[data-testid="force-graph"] svg');
        const start = performance.now();

        const observer = new MutationObserver(() => {
          observer.disconnect();
          resolve(performance.now() - start);
        });

        observer.observe(svg!, { attributes: true, subtree: true });

        // Trigger zoom
        const event = new WheelEvent('wheel', { deltaY: -100 });
        svg?.dispatchEvent(event);
      });
    });

    console.log(`Zoom response time: ${zoomTime.toFixed(2)}ms`);

    // Should respond within one frame (16.67ms at 60fps)
    expect(zoomTime).toBeLessThan(20);
  });
});

test.describe('Chart Performance', () => {
  test('LineChart renders 1000 data points under 500ms', async ({ page }) => {
    await vizPage.goto('/viz-demo/line-chart');
    await waitForIdle(page);

    const timeSeriesData = DataGenerator.generateTimeSeries(1000, 1);

    const renderTime = await perfHelper.measureRenderTime(
      async () => {
        await page.evaluate((data) => {
          window.postMessage({ type: 'SET_CHART_DATA', data }, '*');
        }, timeSeriesData);
      },
      '[data-testid="line-chart"] path.line'
    );

    console.log(`LineChart render time (1000 points): ${renderTime.toFixed(2)}ms`);

    expect(renderTime).toBeLessThan(500);
  });

  test('BarChart renders 100 categories under 300ms', async ({ page }) => {
    await vizPage.goto('/viz-demo/bar-chart');
    await waitForIdle(page);

    const categoryData = DataGenerator.generateCategories(100);

    const renderTime = await perfHelper.measureRenderTime(
      async () => {
        await page.evaluate((data) => {
          window.postMessage({ type: 'SET_CHART_DATA', data }, '*');
        }, categoryData);
      },
      '[data-testid="bar-chart"] .bar'
    );

    console.log(`BarChart render time (100 categories): ${renderTime.toFixed(2)}ms`);

    expect(renderTime).toBeLessThan(300);
  });

  test('AreaChart handles 5000 points under 1000ms', async ({ page }) => {
    await vizPage.goto('/viz-demo/area-chart');
    await waitForIdle(page);

    const timeSeriesData = DataGenerator.generateTimeSeries(5000, 3);

    const renderTime = await perfHelper.measureRenderTime(
      async () => {
        await page.evaluate((data) => {
          window.postMessage({ type: 'SET_CHART_DATA', data }, '*');
        }, timeSeriesData);
      },
      '[data-testid="area-chart"] path.area'
    );

    console.log(`AreaChart render time (5000 points): ${renderTime.toFixed(2)}ms`);

    expect(renderTime).toBeLessThan(1000);
  });
});

test.describe('Comprehensive Performance Metrics', () => {
  test('collects and validates all metrics for 100 nodes', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await waitForIdle(page);

    const graphData = DataGenerator.generateGraph(100, 0.1);

    const metrics = await perfHelper.collectMetrics(graphData, async () => {
      await loadGraph(page, graphData);
      await vizPage.waitForSimulationStable();
    });

    console.log('Performance metrics (100 nodes):');
    console.log(`  Render time: ${metrics.renderTime.toFixed(2)}ms`);
    console.log(`  Frame rate: ${metrics.frameRate.toFixed(2)} fps`);
    console.log(`  Memory usage: ${metrics.memoryUsage.toFixed(2)} MB`);
    console.log(`  Interaction latency: ${metrics.interactionLatency}ms`);

    // Validate all metrics are within budget
    perfHelper.assertWithinBudget(metrics);
  });

  test('collects and validates all metrics for 500 nodes', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await waitForIdle(page);

    const graphData = DataGenerator.generateGraph(500, 0.03);

    const metrics = await perfHelper.collectMetrics(graphData, async () => {
      await loadGraph(page, graphData);
      await vizPage.waitForSimulationStable();
    });

    console.log('Performance metrics (500 nodes):');
    console.log(`  Render time: ${metrics.renderTime.toFixed(2)}ms`);
    console.log(`  Frame rate: ${metrics.frameRate.toFixed(2)} fps`);
    console.log(`  Memory usage: ${metrics.memoryUsage.toFixed(2)} MB`);
    console.log(`  Interaction latency: ${metrics.interactionLatency}ms`);

    // Validate render time and frame rate
    expect(metrics.renderTime).toBeLessThan(VIZ_CONFIG.performanceBudgets.renderTime500Nodes);
    expect(metrics.frameRate).toBeGreaterThanOrEqual(VIZ_CONFIG.minFrameRate);
  });

  test('generates performance report', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await waitForIdle(page);

    const nodeCounts = [50, 100, 200, 500];
    const report: PerformanceMetrics[] = [];

    for (const count of nodeCounts) {
      const graphData = DataGenerator.generateGraph(count, 0.1);

      const metrics = await perfHelper.collectMetrics(graphData, async () => {
        await loadGraph(page, graphData);
        await vizPage.waitForSimulationStable();
      });

      report.push(metrics);

      // Reset for next iteration
      await page.evaluate(() => {
        window.postMessage({ type: 'CLEAR_GRAPH' }, '*');
      });
      await page.waitForTimeout(200);
    }

    console.log('\n=== PERFORMANCE REPORT ===\n');
    console.log('Nodes | Render Time | Frame Rate | Memory | Latency');
    console.log('------|-------------|------------|--------|--------');
    report.forEach((m) => {
      console.log(
        `${m.nodeCount.toString().padStart(5)} | ${m.renderTime.toFixed(0).padStart(9)}ms | ${m.frameRate.toFixed(1).padStart(8)}fps | ${m.memoryUsage.toFixed(1).padStart(5)}MB | ${m.interactionLatency.toString().padStart(5)}ms`
      );
    });
    console.log('\n=========================\n');

    // All entries should pass basic thresholds
    report.forEach((m) => {
      expect(m.frameRate).toBeGreaterThanOrEqual(25); // Slightly relaxed for larger graphs
    });
  });
});

test.describe('Performance Regression Detection', () => {
  test('stores performance baseline', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await waitForIdle(page);

    const graphData = DataGenerator.generateGraph(100, 0.1);

    const metrics = await perfHelper.collectMetrics(graphData, async () => {
      await loadGraph(page, graphData);
      await vizPage.waitForSimulationStable();
    });

    // In a real CI environment, this would be stored as a baseline
    // For now, we just verify we can collect metrics
    expect(metrics.renderTime).toBeGreaterThan(0);
    expect(metrics.frameRate).toBeGreaterThan(0);

    // Save as test artifact
    await page.evaluate((m) => {
      console.log('PERFORMANCE_BASELINE:', JSON.stringify(m));
    }, metrics);
  });

  test('performance should not regress more than 20%', async ({ page }) => {
    // This test would compare against stored baseline in CI
    // For demonstration, we use hardcoded baseline values
    const baseline = {
      renderTime: 300,
      frameRate: 55,
      memoryUsage: 30,
      interactionLatency: 80,
    };

    await vizPage.goto('/viz-demo/force-graph');
    await waitForIdle(page);

    const graphData = DataGenerator.generateGraph(100, 0.1);

    const metrics = await perfHelper.collectMetrics(graphData, async () => {
      await loadGraph(page, graphData);
      await vizPage.waitForSimulationStable();
    });

    // Check for regression (20% tolerance)
    const renderTimeRegression = (metrics.renderTime - baseline.renderTime) / baseline.renderTime;
    const frameRateRegression = (baseline.frameRate - metrics.frameRate) / baseline.frameRate;

    console.log(`Render time change: ${(renderTimeRegression * 100).toFixed(1)}%`);
    console.log(`Frame rate change: ${(frameRateRegression * 100).toFixed(1)}%`);

    // Allow 20% regression
    expect(renderTimeRegression).toBeLessThan(0.2);
    expect(frameRateRegression).toBeLessThan(0.2);
  });
});
