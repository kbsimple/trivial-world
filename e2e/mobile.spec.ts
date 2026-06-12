import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Mobile app (Trivial World game)
 *
 * Tests that the game can be loaded and basic functionality works
 */

// Metro's ErrorUtils.reportFatalError silently swallows module-init crashes
// (e.g. Dimensions.set(undefined)) — they never reach page.on('pageerror').
// Intercept it before the bundle runs so fatal errors surface as page errors.
async function interceptFatalErrors(page: any) {
  await page.addInitScript(() => {
    (window as any).__fatalErrors = [];
    (window as any).__interceptErrorUtils = () => {
      const eu = (window as any).ErrorUtils;
      if (eu && eu.reportFatalError) {
        const orig = eu.reportFatalError.bind(eu);
        eu.reportFatalError = (err: unknown) => {
          (window as any).__fatalErrors.push(err instanceof Error ? err.message : String(err));
          orig(err);
        };
      }
    };
    // Try immediately and also after the bundle loads via MutationObserver
    (window as any).__interceptErrorUtils();
    // Guard against document.head being null during addInitScript execution
    const target = document.head || document.documentElement;
    if (target) {
      const observer = new MutationObserver(() => (window as any).__interceptErrorUtils());
      observer.observe(target, { childList: true, subtree: true });
    }
  });
}

test.describe('Mobile App - Trivial World Game', () => {
  test('should load the app without critical console errors', async ({ page }) => {
    await interceptFatalErrors(page);
    const errors: string[] = [];

    // IMPORTANT: Set up console listener BEFORE navigating to the page
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.waitForTimeout(2000);

    const fatalErrors: string[] = await page.evaluate(() => (window as any).__fatalErrors ?? []);
    const allErrors = [...errors, ...fatalErrors];

    const hasCriticalError = allErrors.some(e =>
      e.includes('__fbBatchedBridgeConfig') ||
      e.includes('cannot invoke native modules') ||
      e.includes('WatermelonDB') ||
      e.includes('SQLite') ||
      e.includes('Cannot destructure') ||
      e.includes('Dimensions')
    );

    expect(hasCriticalError, `Fatal/console errors: ${allErrors.join('; ')}`).toBe(false);
  });

  test('should have correct page title', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const title = await page.title();
    expect(title).toContain('Trivial World');
  });

  test('should render the setup screen UI (not a blank page)', async ({ page }) => {
    await interceptFatalErrors(page);

    await page.goto('/');
    // On web, the app auto-redirects from / to /game/setup (D-09)
    await page.waitForURL('**/game/setup', { timeout: 10000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Verify the React app rendered actual UI, not just an empty shell
    await expect(page.getByText('Setup Game')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Start Game')).toBeVisible({ timeout: 10000 });

    const fatalErrors: string[] = await page.evaluate(() => (window as any).__fatalErrors ?? []);
    expect(fatalErrors, `Silent fatal errors: ${fatalErrors.join('; ')}`).toHaveLength(0);
  });

  test('should render React Native Web app', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const html = await page.content();
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

test.describe('Mobile App - PWA Manifest', () => {
  test('manifest.webmanifest is accessible with correct MIME type', async ({ page }) => {
    const response = await page.goto('/manifest.webmanifest');
    expect(response?.status()).toBe(200);
    const contentType = response?.headers()['content-type'] ?? '';
    // Should NOT be served as text/html (which would indicate the SPA catch-all fired)
    expect(contentType).not.toContain('text/html');
  });

  test('manifest link is present in index.html', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveCount(1);
    const href = await manifestLink.getAttribute('href');
    expect(href).toBe('/manifest.webmanifest');
  });

  test('PWA icons are accessible (192px and 512px)', async ({ page }) => {
    const icon192 = await page.goto('/icons/icon-192.png');
    expect(icon192?.status()).toBe(200);
    expect(icon192?.headers()['content-type']).toContain('image/png');

    const icon512 = await page.goto('/icons/icon-512.png');
    expect(icon512?.status()).toBe(200);
    expect(icon512?.headers()['content-type']).toContain('image/png');
  });

  test('apple-touch-icon is accessible', async ({ page }) => {
    const response = await page.goto('/apple-touch-icon.png');
    expect(response?.status()).toBe(200);
    expect(response?.headers()['content-type']).toContain('image/png');
  });
});

test.describe('Mobile App - Deployment Status', () => {
  test('/statusz.json is accessible with correct MIME type', async ({ page }) => {
    const response = await page.goto('/statusz.json');
    expect(response?.status()).toBe(200);
    const contentType = response?.headers()['content-type'] ?? '';
    expect(contentType).toContain('application/json');
  });

  test('/statusz.json contains required status fields', async ({ page }) => {
    const response = await page.goto('/statusz.json');
    expect(response?.status()).toBe(200);

    const body = await response?.text();
    const data = JSON.parse(body ?? '{}');

    expect(data.service).toBe('trivial-world');
    expect(data.status).toBe('ok');
    expect(typeof data.version).toBe('string');
    expect(typeof data.commit).toBe('string');
    expect(data.commit).toHaveLength(40); // full SHA
    expect(typeof data.commitShort).toBe('string');
    expect(data.commitShort).toHaveLength(8);
    expect(typeof data.builtAt).toBe('string');
    // builtAt must be a valid ISO date
    expect(() => new Date(data.builtAt).toISOString()).not.toThrow();
  });

});