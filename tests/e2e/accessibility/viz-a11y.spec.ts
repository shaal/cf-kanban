/**
 * TASK-089: Accessibility Tests for D3 Visualizations
 *
 * This test suite ensures all visualization components meet WCAG 2.1 AA standards:
 * - Keyboard navigation (Tab, Enter, Arrow keys)
 * - ARIA labels on all interactive elements
 * - Screen reader compatibility (axe-core)
 * - Color contrast verification
 * - Focus management
 *
 * Components tested:
 * - ForceGraph
 * - LineChart
 * - BarChart
 * - AreaChart
 */

import { test, expect, type Page, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  VizPage,
  AccessibilityHelper,
  VIZ_CONFIG,
  waitForIdle,
} from '../utils/viz-helpers';

// Test configuration
test.describe.configure({ mode: 'parallel' });

// Shared fixtures
let vizPage: VizPage;
let a11yHelper: AccessibilityHelper;

test.beforeEach(async ({ page }) => {
  vizPage = new VizPage(page);
  a11yHelper = new AccessibilityHelper(page);
});

test.describe('ForceGraph Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await vizPage.waitForSimulationStable();
  });

  test('has no critical accessibility violations', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[data-testid="force-graph"]')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('has correct ARIA roles and labels', async ({ page }) => {
    const graph = vizPage.getForceGraph();

    // Container should have appropriate role
    await expect(graph).toHaveAttribute('role', 'img');
    await expect(graph).toHaveAttribute('aria-label', /force.*graph|network.*diagram/i);

    // Should have accessible description
    const ariaDescribedBy = await graph.getAttribute('aria-describedby');
    expect(ariaDescribedBy).toBeTruthy();

    // Verify description element exists
    if (ariaDescribedBy) {
      const description = page.locator(`#${ariaDescribedBy}`);
      await expect(description).toBeVisible();
    }
  });

  test('nodes are keyboard navigable', async ({ page }) => {
    const graph = vizPage.getForceGraph();
    await graph.focus();

    // Tab into the graph
    await page.keyboard.press('Tab');

    // First node should be focused
    const firstNode = page.locator('[data-testid="force-graph"] .node').first();
    await expect(firstNode).toBeFocused();

    // Navigate with arrow keys
    await page.keyboard.press('ArrowRight');
    const secondNode = page.locator('[data-testid="force-graph"] .node').nth(1);
    await expect(secondNode).toBeFocused();

    // Navigate back
    await page.keyboard.press('ArrowLeft');
    await expect(firstNode).toBeFocused();

    // Press Enter to select
    await page.keyboard.press('Enter');
    await expect(firstNode).toHaveAttribute('aria-selected', 'true');

    // Escape to deselect
    await page.keyboard.press('Escape');
    await expect(firstNode).toHaveAttribute('aria-selected', 'false');
  });

  test('nodes have accessible names', async ({ page }) => {
    const nodes = page.locator('[data-testid="force-graph"] .node');
    const count = await nodes.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const node = nodes.nth(i);

      // Each node should have aria-label or title
      const ariaLabel = await node.getAttribute('aria-label');
      const title = await node.getAttribute('title');
      const role = await node.getAttribute('role');

      expect(ariaLabel || title).toBeTruthy();
      expect(role).toBe('button');
    }
  });

  test('links have accessible descriptions', async ({ page }) => {
    const links = page.locator('[data-testid="force-graph"] .link');
    const count = await links.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const link = links.nth(i);

      // Links should be marked as decorative or have accessible name
      const ariaHidden = await link.getAttribute('aria-hidden');
      const ariaLabel = await link.getAttribute('aria-label');

      expect(ariaHidden === 'true' || ariaLabel).toBeTruthy();
    }
  });

  test('supports screen reader announcements', async ({ page }) => {
    const graph = vizPage.getForceGraph();

    // Should have live region for announcements
    const liveRegion = graph.locator('[aria-live]');
    await expect(liveRegion).toBeVisible();

    // Click a node and verify announcement
    const node = page.locator('[data-testid="force-graph"] .node').first();
    await node.click();

    // Live region should contain update
    await expect(liveRegion).not.toBeEmpty();
  });

  test('focus is visible on all interactive elements', async ({ page }) => {
    const nodes = page.locator('[data-testid="force-graph"] .node');
    const firstNode = nodes.first();

    await firstNode.focus();

    // Check that focus indicator is visible
    const focusStyles = await firstNode.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow,
      };
    });

    // Should have visible focus indicator (outline or box-shadow)
    const hasFocusIndicator =
      focusStyles.outline !== 'none' ||
      focusStyles.outlineWidth !== '0px' ||
      focusStyles.boxShadow !== 'none';

    expect(hasFocusIndicator).toBe(true);
  });

  test('provides instructions for keyboard users', async ({ page }) => {
    const graph = vizPage.getForceGraph();

    // Should have keyboard instructions (in description or separate element)
    const instructions = page.locator('[data-testid="keyboard-instructions"]');

    // Either visible or available via aria-describedby
    const isVisible = await instructions.isVisible().catch(() => false);
    const ariaDescribedBy = await graph.getAttribute('aria-describedby');

    expect(isVisible || ariaDescribedBy).toBeTruthy();
  });
});

