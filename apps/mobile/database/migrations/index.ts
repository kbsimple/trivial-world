import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';
import migration002 from './002_add_question_packs';
import migration003 from './003_add_tidbits';

/**
 * Combined migrations for WatermelonDB
 * Migrations are applied in order when database version changes
 *
 * Note: We need to merge the migrations from each file.
 * Each migration file exports SchemaMigrations which has sortedMigrations.
 * We extract and combine the migrations array.
 */
export const migrations = {
  validated: true as const,
  minVersion: 1,
  maxVersion: 3,
  sortedMigrations: [
    ...migration002.sortedMigrations,
    ...migration003.sortedMigrations,
  ],
};

export default migrations;