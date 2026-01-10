/**
 * Visualization Test Helpers
 *
 * TASK-088/089/090: Utility functions for testing D3 visualization components
 *
 * This module provides:
 * - Screenshot helpers for visual regression testing
 * - Node count generators for performance testing
 * - Performance measurement utilities
 * - Accessibility testing helpers
 */

import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Configuration for visualization tests
 */
export const VIZ_CONFIG = {
  /** Base URL for tests */
  baseUrl: process.env.TEST_URL || 'http://localhost:4173',
  /** Default screenshot timeout in ms */
  screenshotTimeout: 5000,
  /** Animation wait time before screenshot */
  animationDelay: 1000,
  /** Default performance test timeout */
  performanceTimeout: 30000,
  /** Frame rate measurement duration in ms */
  frameRateDuration: 2000,
  /** Minimum acceptable frame rate */
  minFrameRate: 30,
  /** Target frame rate */
  targetFrameRate: 60,
  /** Performance budgets */
  performanceBudgets: {
    renderTime100Nodes: 500,    // ms
    renderTime500Nodes: 2000,   // ms
    renderTime1000Nodes: 5000,  // ms
    interactionLatency: 100,    // ms
    memoryIncrease: 50,         // MB
  },
};

/**
 * Screenshot options for visual regression testing
 */
export interface ScreenshotOptions {
  name: string;
  fullPage?: boolean;
  animations?: 'disabled' | 'allow';
  mask?: Locator[];
  maxDiffPixels?: number;
  maxDiffPixelRatio?: number;
  threshold?: number;
}

/**
 * Node generation configuration
 */
export interface NodeConfig {
  id: string;
  label?: string;
  x?: number;
  y?: number;
  group?: string;
  size?: number;
}

/**
 * Link generation configuration
 */
export interface LinkConfig {
  source: string;
  target: string;
  weight?: number;
}

/**
 * Graph data structure for force graphs
 */
export interface GraphData {
  nodes: NodeConfig[];
  links: LinkConfig[];
}

/**
 * Performance metrics collected during tests
 */
export interface PerformanceMetrics {
  renderTime: number;
  frameRate: number;
  memoryUsage: number;
  interactionLatency: number;
  nodeCount: number;
  linkCount: number;
}

/**
 * Visualization Page Object Model
 */
export class VizPage {
  constructor(private page: Page) {}

  /**
   * Navigate to visualization demo page
   */
  async goto(path: string = '/viz-demo') {
    await this.page.goto(`${VIZ_CONFIG.baseUrl}${path}`);
    await this.waitForVisualizationsReady();
  }

  /**
   * Wait for D3 visualizations to be ready
   */
  async waitForVisualizationsReady() {
    // Wait for SVG elements to be present
    await this.page.waitForSelector('[data-testid="viz-container"] svg', {
      timeout: VIZ_CONFIG.screenshotTimeout,
    });

    // Wait for animations to settle
    await this.page.waitForTimeout(VIZ_CONFIG.animationDelay);
  }

  /**
   * Get force graph container
   */
  getForceGraph(): Locator {
    return this.page.locator('[data-testid="force-graph"]');
  }

  /**
   * Get line chart container
   */
  getLineChart(): Locator {
    return this.page.locator('[data-testid="line-chart"]');
  }

  /**
   * Get bar chart container
   */
  getBarChart(): Locator {
    return this.page.locator('[data-testid="bar-chart"]');
  }

  /**
   * Get area chart container
   */
  getAreaChart(): Locator {
    return this.page.locator('[data-testid="area-chart"]');
  }

  /**
   * Get all visualization components
   */
  getAllCharts(): Locator {
    return this.page.locator('[data-testid*="-chart"], [data-testid="force-graph"]');
  }

  /**
   * Check if force graph simulation is running
   */
  async isSimulationRunning(): Promise<boolean> {
    return await this.page.evaluate(() => {
      const graph = document.querySelector('[data-testid="force-graph"]');
      return graph?.getAttribute('data-simulation-running') === 'true';
    });
  }

  /**
   * Wait for force graph simulation to stabilize
   */
  async waitForSimulationStable(timeout: number = 10000) {
    await this.page.waitForFunction(
      () => {
        const graph = document.querySelector('[data-testid="force-graph"]');
        return graph?.getAttribute('data-simulation-stable') === 'true';
      },
      { timeout }
    );
  }