test.describe('LineChart Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await vizPage.goto('/viz-demo/line-chart');
    await waitForIdle(page);
  });

  test('has no critical accessibility violations', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[data-testid="line-chart"]')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('has correct ARIA roles and labels', async ({ page }) => {
    const chart = vizPage.getLineChart();

    await expect(chart).toHaveAttribute('role', 'img');
    await expect(chart).toHaveAttribute('aria-label', /line.*chart|time.*series/i);
  });

  test('data points are keyboard navigable', async ({ page }) => {
    const chart = vizPage.getLineChart();
    await chart.focus();

    // Tab into chart
    await page.keyboard.press('Tab');

    // Navigate data points with arrow keys
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');

    // Enter shows tooltip/detail
    await page.keyboard.press('Enter');
    const tooltip = page.locator('[role="tooltip"], [data-testid="chart-tooltip"]');
    await expect(tooltip).toBeVisible();
  });

  test('axis labels are accessible', async ({ page }) => {
    // X-axis label
    const xAxisLabel = page.locator('[data-testid="line-chart"] .x-axis-label');
    await expect(xAxisLabel).toHaveAttribute('aria-label', /.+/);

    // Y-axis label
    const yAxisLabel = page.locator('[data-testid="line-chart"] .y-axis-label');
    await expect(yAxisLabel).toHaveAttribute('aria-label', /.+/);
  });

  test('legend items are keyboard accessible', async ({ page }) => {
    await vizPage.goto('/viz-demo/line-chart?showLegend=true');
    await waitForIdle(page);

    const legendItems = page.locator('[data-testid="legend-item"]');
    const count = await legendItems.count();

    if (count > 0) {
      const firstItem = legendItems.first();
      await firstItem.focus();
      await expect(firstItem).toBeFocused();

      // Enter toggles visibility
      await page.keyboard.press('Enter');
      await expect(firstItem).toHaveAttribute('aria-pressed', /(true|false)/);
    }
  });

  test('provides data table alternative', async ({ page }) => {
    // Chart should have associated data table or link to one
    const dataTable = page.locator('[data-testid="chart-data-table"]');
    const showTableButton = page.locator('[data-testid="show-data-table"]');

    const hasDataTable = await dataTable.isVisible().catch(() => false);
    const hasTableButton = await showTableButton.isVisible().catch(() => false);

    // At least one method to access raw data should be available
    expect(hasDataTable || hasTableButton).toBe(true);
  });
});

