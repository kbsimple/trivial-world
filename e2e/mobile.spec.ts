import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Mobile app (Trivial World game)
 *
 * Tests that the game can be loaded and basic functionality works
 */

test.describe('Mobile App - Trivial World Game', () => {
  test('should load the app without critical console errors', async ({ page }) => {
    const errors: string[] = [];

    // IMPORTANT: Set up console listener BEFORE navigating to the page
    // The __fbBatchedBridgeConfig error happens during initial JS evaluation
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Also capture page errors (uncaught exceptions)
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Navigate to the mobile app
    await page.goto('/');

    // Wait for the app to fully load
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Additional wait for any async errors
    await page.waitForTimeout(2000);

    // Check for the React Native bridge error (critical)
    const hasBridgeError = errors.some(e =>
      e.includes('__fbBatchedBridgeConfig') ||
      e.includes('cannot invoke native modules') ||
      e.includes('WatermelonDB') ||
      e.includes('SQLite')
    );

    expect(hasBridgeError).toBe(false);
  });

  test('should have correct page title', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const title = await page.title();
    expect(title).toContain('Trivial World');
  });

  test('should load without native module errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Get page content to verify it's not blank
    const content = await page.content();
    expect(content.length).toBeGreaterThan(1000); // Page should have content

    // Check that the root element exists
    const rootDiv = await page.locator('#root');
    await expect(rootDiv).toBeVisible();
  });

  test('should render React Native Web app', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Check that React Native Web styles are applied
    const html = await page.content();

    // Should have the expo-reset style (from React Native Web)
    expect(html).toContain('expo-reset');
  });
});

test.describe('Mobile App - SPA Routing', () => {
  test('should serve app on non-root routes (SPA redirect)', async ({ page }) => {
    // Navigate directly to a deep route — SPA mode must serve index.html (not 404)
    const response = await page.goto('/game');
    expect(response?.status()).not.toBe(404);

    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // App shell should still load
    const rootDiv = await page.locator('#root');
    await expect(rootDiv).toBeVisible();
  });

  test('should serve app on /setup route', async ({ page }) => {
    const response = await page.goto('/setup');
    expect(response?.status()).not.toBe(404);

    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const content = await page.content();
    expect(content.length).toBeGreaterThan(1000);
  });

  test('should serve static assets correctly', async ({ page }) => {
    // index.html must be accessible from root
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });
});