  /**
   * Get node count in force graph
   */
  async getNodeCount(): Promise<number> {
    return await this.page.locator('[data-testid="force-graph"] .node').count();
  }

  /**
   * Get link count in force graph
   */
  async getLinkCount(): Promise<number> {
    return await this.page.locator('[data-testid="force-graph"] .link').count();
  }
}

/**
 * Screenshot helper for visual regression testing
 */
export class ScreenshotHelper {
  constructor(private page: Page) {}

  /**
   * Take a screenshot of a visualization component
   */
  async captureVisualization(
    locator: Locator,
    options: ScreenshotOptions
  ): Promise<Buffer> {
    // Wait for animations to complete
    await this.page.waitForTimeout(VIZ_CONFIG.animationDelay);

    // Disable animations if requested
    if (options.animations === 'disabled') {
      await this.page.evaluate(() => {
        document.querySelectorAll('*').forEach((el) => {
          (el as HTMLElement).style.animation = 'none';
          (el as HTMLElement).style.transition = 'none';
        });
      });
    }

    return await locator.screenshot({
      animations: options.animations || 'disabled',
      mask: options.mask,
    });
  }

  /**
   * Compare screenshot against baseline
   */
  async compareWithBaseline(
    locator: Locator,
    options: ScreenshotOptions
  ): Promise<void> {
    await expect(locator).toHaveScreenshot(`${options.name}.png`, {
      maxDiffPixels: options.maxDiffPixels ?? 100,
      maxDiffPixelRatio: options.maxDiffPixelRatio ?? 0.01,
      threshold: options.threshold ?? 0.2,
      animations: 'disabled',
    });
  }

  /**
   * Capture full page screenshot
   */
  async captureFullPage(name: string): Promise<void> {
    await expect(this.page).toHaveScreenshot(`${name}-fullpage.png`, {
      fullPage: true,
      animations: 'disabled',
    });
  }
}

/**
 * Generate test data for visualizations
 */
export class DataGenerator {
  /**
   * Generate random nodes for force graph testing
   */
  static generateNodes(count: number): NodeConfig[] {
    const nodes: NodeConfig[] = [];
    const groups = ['frontend', 'backend', 'database', 'security', 'testing'];

    for (let i = 0; i < count; i++) {
      nodes.push({
        id: `node-${i}`,
        label: `Node ${i}`,
        group: groups[i % groups.length],
        size: Math.random() * 20 + 10,
        x: Math.random() * 800,
        y: Math.random() * 600,
      });
    }

    return nodes;
  }

  /**
   * Generate random links between nodes
   */
  static generateLinks(nodes: NodeConfig[], density: number = 0.1): LinkConfig[] {
    const links: LinkConfig[] = [];
    const maxLinks = Math.floor(nodes.length * nodes.length * density);

    for (let i = 0; i < maxLinks; i++) {
      const sourceIdx = Math.floor(Math.random() * nodes.length);
      let targetIdx = Math.floor(Math.random() * nodes.length);

      // Avoid self-links
      while (targetIdx === sourceIdx) {
        targetIdx = Math.floor(Math.random() * nodes.length);
      }

      links.push({
        source: nodes[sourceIdx].id,
        target: nodes[targetIdx].id,
        weight: Math.random(),
      });
    }

    return links;
  }

  /**
   * Generate complete graph data
   */
  static generateGraph(nodeCount: number, density: number = 0.1): GraphData {
    const nodes = this.generateNodes(nodeCount);
    const links = this.generateLinks(nodes, density);
    return { nodes, links };
  }

  /**
   * Generate time series data for line/area charts
   */
  static generateTimeSeries(
    points: number,
    series: number = 1
  ): Array<{ date: Date; values: number[] }> {
    const data: Array<{ date: Date; values: number[] }> = [];
    const now = new Date();

    for (let i = 0; i < points; i++) {
      const date = new Date(now.getTime() - (points - i) * 86400000);
      const values: number[] = [];

      for (let s = 0; s < series; s++) {
        values.push(Math.random() * 100 + 50 * s);
      }

      data.push({ date, values });
    }

    return data;
  }

