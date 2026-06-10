/**
 * Web stub for database migrations
 *
 * Web uses bundled questions from services/questionProvider.ts
 * This stub prevents WatermelonDB from being bundled on web.
 */

// Empty migrations for web
export const migrations = {
  validated: true as const,
  minVersion: 1,
  maxVersion: 1,
  sortedMigrations: [],
};

export default migrations;