test.describe('BarChart Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await vizPage.goto('/viz-demo/bar-chart');
    await waitForIdle(page);
  });

  test('has no critical accessibility violations', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[data-testid="bar-chart"]')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('has correct ARIA roles and labels', async ({ page }) => {
    const chart = vizPage.getBarChart();

    await expect(chart).toHaveAttribute('role', 'img');
    await expect(chart).toHaveAttribute('aria-label', /bar.*chart|categorical/i);
  });

  test('bars are keyboard navigable', async ({ page }) => {
    const chart = vizPage.getBarChart();
    await chart.focus();

    await page.keyboard.press('Tab');

    const bars = page.locator('[data-testid="bar-chart"] .bar');
    const firstBar = bars.first();

    // First bar should be focused
    await expect(firstBar).toBeFocused();

    // Navigate with arrow keys
    await page.keyboard.press('ArrowRight');
    await expect(bars.nth(1)).toBeFocused();

    // Enter activates/selects
    await page.keyboard.press('Enter');
    const tooltip = page.locator('[role="tooltip"], [data-testid="chart-tooltip"]');
    await expect(tooltip).toBeVisible();
  });

  test('bars have accessible values', async ({ page }) => {
    const bars = page.locator('[data-testid="bar-chart"] .bar');
    const count = await bars.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const bar = bars.nth(i);

      // Each bar should announce its value
      const ariaLabel = await bar.getAttribute('aria-label');
      const ariaValueNow = await bar.getAttribute('aria-valuenow');
      const title = await bar.getAttribute('title');

      expect(ariaLabel || ariaValueNow || title).toBeTruthy();
    }
  });

  test('category labels are accessible', async ({ page }) => {
    const categoryLabels = page.locator('[data-testid="bar-chart"] .category-label');
    const count = await categoryLabels.count();

    for (let i = 0; i < count; i++) {
      const label = categoryLabels.nth(i);

      // Labels should be readable
      const text = await label.textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    }
  });
});

test.describe('AreaChart Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await vizPage.goto('/viz-demo/area-chart');
    await waitForIdle(page);
  });

  test('has no critical accessibility violations', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[data-testid="area-chart"]')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('has correct ARIA roles and labels', async ({ page }) => {
    const chart = vizPage.getAreaChart();

    await expect(chart).toHaveAttribute('role', 'img');
    await expect(chart).toHaveAttribute('aria-label', /area.*chart/i);
  });

  test('area regions are described', async ({ page }) => {
    const areas = page.locator('[data-testid="area-chart"] .area');
    const count = await areas.count();

    for (let i = 0; i < count; i++) {
      const area = areas.nth(i);

      // Each area should have description
      const ariaLabel = await area.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    }
  });
});

test.describe('Color Contrast Compliance', () => {
  test('ForceGraph meets WCAG AA contrast requirements', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await vizPage.waitForSimulationStable();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[data-testid="force-graph"]')
      .withRules(['color-contrast', 'color-contrast-enhanced'])
      .analyze();

    const contrastViolations = accessibilityScanResults.violations.filter(
      (v) => v.id.includes('contrast')
    );

    expect(contrastViolations).toEqual([]);
  });

  test('LineChart meets WCAG AA contrast requirements', async ({ page }) => {
    await vizPage.goto('/viz-demo/line-chart');
    await waitForIdle(page);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[data-testid="line-chart"]')
      .withRules(['color-contrast'])
      .analyze();

    const contrastViolations = accessibilityScanResults.violations.filter(
      (v) => v.id.includes('contrast')
    );

    expect(contrastViolations).toEqual([]);
  });

  test('BarChart meets WCAG AA contrast requirements', async ({ page }) => {
    await vizPage.goto('/viz-demo/bar-chart');
    await waitForIdle(page);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[data-testid="bar-chart"]')
      .withRules(['color-contrast'])
      .analyze();

    const contrastViolations = accessibilityScanResults.violations.filter(
      (v) => v.id.includes('contrast')
    );

    expect(contrastViolations).toEqual([]);
  });

  test('visualizations work in high contrast mode', async ({ page }) => {
    // Enable forced-colors (high contrast mode)
    await page.emulateMedia({ forcedColors: 'active' });

    await vizPage.goto('/viz-demo');
    await waitForIdle(page);

    // All charts should still be visible
    await expect(vizPage.getForceGraph()).toBeVisible();
    await expect(vizPage.getLineChart()).toBeVisible();
    await expect(vizPage.getBarChart()).toBeVisible();
    await expect(vizPage.getAreaChart()).toBeVisible();
  });

  test('color is not the only means of conveying information', async ({ page }) => {
    await vizPage.goto('/viz-demo/line-chart?showLegend=true');
    await waitForIdle(page);

    // Legend items should have patterns, shapes, or labels in addition to color
    const legendItems = page.locator('[data-testid="legend-item"]');
    const count = await legendItems.count();

    for (let i = 0; i < count; i++) {
      const item = legendItems.nth(i);

      // Should have pattern, shape icon, or clear text label
      const hasPattern = await item.locator('[data-testid="legend-pattern"]').count() > 0;
      const hasShape = await item.locator('[data-testid="legend-shape"]').count() > 0;
      const hasText = (await item.textContent())?.trim().length > 0;

      expect(hasPattern || hasShape || hasText).toBe(true);
    }
  });
});

