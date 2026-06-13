import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

/**
 * Migration from schema v2 to v3
 * Adds tidbits column to questions table for answer reveal context
 *
 * Per Phase 16: tidbits is optional string (max 500 chars) shown after answer reveal.
 * isOptional: true ensures existing rows with no tidbits remain valid.
 */
export default schemaMigrations({
  migrations: [
    {
      toVersion: 3,
      steps: [
        addColumns({
          table: 'questions',
          columns: [
            { name: 'tidbits', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
  ],
});
