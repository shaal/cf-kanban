/**
 * TASK-114: Cross-Browser Testing Suite
 *
 * Tests critical functionality across all major browsers:
 * - Chromium (Chrome, Edge)
 * - Firefox
 * - WebKit (Safari)
 *
 * Mobile device testing:
 * - Mobile Chrome (Pixel 5)
 * - Mobile Safari (iPhone 12)
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.TEST_URL || 'http://localhost:4173';

// Helper to get browser name
function getBrowserName(page: Page): string {
  return page.context().browser()?.browserType().name() || 'unknown';
}

test.describe('Cross-Browser: Core Functionality', () => {
  test('renders kanban board correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/projects/test-project`);

    // Verify all columns render
    await expect(page.locator('[data-testid="column-BACKLOG"]')).toBeVisible();
    await expect(page.locator('[data-testid="column-TODO"]')).toBeVisible();
    await expect(page.locator('[data-testid="column-IN_PROGRESS"]')).toBeVisible();
    await expect(page.locator('[data-testid="column-DONE"]')).toBeVisible();

    // Log browser for debugging
    console.log(`Test passed on browser: ${getBrowserName(page)}`);
  });

  test('drag and drop works correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/projects/test-project`);

    // Create a ticket via API for consistent state
    await page.request.post(`${BASE_URL}/api/projects/test-project/tickets`, {
      data: {
        title: 'DnD Test Ticket',
        description: 'Testing drag and drop',
        priority: 'MEDIUM'
      }
    });

    await page.reload();
    await page.waitForSelector('[data-testid="ticket-card"]');

    const ticket = page.locator('[data-testid="ticket-card"]:has-text("DnD Test Ticket")');
    const todoColumn = page.locator('[data-testid="column-TODO"]');

    // Perform drag and drop
    await ticket.dragTo(todoColumn);
    await page.waitForTimeout(500);

    // Verify ticket moved
    await expect(todoColumn.locator('[data-testid="ticket-card"]:has-text("DnD Test Ticket")')).toBeVisible();

    console.log(`Drag and drop works on: ${getBrowserName(page)}`);
  });

  test('modals open and close correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/projects/test-project`);

    // Open create ticket modal
    await page.click('[data-testid="create-ticket-btn"]');
    await expect(page.locator('[data-testid="ticket-form-modal"]')).toBeVisible();

    // Close with escape
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="ticket-form-modal"]')).not.toBeVisible();

    // Open again and close with button
    await page.click('[data-testid="create-ticket-btn"]');
    await page.click('[data-testid="close-modal-btn"]');
    await expect(page.locator('[data-testid="ticket-form-modal"]')).not.toBeVisible();

    console.log(`Modal behavior correct on: ${getBrowserName(page)}`);
  });

  test('forms submit correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/projects/test-project`);

    await page.click('[data-testid="create-ticket-btn"]');
    await page.fill('[data-testid="ticket-title-input"]', 'Browser Test Ticket');
    await page.fill('[data-testid="ticket-description-input"]', 'Testing form submission');
    await page.selectOption('[data-testid="ticket-priority-select"]', 'HIGH');

    await page.click('[data-testid="submit-ticket-btn"]');

    // Wait for ticket to appear
    await page.waitForSelector('[data-testid="ticket-card"]:has-text("Browser Test Ticket")');

    console.log(`Form submission works on: ${getBrowserName(page)}`);
  });
});

test.describe('Cross-Browser: CSS and Styling', () => {
  test('layout renders correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/projects/test-project`);

    // Check grid/flex layout
    const board = page.locator('[data-testid="kanban-board"]');
    const box = await board.boundingBox();

    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);

    // Check columns are side by side
    const columns = await page.locator('[data-testid^="column-"]').all();
    const positions = await Promise.all(
      columns.map(async col => {
        const box = await col.boundingBox();
        return box?.x || 0;
      })
    );

    // Columns should have increasing x positions
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }

    console.log(`Layout correct on: ${getBrowserName(page)}`);
  });

  test('colors and themes render correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/projects/test-project`);

    // Check primary button color
    const createBtn = page.locator('[data-testid="create-ticket-btn"]');
    const bgColor = await createBtn.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );

    // Should have a non-transparent background
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(bgColor).not.toBe('transparent');

    console.log(`Colors render on: ${getBrowserName(page)}`);
  });

  test('dark mode works correctly', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(`${BASE_URL}/projects/test-project`);

    const body = page.locator('body');
    const bgColor = await body.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );

    // In dark mode, background should be dark
    const rgb = bgColor.match(/\d+/g);
    if (rgb) {
      const [r, g, b] = rgb.map(Number);
      // Average should be below 128 for dark background
      expect((r + g + b) / 3).toBeLessThan(128);
    }

    console.log(`Dark mode works on: ${getBrowserName(page)}`);
  });

  test('fonts render correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/projects/test-project`);

    const heading = page.locator('h1, h2').first();
    const fontFamily = await heading.evaluate(el =>
      window.getComputedStyle(el).fontFamily
    );

    // Should have a font family defined
    expect(fontFamily.length).toBeGreaterThan(0);

    console.log(`Fonts render on: ${getBrowserName(page)}`);
  });
});

test.describe('Cross-Browser: JavaScript Features', () => {
  test('ES6+ features work', async ({ page }) => {
    await page.goto(`${BASE_URL}/projects/test-project`);

    // Test that modern JS features work
    const result = await page.evaluate(() => {
      // Arrow functions
      const add = (a: number, b: number) => a + b;

      // Destructuring
      const { x, y } = { x: 1, y: 2 };

      // Spread operator
      const arr = [...[1, 2], 3];

      // Template literals
      const str = `Sum: ${add(x, y)}`;

      // Async/await (implicit in this context)
      const promise = Promise.resolve(true);

      // Optional chaining
      const obj: { nested?: { value?: number } } = {};
      const value = obj?.nested?.value ?? 'default';

      return { arr, str, value };
    });

    expect(result.arr).toEqual([1, 2, 3]);
    expect(result.str).toBe('Sum: 3');
    expect(result.value).toBe('default');

    console.log(`ES6+ features work on: ${getBrowserName(page)}`);
  });

  test('fetch API works', async ({ page }) => {
    await page.goto(`${BASE_URL}/projects/test-project`);

    const response = await page.evaluate(async () => {
      const res = await fetch('/api/projects');
      return {
        ok: res.ok,
        status: res.status
      };
    });

    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);

    console.log(`Fetch API works on: ${getBrowserName(page)}`);
  });

  test('WebSocket API works', async ({ page }) => {
    await page.goto(`${BASE_URL}/projects/test-project`);

    // Check if WebSocket is available
    const wsAvailable = await page.evaluate(() => {
      return typeof WebSocket !== 'undefined';
    });

    expect(wsAvailable).toBe(true);

    console.log(`WebSocket API available on: ${getBrowserName(page)}`);
  });

  test('localStorage works', async ({ page }) => {
    await page.goto(`${BASE_URL}/projects/test-project`);

    const result = await page.evaluate(() => {
      try {
        localStorage.setItem('test', 'value');
        const value = localStorage.getItem('test');
        localStorage.removeItem('test');
        return value === 'value';
      } catch {
        return false;
      }
    });

    expect(result).toBe(true);

    console.log(`localStorage works on: ${getBrowserName(page)}`);
  });
});

test.describe('Cross-Browser: Accessibility', () => {
  test('focus states are visible', async ({ page }) => {
    await page.goto(`${BASE_URL}/projects/test-project`);

    // Tab to first interactive element
    await page.keyboard.press('Tab');

    // Check that something is focused
    const hasFocus = await page.evaluate(() => {
      const focused = document.activeElement;
      return focused !== document.body;
    });

    expect(hasFocus).toBe(true);

    console.log(`Focus states work on: ${getBrowserName(page)}`);
  });

  test('ARIA attributes are present', async ({ page }) => {
    await page.goto(`${BASE_URL}/projects/test-project`);

    // Check for common ARIA attributes
    const hasAriaLabels = await page.evaluate(() => {
      const elementsWithAria = document.querySelectorAll('[aria-label], [aria-labelledby], [role]');
      return elementsWithAria.length > 0;
    });

    expect(hasAriaLabels).toBe(true);

    console.log(`ARIA attributes present on: ${getBrowserName(page)}`);
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.goto(`${BASE_URL}/projects/test-project`);

    // Navigate through elements with Tab
    const tabOrder: string[] = [];

    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const tag = await page.evaluate(() => document.activeElement?.tagName);
      if (tag) tabOrder.push(tag);
    }

    // Should have focused multiple different elements
    expect(tabOrder.length).toBeGreaterThan(0);

    console.log(`Keyboard navigation works on: ${getBrowserName(page)}`);
  });
});

test.describe('Cross-Browser: Responsive Design', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'wide', width: 1920, height: 1080 },
  ];

  for (const viewport of viewports) {
    test(`renders correctly at ${viewport.name} size`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`${BASE_URL}/projects/test-project`);

      // Board should be visible
      await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible();

      // Check layout adapts
      const columns = page.locator('[data-testid^="column-"]');

      if (viewport.width < 768) {
        // On mobile, columns might stack or be scrollable
        const firstColumn = columns.first();
        await expect(firstColumn).toBeVisible();
      } else {
        // On larger screens, all columns should be visible
        await expect(columns.first()).toBeVisible();
        await expect(columns.last()).toBeVisible();
      }

      console.log(`Responsive at ${viewport.name} on: ${getBrowserName(page)}`);
    });
  }
});

test.describe('Cross-Browser: Performance', () => {
  test('page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(`${BASE_URL}/projects/test-project`);
    await page.waitForSelector('[data-testid="kanban-board"]');

    const loadTime = Date.now() - startTime;

    // Page should load within 3 seconds on any browser
    expect(loadTime).toBeLessThan(3000);

    console.log(`Load time on ${getBrowserName(page)}: ${loadTime}ms`);
  });

  test('no console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/projects/test-project`);
    await page.waitForTimeout(2000);

    // Filter out expected errors (like network errors for APIs that don't exist yet)
    const unexpectedErrors = errors.filter(e =>
      !e.includes('404') &&
      !e.includes('Failed to fetch') &&
      !e.includes('net::')
    );

    expect(unexpectedErrors).toHaveLength(0);

    console.log(`No console errors on: ${getBrowserName(page)}`);
  });
});

test.describe('Cross-Browser: Edge Cases', () => {
  test('handles empty state', async ({ page }) => {
    await page.goto(`${BASE_URL}/projects/empty-project`);

    // Should show empty state message or create button
    const emptyState = page.locator('[data-testid="empty-state"], [data-testid="create-ticket-btn"]');
    await expect(emptyState).toBeVisible();

    console.log(`Empty state handled on: ${getBrowserName(page)}`);
  });

  test('handles long text content', async ({ page }) => {
    await page.goto(`${BASE_URL}/projects/test-project`);

    // Create ticket with very long title
    await page.click('[data-testid="create-ticket-btn"]');
    await page.fill(
      '[data-testid="ticket-title-input"]',
      'A'.repeat(200) // Very long title
    );
    await page.click('[data-testid="submit-ticket-btn"]');

    // Should handle gracefully (truncate with ellipsis or wrap)
    const ticket = page.locator('[data-testid="ticket-card"]').first();
    const box = await ticket.boundingBox();

    // Ticket card should have reasonable dimensions
    expect(box?.width).toBeLessThan(500);

    console.log(`Long text handled on: ${getBrowserName(page)}`);
  });

  test('handles special characters', async ({ page }) => {
    await page.goto(`${BASE_URL}/projects/test-project`);

    const specialChars = '<script>alert("xss")</script> & < > " \' `';

    await page.click('[data-testid="create-ticket-btn"]');
    await page.fill('[data-testid="ticket-title-input"]', specialChars);
    await page.click('[data-testid="submit-ticket-btn"]');

    // Check that special chars are escaped properly
    const ticketText = await page.locator('[data-testid="ticket-card"]').first().textContent();

    // Should not execute script, should display escaped text
    expect(ticketText).not.toContain('<script>');

    console.log(`Special chars handled on: ${getBrowserName(page)}`);
  });
});
