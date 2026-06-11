import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Generator app (Question Generator)
 *
 * Tests that the generator web app can be loaded and basic functionality works
 */

test.describe('Generator App - Question Generator', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the generator app (not used by the console-error test below,
    // which must set up its listener before navigating)
    await page.goto('/');
  });

  test('should load the app without critical console errors', async ({ page }) => {
    const errors: string[] = [];

    // IMPORTANT: Register listener BEFORE navigating so errors that fire
    // during initial JS evaluation are captured (matches mobile.spec.ts pattern)
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate after the listener is in place
    await page.goto('/');

    // Wait for the app to load
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Filter out benign errors
    const criticalErrors = errors.filter(e =>
      !e.includes('Failed to load resource') &&
      !e.includes('net::ERR_') &&
      !e.includes('404')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('should display the generator title', async ({ page }) => {
    // Wait for the title to appear - the header shows "Question Generator"
    const title = page.locator('h1:has-text("Question Generator")');
    await expect(title).toBeVisible({ timeout: 15000 });
  });

  test('should show topic input field', async ({ page }) => {
    // Check for topic input (by placeholder text)
    const topicInput = page.locator('input[type="text"]').first();
    await expect(topicInput).toBeVisible({ timeout: 10000 });
  });

  test('should show category dropdown', async ({ page }) => {
    // Check for category select
    const categorySelect = page.locator('select#category');
    await expect(categorySelect).toBeVisible({ timeout: 10000 });

    // Check that all categories are available
    const options = await categorySelect.locator('option').allTextContents();
    expect(options.length).toBeGreaterThan(5); // At least 6 categories + placeholder
  });

  test('should have disabled generate button initially', async ({ page }) => {
    // The generate button should be disabled when no topic is entered
    const generateButton = page.locator('button:has-text("Generate Questions")');
    await expect(generateButton).toBeDisabled({ timeout: 5000 });
  });

  test('should have correct page title', async ({ page }) => {
    const title = await page.title();
    expect(title).toContain('Question Generator');
  });

  test('should have navigation links', async ({ page }) => {
    // Check for Review link
    const reviewLink = page.locator('a:has-text("Review")');
    await expect(reviewLink).toBeVisible({ timeout: 10000 });

    // Check for Packs link
    const packsLink = page.locator('a:has-text("Packs")');
    await expect(packsLink).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Generator App - Navigation', () => {
  test('should navigate to Review page', async ({ page }) => {
    await page.goto('/');

    // Click Review link
    await page.click('a:has-text("Review")');

    // Should be on Review page
    await expect(page).toHaveURL(/\/review/, { timeout: 10000 });
  });

  test('should navigate to Packs page', async ({ page }) => {
    await page.goto('/');

    // Click Packs link
    await page.click('a:has-text("Packs")');

    // Should be on Packs page
    await expect(page).toHaveURL(/\/packs/, { timeout: 10000 });
  });
});

test.describe('Generator App - Static export', () => {
  test('should serve static files correctly', async ({ page }) => {
    // Check that the page loads without requiring a server
    await page.goto('/');

    // Verify the HTML is served
    const content = await page.content();
    expect(content).toContain('Question Generator');
  });
});

test.describe('Generator App - SPA Routing', () => {
  test('should serve /review route directly (no 404)', async ({ page }) => {
    // Navigate directly to a static route — must return 200, not 404
    const response = await page.goto('/review');
    expect(response?.status()).not.toBe(404);

    await page.waitForLoadState('networkidle', { timeout: 15000 });

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
  });

  test('should serve /packs route directly (no 404)', async ({ page }) => {
    const response = await page.goto('/packs');
    expect(response?.status()).not.toBe(404);

    await page.waitForLoadState('networkidle', { timeout: 15000 });

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
  });

  test('root route / is the generator app', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    await page.waitForLoadState('networkidle', { timeout: 15000 });

    const content = await page.content();
    expect(content).toContain('Question Generator');
  });
});