import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['**/*.test.ts', '**/*.test.tsx'],
  },
  resolve: {
    alias: {
      // react-native/index.js uses Flow's `import typeof *` which Rollup cannot
      // parse. Redirect to a minimal stub so stores that import Platform can run.
      'react-native': resolve(__dirname, '__mocks__/react-native.ts'),
    },
  },
});
