import { Database, DatabaseAdapter } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
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
 * - `database`: Database singleton instance (lazily initialized)
 * - `schema`: App schema for adapter initialization
 * - `migrations`: Migration definitions for adapter initialization
 * - `modelClasses`: Model classes for the database
 * - `initializeDatabase`: Seeds default pack on first launch (D-02)
 */

let _database: Database | null = null;

/**
 * Get the database singleton instance.
 * Creates the database on first access using SQLiteAdapter.
 *
 * @returns Database instance
 */
export function getDatabase(): Database {
  if (!_database) {
    const adapter = new SQLiteAdapter({
      schema,
      migrations,
      jsi: true, // Use JSI for better performance
      onSetUpError: (error: Error) => {
        console.error('Database setup failed:', error);
      },
    });
    _database = new Database({
      adapter,
      modelClasses,
    });
  }
  return _database;
}

/**
 * The database singleton instance.
 * Lazily initialized on first access.
 */
export const database = {
  get instance(): Database {
    return getDatabase();
  },
};

/**
 * Creates a configured database instance with the provided adapter.
 * Use this for testing or custom adapter configuration.
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
export const createDatabase = (adapter: DatabaseAdapter) => {
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
  getDatabase,
  database,
  createDatabase,
  initializeDatabase,
  schema,
  migrations,
  modelClasses,
};