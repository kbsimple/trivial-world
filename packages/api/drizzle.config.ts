import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  // Hypothesis A1: Netlify migrations folder; 25-02 may move it.
  out: '../../apps/mobile/netlify/database/migrations',
});
