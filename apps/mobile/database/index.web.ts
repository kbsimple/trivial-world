/**
 * Web stub for database module
 *
 * Web uses bundled questions from services/questionProvider.ts
 * This stub prevents WatermelonDB from being bundled on web.
 */

// Stub types for web
export interface Database {}
export interface DatabaseAdapter {}

/**
 * Stub: Database not available on web
 */
export function getDatabase(): Database {
  throw new Error('Database is not available on web. Use questionProvider instead.');
}

/**
 * Stub: No-op on web
 */
export async function initializeDatabaseAsync(): Promise<void> {
  // No-op on web - database not needed
  console.log('Database initialization skipped on web');
}

/**
 * Stub: No-op on web
 */
export function initializeDatabaseWithAdapter(_adapter: DatabaseAdapter): void {
  throw new Error('Database is not available on web. Use questionProvider instead.');
}

/**
 * Stub: No-op on web
 */
export async function initializeDatabase(): Promise<void> {
  // No-op on web
}

// Export stub schema/migrations/models (empty)
export const schema = { tables: [], version: 1 };
export const migrations = { migrations: {} };
export const modelClasses = [];

// Stub model exports
export class QuestionPackModel {
  static table = 'question_packs';
}
export class QuestionModel {
  static table = 'questions';
}

// Default export
export default {
  getDatabase,
  database: { instance: null },
  initializeDatabaseAsync,
  initializeDatabaseWithAdapter,
  createDatabase: () => { throw new Error('Database is not available on web'); },
  initializeDatabase,
  schema,
  migrations,
  modelClasses,
};