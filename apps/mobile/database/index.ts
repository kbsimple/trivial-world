import { Database, DatabaseAdapter } from '@nozbe/watermelondb';
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
 * - `database`: Database singleton instance (lazily initialized - MOBILE ONLY)
 * - `schema`: App schema for adapter initialization
 * - `migrations`: Migration definitions for adapter initialization
 * - `modelClasses`: Model classes for the database
 * - `initializeDatabase`: Seeds default pack on first launch (D-02)
 *
 * IMPORTANT: This module should only be imported on mobile (Platform.OS !== 'web').
 * Web uses bundled questions from services/questionProvider.ts
 */

let _database: Database | null = null;

/**
 * Get the database singleton instance.
 * Creates the database on first access using SQLiteAdapter.
 *
 * IMPORTANT: Only call this on mobile (Platform.OS !== 'web').
 * The database must be initialized before calling this function.
 *
 * @returns Database instance
 */
export function getDatabase(): Database {
  if (!_database) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return _database;
}

/**
 * Initialize the database with the provided adapter.
 * Must be called before getDatabase().
 *
 * @param adapter - Database adapter (e.g., SQLiteAdapter)
 */
export function initializeDatabaseWithAdapter(adapter: DatabaseAdapter): void {
  _database = new Database({
    adapter,
    modelClasses,
  });
}

/**
 * Async initialization for lazy loading SQLiteAdapter.
 * Used by app layout to avoid bundling SQLite on web.
 *
 * @returns Promise that resolves when initialization is complete
 */
export async function initializeDatabaseAsync(): Promise<void> {
  // Dynamic import to avoid bundling SQLiteAdapter on web
  const SQLiteAdapter = (await import('@nozbe/watermelondb/adapters/sqlite')).default;

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

  // Initialize database - seeds default pack if needed
  await initializeDatabase();
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
 * Call this after database is initialized via initializeDatabaseAsync().
 * Seeds the default pack if no packs exist.
 *
 * @returns Promise that resolves when seeding is complete
 */
export async function initializeDatabase(): Promise<void> {
  if (!_database) {
    throw new Error('Database not initialized. Call initializeDatabaseAsync() first.');
  }
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
  initializeDatabaseAsync,
  initializeDatabaseWithAdapter,
  createDatabase,
  initializeDatabase,
  schema,
  migrations,
  modelClasses,
};