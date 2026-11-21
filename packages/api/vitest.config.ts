import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    exclude: ['**/*.integration.test.ts', '**/node_modules/**'],
    setupFiles: ['./test/setup.ts'],
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      // packages/types/dist is untracked; resolve to source so a fresh checkout works.
      '@trivial-world/types': fileURLToPath(
        new URL('../types/src/index.ts', import.meta.url),
      ),
    },
  },
});
