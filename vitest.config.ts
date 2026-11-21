import { defineConfig } from 'vitest/config';

// Root gate: hermetic unit tests only (no database). Each project keeps its own
// environment (apps/mobile jsdom, packages node).
// apps/generator is intentionally excluded: it has its own
// `pnpm --filter generator test` and is outside this milestone's gate.
export default defineConfig({
  test: {
    projects: ['apps/mobile/vitest.config.ts', 'packages/*/vitest.config.ts'],
  },
});
