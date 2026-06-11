import { test, expect } from '@playwright/test';

const GAME_URL =
  process.env.PRODUCTION_GAME_URL ?? 'https://trivial-world.netlify.app';
const GENERATOR_URL =
  process.env.PRODUCTION_GENERATOR_URL ?? 'https://trivial-world-generator.netlify.app';

test.describe('Production - Game app (trivial-world.netlify.app)', () => {
  test('should load over HTTPS without script errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    const response = await page.goto(GAME_URL);
    expect(response?.url()).toMatch(/^https:/);
    expect(response?.status()).toBe(200);

    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const mimeErrors = errors.filter(e => e.includes("MIME type ('text/html')"));
    expect(mimeErrors, `JS files served with wrong MIME type: ${mimeErrors.join('\n')}`).toHaveLength(0);
  });

  test('should serve JS assets with correct MIME type', async ({ page }) => {
    const badMimeRequests: string[] = [];

    page.on('response', async (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] ?? '';
      if (url.includes('/_expo/static/js/') && !contentType.includes('javascript')) {
        badMimeRequests.push(`${url} → ${contentType}`);
      }
    });

    await page.goto(GAME_URL);
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    expect(
      badMimeRequests,
      `_expo JS files served with wrong MIME type:\n${badMimeRequests.join('\n')}`,
    ).toHaveLength(0);
  });

  test('should serve /game route directly (SPA deep-link)', async ({ page }) => {
    const response = await page.goto(`${GAME_URL}/game`);
    expect(response?.status()).not.toBe(404);
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    const root = page.locator('#root');
    await expect(root).toBeVisible({ timeout: 15000 });
  });

  test('should serve /setup route directly (SPA deep-link)', async ({ page }) => {
    const response = await page.goto(`${GAME_URL}/setup`);
    expect(response?.status()).not.toBe(404);
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    const content = await page.content();
    expect(content.length).toBeGreaterThan(1000);
  });
});

test.describe('Production - Generator app (trivial-world-generator.netlify.app)', () => {
  test('should load over HTTPS', async ({ page }) => {
    const response = await page.goto(GENERATOR_URL);
    expect(response?.url()).toMatch(/^https:/);
    expect(response?.status()).toBe(200);
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    const content = await page.content();
    expect(content).toContain('Question Generator');
  });

  test('should serve /review route directly (SPA deep-link)', async ({ page }) => {
    const response = await page.goto(`${GENERATOR_URL}/review`);
    expect(response?.status()).not.toBe(404);
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
  });

  test('should serve /packs route directly (SPA deep-link)', async ({ page }) => {
    const response = await page.goto(`${GENERATOR_URL}/packs`);
    expect(response?.status()).not.toBe(404);
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
  });
});
