/**
 * Playwright Configuration
 *
 * Configured for:
 * - E2E tests (tests/e2e/)
 * - Visual regression tests (tests/e2e/visual/)
 * - Accessibility tests (tests/e2e/accessibility/)
 * - Performance tests (tests/e2e/performance/)
 */

import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables
 * See https://playwright.dev/docs/test-configuration
 */
const baseURL = process.env.TEST_URL || 'http://localhost:4173';

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: /(.+\.)?(test|spec)\.[jt]s/,

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL,

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Capture screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video recording for debugging */
    video: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    /* Desktop Chrome - primary testing browser */
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        /* Enable Chrome DevTools Protocol for performance testing */
        launchOptions: {
          args: ['--enable-precise-memory-info'],
        },
      },
    },

    /* Desktop Firefox */
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    /* Desktop Safari */
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Mobile Chrome */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },

    /* Mobile Safari */
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Visual regression tests - Chrome only for consistency */
    {
      name: 'visual',
      testDir: 'tests/e2e/visual',
      use: {
        ...devices['Desktop Chrome'],
        /* Disable animations for consistent screenshots */
        launchOptions: {
          args: ['--force-prefers-reduced-motion'],
        },
      },
      /* Update snapshots in CI */
      snapshotPathTemplate: '{testDir}/snapshots/{projectName}/{testFilePath}/{arg}{ext}',
    },

    /* Accessibility tests */
    {
      name: 'accessibility',
      testDir: 'tests/e2e/accessibility',
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    /* Performance tests - Chrome only with extended timeout */
    {
      name: 'performance',
      testDir: 'tests/e2e/performance',
      timeout: 120000, /* 2 minutes for performance tests */
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--enable-precise-memory-info',
            '--disable-dev-shm-usage',
            '--no-sandbox',
          ],
        },
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run build && npm run preview',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },

  /* Configure screenshot comparison */
  expect: {
    /* Default screenshot comparison options */
    toHaveScreenshot: {
      /* Animations must be disabled */
      animations: 'disabled',
      /* Allow slight differences for anti-aliasing */
      threshold: 0.2,
      /* Maximum different pixels allowed */
      maxDiffPixels: 100,
    },
    /* Default timeout for expect assertions */
    timeout: 10000,
  },

  /* Global timeout */
  timeout: 30000,

  /* Output directory for test artifacts */
  outputDir: 'test-results',
});
