/**
 * TASK-088: Visual Regression Tests for D3 Visualizations
 *
 * This test suite captures screenshots of visualization components
 * and compares them against baseline snapshots to detect visual regressions.
 *
 * Components tested:
 * - ForceGraph: Interactive node-link diagram
 * - LineChart: Time series visualization
 * - BarChart: Categorical data visualization
 * - AreaChart: Stacked area visualization
 *
 * Baselines are stored in tests/e2e/visual/snapshots/
 */

import { test, expect, type Page } from '@playwright/test';
import {
  VizPage,
  ScreenshotHelper,
  DataGenerator,
  VIZ_CONFIG,
  disableAnimations,
  waitForIdle,
} from '../utils/viz-helpers';

// Test configuration
test.describe.configure({ mode: 'parallel' });

// Shared fixtures
let vizPage: VizPage;
let screenshotHelper: ScreenshotHelper;

test.beforeEach(async ({ page }) => {
  vizPage = new VizPage(page);
  screenshotHelper = new ScreenshotHelper(page);

  // Disable animations for consistent screenshots
  await disableAnimations(page);
});

test.describe('ForceGraph Visual Regression', () => {
  test('matches baseline with default configuration', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await vizPage.waitForSimulationStable();

    await expect(vizPage.getForceGraph()).toHaveScreenshot('force-graph-default.png', {
      maxDiffPixelRatio: 0.02,
      threshold: 0.3,
      animations: 'disabled',
    });
  });

  test('matches baseline with 50 nodes', async ({ page }) => {
    const graphData = DataGenerator.generateGraph(50, 0.1);

    await vizPage.goto('/viz-demo/force-graph');
    await page.evaluate((data) => {
      window.postMessage({ type: 'SET_GRAPH_DATA', data }, '*');
    }, graphData);

    await vizPage.waitForSimulationStable();

    await expect(vizPage.getForceGraph()).toHaveScreenshot('force-graph-50-nodes.png', {
      maxDiffPixelRatio: 0.05, // Allow more variance for random layouts
      threshold: 0.3,
      animations: 'disabled',
    });
  });

  test('matches baseline with node highlighting', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await vizPage.waitForSimulationStable();

    // Hover over a node to trigger highlighting
    const node = page.locator('[data-testid="force-graph"] .node').first();
    await node.hover();
    await page.waitForTimeout(300); // Wait for highlight animation

    await expect(vizPage.getForceGraph()).toHaveScreenshot('force-graph-highlighted.png', {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });

  test('matches baseline with node selection', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await vizPage.waitForSimulationStable();

    // Click a node to select it
    const node = page.locator('[data-testid="force-graph"] .node').first();
    await node.click();
    await page.waitForTimeout(300);

    await expect(vizPage.getForceGraph()).toHaveScreenshot('force-graph-selected.png', {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });

  test('matches baseline after zoom', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await vizPage.waitForSimulationStable();

    // Zoom in using mouse wheel
    const graph = vizPage.getForceGraph();
    await graph.hover();
    await page.mouse.wheel(0, -200); // Scroll up to zoom in
    await page.waitForTimeout(500);

    await expect(graph).toHaveScreenshot('force-graph-zoomed.png', {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });

  test('matches baseline after pan', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await vizPage.waitForSimulationStable();

    // Pan by dragging the background
    const graph = vizPage.getForceGraph();
    const box = await graph.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 50, {
        steps: 10,
      });
      await page.mouse.up();
    }
    await page.waitForTimeout(300);

    await expect(graph).toHaveScreenshot('force-graph-panned.png', {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });

  test('matches baseline in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await vizPage.goto('/viz-demo/force-graph');
    await vizPage.waitForSimulationStable();

    await expect(vizPage.getForceGraph()).toHaveScreenshot('force-graph-dark-mode.png', {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });

  test('matches baseline with group coloring', async ({ page }) => {
    const graphData = DataGenerator.generateGraph(30, 0.15);

    await vizPage.goto('/viz-demo/force-graph?colorBy=group');
    await page.evaluate((data) => {
      window.postMessage({ type: 'SET_GRAPH_DATA', data }, '*');
    }, graphData);

    await vizPage.waitForSimulationStable();

    await expect(vizPage.getForceGraph()).toHaveScreenshot('force-graph-grouped.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });
});

test.describe('LineChart Visual Regression', () => {
  test('matches baseline with single series', async ({ page }) => {
    await vizPage.goto('/viz-demo/line-chart');
    await waitForIdle(page);

    await expect(vizPage.getLineChart()).toHaveScreenshot('line-chart-single.png', {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });

  test('matches baseline with multiple series', async ({ page }) => {
    const timeSeriesData = DataGenerator.generateTimeSeries(30, 3);

    await vizPage.goto('/viz-demo/line-chart');
    await page.evaluate((data) => {
      window.postMessage({ type: 'SET_CHART_DATA', data }, '*');
    }, timeSeriesData);

    await waitForIdle(page);

    await expect(vizPage.getLineChart()).toHaveScreenshot('line-chart-multi-series.png', {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });

  test('matches baseline with tooltips visible', async ({ page }) => {
    await vizPage.goto('/viz-demo/line-chart');
    await waitForIdle(page);

    // Hover to show tooltip
    const chart = vizPage.getLineChart();
    const box = await chart.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    }
    await page.waitForTimeout(300);

    await expect(chart).toHaveScreenshot('line-chart-tooltip.png', {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });

  test('matches baseline with legend', async ({ page }) => {
    const timeSeriesData = DataGenerator.generateTimeSeries(30, 3);

    await vizPage.goto('/viz-demo/line-chart?showLegend=true');
    await page.evaluate((data) => {
      window.postMessage({ type: 'SET_CHART_DATA', data }, '*');
    }, timeSeriesData);

    await waitForIdle(page);

    await expect(vizPage.getLineChart()).toHaveScreenshot('line-chart-legend.png', {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });

  test('matches baseline in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await vizPage.goto('/viz-demo/line-chart');
    await waitForIdle(page);

    await expect(vizPage.getLineChart()).toHaveScreenshot('line-chart-dark-mode.png', {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });
});

test.describe('BarChart Visual Regression', () => {
  test('matches baseline with default data', async ({ page }) => {
    await vizPage.goto('/viz-demo/bar-chart');
    await waitForIdle(page);

    await expect(vizPage.getBarChart()).toHaveScreenshot('bar-chart-default.png', {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });

  test('matches baseline with many categories', async ({ page }) => {
    const categoryData = DataGenerator.generateCategories(15);

    await vizPage.goto('/viz-demo/bar-chart');
    await page.evaluate((data) => {
      window.postMessage({ type: 'SET_CHART_DATA', data }, '*');
    }, categoryData);

    await waitForIdle(page);

    await expect(vizPage.getBarChart()).toHaveScreenshot('bar-chart-many-categories.png', {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });

  test('matches baseline with horizontal orientation', async ({ page }) => {
    await vizPage.goto('/viz-demo/bar-chart?orientation=horizontal');
    await waitForIdle(page);

    await expect(vizPage.getBarChart()).toHaveScreenshot('bar-chart-horizontal.png', {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });

  test('matches baseline with stacked bars', async ({ page }) => {
    await vizPage.goto('/viz-demo/bar-chart?stacked=true');
    await waitForIdle(page);

    await expect(vizPage.getBarChart()).toHaveScreenshot('bar-chart-stacked.png', {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });

  test('matches baseline with bar highlighting', async ({ page }) => {
    await vizPage.goto('/viz-demo/bar-chart');
    await waitForIdle(page);

    // Hover over a bar
    const bar = page.locator('[data-testid="bar-chart"] .bar').first();
    await bar.hover();
    await page.waitForTimeout(200);

    await expect(vizPage.getBarChart()).toHaveScreenshot('bar-chart-highlighted.png', {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });

  test('matches baseline in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await vizPage.goto('/viz-demo/bar-chart');
    await waitForIdle(page);

    await expect(vizPage.getBarChart()).toHaveScreenshot('bar-chart-dark-mode.png', {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });
});

test.describe('AreaChart Visual Regression', () => {
  test('matches baseline with default data', async ({ page }) => {
    await vizPage.goto('/viz-demo/area-chart');
    await waitForIdle(page);

    await expect(vizPage.getAreaChart()).toHaveScreenshot('area-chart-default.png', {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });

  test('matches baseline with stacked areas', async ({ page }) => {
    const timeSeriesData = DataGenerator.generateTimeSeries(30, 4);

    await vizPage.goto('/viz-demo/area-chart?stacked=true');
    await page.evaluate((data) => {
      window.postMessage({ type: 'SET_CHART_DATA', data }, '*');
    }, timeSeriesData);

    await waitForIdle(page);

    await expect(vizPage.getAreaChart()).toHaveScreenshot('area-chart-stacked.png', {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });

  test('matches baseline with gradient fill', async ({ page }) => {
    await vizPage.goto('/viz-demo/area-chart?gradient=true');
    await waitForIdle(page);

    await expect(vizPage.getAreaChart()).toHaveScreenshot('area-chart-gradient.png', {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });

  test('matches baseline in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await vizPage.goto('/viz-demo/area-chart');
    await waitForIdle(page);

    await expect(vizPage.getAreaChart()).toHaveScreenshot('area-chart-dark-mode.png', {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });
});

test.describe('Responsive Visual Regression', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'wide', width: 1920, height: 1080 },
  ];

  for (const viewport of viewports) {
    test(`ForceGraph matches baseline at ${viewport.name} size`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await vizPage.goto('/viz-demo/force-graph');
      await vizPage.waitForSimulationStable();

      await expect(vizPage.getForceGraph()).toHaveScreenshot(
        `force-graph-${viewport.name}.png`,
        {
          maxDiffPixelRatio: 0.03,
          animations: 'disabled',
        }
      );
    });

    test(`LineChart matches baseline at ${viewport.name} size`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await vizPage.goto('/viz-demo/line-chart');
      await waitForIdle(page);

      await expect(vizPage.getLineChart()).toHaveScreenshot(
        `line-chart-${viewport.name}.png`,
        {
          maxDiffPixelRatio: 0.02,
          animations: 'disabled',
        }
      );
    });

    test(`BarChart matches baseline at ${viewport.name} size`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await vizPage.goto('/viz-demo/bar-chart');
      await waitForIdle(page);

      await expect(vizPage.getBarChart()).toHaveScreenshot(
        `bar-chart-${viewport.name}.png`,
        {
          maxDiffPixelRatio: 0.02,
          animations: 'disabled',
        }
      );
    });
  }
});

test.describe('Full Page Visual Regression', () => {
  test('visualization dashboard matches baseline', async ({ page }) => {
    await vizPage.goto('/viz-demo');
    await waitForIdle(page);

    // Wait for all charts to render
    await page.waitForSelector('[data-testid="force-graph"]');
    await page.waitForSelector('[data-testid="line-chart"]');
    await page.waitForSelector('[data-testid="bar-chart"]');
    await page.waitForSelector('[data-testid="area-chart"]');

    await expect(page).toHaveScreenshot('viz-dashboard-fullpage.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });

  test('visualization dashboard matches baseline in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await vizPage.goto('/viz-demo');
    await waitForIdle(page);

    await page.waitForSelector('[data-testid="force-graph"]');
    await page.waitForSelector('[data-testid="line-chart"]');

    await expect(page).toHaveScreenshot('viz-dashboard-dark-fullpage.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });
});
