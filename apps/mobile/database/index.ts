import { Database } from '@nozbe/watermelondb';
import { schema } from './schema';
import { modelClasses } from './models';
import { migrations } from './migrations';
import { ensureDefaultPack } from './migrations/003_seed_default_pack';

/**
 * WatermelonDB database instance
 * Used for offline-first question pack storage
 *
 * Note: In WatermelonDB v0.28.x, schema and migrations are passed to the adapter,
 * not directly to the Database constructor. The adapter (e.g., SQLiteAdapter)
 * handles schema and migration management.
 *
 * This module exports all database components for app initialization:
 * - `database`: Database instance (requires adapter configuration)
 * - `schema`: App schema for adapter initialization
 * - `migrations`: Migration definitions for adapter initialization
 * - `modelClasses`: Model classes for the database
 * - `initializeDatabase`: Seeds default pack on first launch (D-02)
 */

/**
 * Creates a configured database instance with the provided adapter.
 *
 * @param adapter - Database adapter (e.g., SQLiteAdapter or expo-file-system adapter)
 *                  Must be configured with schema and migrations
 * @returns Configured Database instance
 *
 * @example
 * import { SQLiteAdapter } from '@nozbe/watermelondb/adapters/sqlite';
 * import { createDatabase, schema, migrations, modelClasses } from './database';
 *
 * const adapter = new SQLiteAdapter({
 *   schema,
 *   migrations,
 *   // ... other adapter options
 * });
 *
 * const database = createDatabase(adapter);
 */
export const createDatabase = (adapter: any) => {
  return new Database({
    adapter,
    modelClasses,
  });
};

/**
 * Initialize database with default pack seeding
 * Per D-02: Built-in default pack with 120 questions bundled in app
 *
 * Call this after database adapter is configured.
 * Seeds the default pack if no packs exist.
 *
 * @returns Promise that resolves when initialization is complete
 */
export async function initializeDatabase(): Promise<void> {
  try {
    await ensureDefaultPack();
  } catch (error) {
    console.error('Failed to seed default pack:', error);
    throw error;
  }
}

// Export all components for external configuration
export { schema } from './schema';
export { migrations } from './migrations';
export { modelClasses } from './models';
export { QuestionPackModel, QuestionModel } from './models';

// Default export for convenience
export default {
  createDatabase,
  initializeDatabase,
  schema,
  migrations,
  modelClasses,
};