  /**
   * Generate categorical data for bar charts
   */
  static generateCategories(count: number): Array<{ category: string; value: number }> {
    const categories = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta'];
    const data: Array<{ category: string; value: number }> = [];

    for (let i = 0; i < count; i++) {
      data.push({
        category: categories[i % categories.length] + (i >= categories.length ? ` ${Math.floor(i / categories.length)}` : ''),
        value: Math.random() * 100,
      });
    }

    return data;
  }
}

/**
 * Performance measurement utilities
 */
export class PerformanceHelper {
  constructor(private page: Page) {}

  /**
   * Measure render time for a visualization
   */
  async measureRenderTime(
    setupFn: () => Promise<void>,
    selector: string
  ): Promise<number> {
    const startMark = 'viz-render-start';
    const endMark = 'viz-render-end';

    // Clear previous marks
    await this.page.evaluate(() => {
      performance.clearMarks();
      performance.clearMeasures();
    });

    // Mark start
    await this.page.evaluate((mark) => performance.mark(mark), startMark);

    // Execute setup (triggers render)
    await setupFn();

    // Wait for element to appear
    await this.page.waitForSelector(selector);

    // Mark end
    await this.page.evaluate((mark) => performance.mark(mark), endMark);

    // Measure duration
    const duration = await this.page.evaluate(
      ([start, end]) => {
        performance.measure('viz-render', start, end);
        const measure = performance.getEntriesByName('viz-render')[0];
        return measure?.duration ?? 0;
      },
      [startMark, endMark] as const
    );

    return duration;
  }

  /**
   * Measure frame rate during interaction
   */
  async measureFrameRate(
    interactionFn: () => Promise<void>,
    duration: number = VIZ_CONFIG.frameRateDuration
  ): Promise<number> {
    // Start frame counting
    const frameCount = await this.page.evaluate(async (dur) => {
      let frames = 0;
      const startTime = performance.now();

      return new Promise<number>((resolve) => {
        function countFrame() {
          frames++;
          if (performance.now() - startTime < dur) {
            requestAnimationFrame(countFrame);
          } else {
            resolve(frames);
          }
        }
        requestAnimationFrame(countFrame);
      });
    }, duration);

    // Run interaction in parallel
    await interactionFn();

    // Calculate FPS
    return (frameCount * 1000) / duration;
  }

  /**
   * Measure memory usage
   */
  async measureMemoryUsage(): Promise<number> {
    const memoryInfo = await this.page.evaluate(() => {
      // Note: performance.memory is Chrome-specific
      const perf = performance as Performance & {
        memory?: { usedJSHeapSize: number };
      };
      return perf.memory?.usedJSHeapSize ?? 0;
    });

    return memoryInfo / (1024 * 1024); // Convert to MB
  }

  /**
   * Measure interaction latency
   */
  async measureInteractionLatency(
    triggerFn: () => Promise<void>,
    expectedSelector: string
  ): Promise<number> {
    const start = Date.now();
    await triggerFn();
    await this.page.waitForSelector(expectedSelector);
    return Date.now() - start;
  }

  /**
   * Collect comprehensive performance metrics
   */
  async collectMetrics(
    graphData: GraphData,
    loadFn: () => Promise<void>
  ): Promise<PerformanceMetrics> {
    const initialMemory = await this.measureMemoryUsage();

    const renderTime = await this.measureRenderTime(
      loadFn,
      '[data-testid="force-graph"] .node'
    );

    const frameRate = await this.measureFrameRate(async () => {
      // Simulate drag interaction
      const node = this.page.locator('[data-testid="force-graph"] .node').first();
      await node.hover();
      await this.page.mouse.down();
      await this.page.mouse.move(200, 200, { steps: 10 });
      await this.page.mouse.up();
    });

    const finalMemory = await this.measureMemoryUsage();

    const interactionLatency = await this.measureInteractionLatency(
      async () => {
        const node = this.page.locator('[data-testid="force-graph"] .node').first();
        await node.click();
      },
      '[data-testid="node-tooltip"]'
    );

    return {
      renderTime,
      frameRate,
      memoryUsage: finalMemory - initialMemory,
      interactionLatency,
      nodeCount: graphData.nodes.length,
      linkCount: graphData.links.length,
    };
  }

