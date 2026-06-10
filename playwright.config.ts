import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration for Trivial World
 *
 * Tests both apps:
 * - Mobile app (Expo web export) - served from dist/
 * - Generator app (Next.js static export) - served from out/
 */

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'mobile',
      testMatch: 'mobile.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3001',
      },
      webServer: {
        command: 'npx -y serve apps/mobile/dist -l 3001 -s',
        url: 'http://localhost:3001',
        reuseExistingServer: true,
        timeout: 60 * 1000,
      },
    },
    {
      name: 'generator',
      testMatch: 'generator.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3002',
      },
      webServer: {
        command: 'npx -y serve apps/generator/out -l 3002 -s',
        url: 'http://localhost:3002',
        reuseExistingServer: true,
        timeout: 60 * 1000,
      },
    },
  ],
});