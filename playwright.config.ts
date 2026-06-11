import { defineConfig, devices } from '@playwright/test';

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

  webServer: [
    {
      command: 'npx serve apps/mobile/dist -l 3001 --single',
      url: 'http://localhost:3001',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      command: 'npx serve apps/generator/out -l 3002 --single',
      url: 'http://localhost:3002',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  ],

  projects: [
    {
      name: 'mobile',
      testMatch: 'mobile.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3001',
      },
    },
    {
      name: 'generator',
      testMatch: 'generator.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3002',
      },
    },
    {
      // Run against live Netlify sites: pnpm test:e2e:production
      // Requires sites to be deployed. Uses env vars to override default URLs.
      name: 'production',
      testMatch: 'production.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});