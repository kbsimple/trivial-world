# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile.spec.ts >> Mobile App - Trivial World Game >> should load the app without critical console errors
- Location: e2e/mobile.spec.ts:10:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: false
Received: true
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | /**
  4  |  * E2E tests for the Mobile app (Trivial World game)
  5  |  *
  6  |  * Tests that the game can be loaded and basic functionality works
  7  |  */
  8  | 
  9  | test.describe('Mobile App - Trivial World Game', () => {
  10 |   test('should load the app without critical console errors', async ({ page }) => {
  11 |     const errors: string[] = [];
  12 | 
  13 |     // IMPORTANT: Set up console listener BEFORE navigating to the page
  14 |     // The __fbBatchedBridgeConfig error happens during initial JS evaluation
  15 |     page.on('console', (msg) => {
  16 |       if (msg.type() === 'error') {
  17 |         errors.push(msg.text());
  18 |       }
  19 |     });
  20 | 
  21 |     // Also capture page errors (uncaught exceptions)
  22 |     page.on('pageerror', (error) => {
  23 |       errors.push(error.message);
  24 |     });
  25 | 
  26 |     // Navigate to the mobile app
  27 |     await page.goto('/');
  28 | 
  29 |     // Wait for the app to fully load
  30 |     await page.waitForLoadState('networkidle', { timeout: 30000 });
  31 | 
  32 |     // Additional wait for any async errors
  33 |     await page.waitForTimeout(2000);
  34 | 
  35 |     // Check for the React Native bridge error (critical)
  36 |     const hasBridgeError = errors.some(e =>
  37 |       e.includes('__fbBatchedBridgeConfig') ||
  38 |       e.includes('cannot invoke native modules') ||
  39 |       e.includes('WatermelonDB') ||
  40 |       e.includes('SQLite')
  41 |     );
  42 | 
> 43 |     expect(hasBridgeError).toBe(false);
     |                            ^ Error: expect(received).toBe(expected) // Object.is equality
  44 |   });
  45 | 
  46 |   test('should have correct page title', async ({ page }) => {
  47 |     await page.goto('/');
  48 |     await page.waitForLoadState('networkidle', { timeout: 30000 });
  49 | 
  50 |     const title = await page.title();
  51 |     expect(title).toContain('Trivial World');
  52 |   });
  53 | 
  54 |   test('should load without native module errors', async ({ page }) => {
  55 |     await page.goto('/');
  56 |     await page.waitForLoadState('networkidle', { timeout: 30000 });
  57 | 
  58 |     // Get page content to verify it's not blank
  59 |     const content = await page.content();
  60 |     expect(content.length).toBeGreaterThan(1000); // Page should have content
  61 | 
  62 |     // Check that the root element exists
  63 |     const rootDiv = await page.locator('#root');
  64 |     await expect(rootDiv).toBeVisible();
  65 |   });
  66 | 
  67 |   test('should render React Native Web app', async ({ page }) => {
  68 |     await page.goto('/');
  69 |     await page.waitForLoadState('networkidle', { timeout: 30000 });
  70 | 
  71 |     // Check that React Native Web styles are applied
  72 |     const html = await page.content();
  73 | 
  74 |     // Should have the expo-reset style (from React Native Web)
  75 |     expect(html).toContain('expo-reset');
  76 |   });
  77 | });
```