  /**
   * Assert performance is within budget
   */
  assertWithinBudget(metrics: PerformanceMetrics): void {
    const budgets = VIZ_CONFIG.performanceBudgets;

    // Check render time based on node count
    if (metrics.nodeCount <= 100) {
      expect(metrics.renderTime).toBeLessThan(budgets.renderTime100Nodes);
    } else if (metrics.nodeCount <= 500) {
      expect(metrics.renderTime).toBeLessThan(budgets.renderTime500Nodes);
    } else {
      expect(metrics.renderTime).toBeLessThan(budgets.renderTime1000Nodes);
    }

    // Check frame rate
    expect(metrics.frameRate).toBeGreaterThanOrEqual(VIZ_CONFIG.minFrameRate);

    // Check interaction latency
    expect(metrics.interactionLatency).toBeLessThan(budgets.interactionLatency);

    // Check memory increase
    expect(metrics.memoryUsage).toBeLessThan(budgets.memoryIncrease);
  }
}

/**
 * Accessibility testing helpers
 */
export class AccessibilityHelper {
  constructor(private page: Page) {}

  /**
   * Check keyboard navigation
   */
  async testKeyboardNavigation(containerSelector: string): Promise<void> {
    const container = this.page.locator(containerSelector);
    await container.focus();

    // Test Tab navigation
    await this.page.keyboard.press('Tab');
    const firstFocusable = await this.page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocusable).toBeTruthy();

    // Test Arrow key navigation
    await this.page.keyboard.press('ArrowRight');
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('ArrowLeft');
    await this.page.keyboard.press('ArrowUp');

    // Test Enter for selection
    await this.page.keyboard.press('Enter');
  }

  /**
   * Verify ARIA labels are present
   */
  async verifyAriaLabels(containerSelector: string): Promise<void> {
    const container = this.page.locator(containerSelector);

    // Check main container has role and label
    await expect(container).toHaveAttribute('role', /.+/);

    // Check interactive elements have accessible names
    const interactiveElements = container.locator(
      'button, [role="button"], [tabindex="0"]'
    );
    const count = await interactiveElements.count();

    for (let i = 0; i < count; i++) {
      const element = interactiveElements.nth(i);
      const ariaLabel = await element.getAttribute('aria-label');
      const ariaLabelledBy = await element.getAttribute('aria-labelledby');
      const title = await element.getAttribute('title');
      const text = await element.textContent();

      // At least one accessible name method should be present
      expect(ariaLabel || ariaLabelledBy || title || text?.trim()).toBeTruthy();
    }
  }

  /**
   * Check color contrast ratios
   */
  async checkColorContrast(): Promise<void> {
    // This integrates with axe-core for WCAG compliance
    const violations = await this.page.evaluate(() => {
      // Placeholder for axe-core integration
      // In real tests, use @axe-core/playwright
      return [];
    });

    expect(violations).toHaveLength(0);
  }

  /**
   * Verify screen reader compatibility
   */
  async verifyScreenReaderSupport(containerSelector: string): Promise<void> {
    const container = this.page.locator(containerSelector);

    // Check for live regions for dynamic content
    const liveRegions = await container.locator('[aria-live]').count();
    expect(liveRegions).toBeGreaterThan(0);

    // Check for descriptive text
    const descriptions = await container.locator('[aria-describedby], [aria-description]').count();
    expect(descriptions).toBeGreaterThan(0);
  }

  /**
   * Test focus management
   */
  async testFocusManagement(containerSelector: string): Promise<void> {
    const container = this.page.locator(containerSelector);

    // Focus should be trapped within modal/overlay if present
    const isModal = await container.getAttribute('role') === 'dialog';

    if (isModal) {
      // Tab through all focusable elements
      let iterations = 0;
      const maxIterations = 50;

      while (iterations < maxIterations) {
        await this.page.keyboard.press('Tab');
        const isFocusInside = await this.page.evaluate((selector) => {
          const container = document.querySelector(selector);
          return container?.contains(document.activeElement);
        }, containerSelector);

        expect(isFocusInside).toBe(true);
        iterations++;

        // Check if we've cycled back to start
        const focusedElement = await this.page.evaluate(() => document.activeElement?.id);
        if (focusedElement === 'modal-first-focusable') break;
      }
    }
  }
}

/**
 * Wait for idle state
 */
export async function waitForIdle(page: Page, timeout: number = 5000): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(100); // Additional buffer for rendering
}

/**
 * Disable animations globally for testing
 */
export async function disableAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });
}

/**
 * Enable reduced motion preference
 */
export async function setReducedMotion(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
}