test.describe('Reduced Motion Preference', () => {
  test('respects prefers-reduced-motion for ForceGraph', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await vizPage.goto('/viz-demo/force-graph');

    // Simulation should not animate (instant positioning)
    const graph = vizPage.getForceGraph();
    await expect(graph).toHaveAttribute('data-reduced-motion', 'true');

    // Check that CSS transitions are disabled
    const hasNoTransitions = await page.evaluate(() => {
      const nodes = document.querySelectorAll('[data-testid="force-graph"] .node');
      return Array.from(nodes).every((node) => {
        const styles = window.getComputedStyle(node);
        return styles.transition === 'none 0s ease 0s' || styles.transitionDuration === '0s';
      });
    });

    expect(hasNoTransitions).toBe(true);
  });

  test('respects prefers-reduced-motion for charts', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await vizPage.goto('/viz-demo/line-chart');
    await waitForIdle(page);

    const chart = vizPage.getLineChart();
    await expect(chart).toHaveAttribute('data-reduced-motion', 'true');
  });
});

test.describe('Focus Management', () => {
  test('focus is trapped in modal/popover', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await vizPage.waitForSimulationStable();

    // Click node to open detail popover
    const node = page.locator('[data-testid="force-graph"] .node').first();
    await node.click();

    const popover = page.locator('[data-testid="node-detail-popover"]');
    if (await popover.isVisible()) {
      // Focus should be trapped
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      const focusedElement = page.locator(':focus');
      const isInPopover = await popover.locator(focusedElement).count() > 0;

      expect(isInPopover).toBe(true);

      // Escape closes and returns focus
      await page.keyboard.press('Escape');
      await expect(node).toBeFocused();
    }
  });

  test('focus returns after interaction', async ({ page }) => {
    await vizPage.goto('/viz-demo/bar-chart');
    await waitForIdle(page);

    const chart = vizPage.getBarChart();
    await chart.focus();
    await page.keyboard.press('Tab');

    const bars = page.locator('[data-testid="bar-chart"] .bar');
    const firstBar = bars.first();
    await expect(firstBar).toBeFocused();

    // Click outside
    await page.click('body');

    // Re-focus chart and verify we're back at start
    await chart.focus();
    await page.keyboard.press('Tab');
    await expect(firstBar).toBeFocused();
  });
});

test.describe('Screen Reader Announcements', () => {
  test('announces chart loading and ready state', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');

    // Check for status announcements
    const statusRegion = page.locator('[role="status"], [aria-live="polite"]');
    await expect(statusRegion).toContainText(/loading|ready|loaded/i);
  });

  test('announces data updates', async ({ page }) => {
    await vizPage.goto('/viz-demo/line-chart');
    await waitForIdle(page);

    const statusRegion = page.locator('[role="status"], [aria-live="polite"]');

    // Trigger data update
    await page.evaluate(() => {
      window.postMessage({ type: 'UPDATE_CHART_DATA' }, '*');
    });

    // Should announce the update
    await expect(statusRegion).toContainText(/updated|changed|new data/i);
  });

  test('announces selection changes', async ({ page }) => {
    await vizPage.goto('/viz-demo/force-graph');
    await vizPage.waitForSimulationStable();

    const statusRegion = page.locator('[role="status"], [aria-live="polite"]');

    // Select a node
    const node = page.locator('[data-testid="force-graph"] .node').first();
    await node.click();

    // Should announce selection
    await expect(statusRegion).toContainText(/selected|node/i);
  });
});

test.describe('Complete Axe Scan', () => {
  test('full visualization dashboard passes axe audit', async ({ page }) => {
    await vizPage.goto('/viz-demo');
    await waitForIdle(page);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .exclude('[data-testid="known-issues"]') // Exclude any known non-compliant areas
      .analyze();

    // Log violations for debugging
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Accessibility violations:');
      accessibilityScanResults.violations.forEach((violation) => {
        console.log(`- ${violation.id}: ${violation.description}`);
        violation.nodes.forEach((node) => {
          console.log(`  Target: ${node.target}`);
          console.log(`  HTML: ${node.html}`);
        });
      });
    }

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
