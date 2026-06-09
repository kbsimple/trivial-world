import { schemaMigrations, createTable } from '@nozbe/watermelondb/Schema/migrations';

/**
 * Migration from schema v1 to v2
 * Adds question_packs and questions tables for offline pack storage
 *
 * Per RESEARCH.md Pattern 2:
 * - Creates tables for pack caching
 * - Does NOT migrate existing hardcoded questions (deferred per D-02)
 * - Migration is safe to run on existing v1 installations
 */
export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        createTable({
          name: 'question_packs',
          columns: [
            { name: 'pack_id', type: 'string' },
            { name: 'name', type: 'string' },
            { name: 'description', type: 'string', isOptional: true },
            { name: 'version', type: 'string' },
            { name: 'author', type: 'string' },
            { name: 'downloaded_at', type: 'number' },
            { name: 'checksum', type: 'string' },
            { name: 'is_active', type: 'boolean' },
            { name: 'category_counts', type: 'string' },
            { name: 'total_questions', type: 'number' },
            { name: 'schema_version', type: 'string' },
          ],
        }),
        createTable({
          name: 'questions',
          columns: [
            { name: 'question_pack_id', type: 'string' },
            { name: 'question_id', type: 'string' },
            { name: 'category', type: 'string' },
            { name: 'question_text', type: 'string' },
            { name: 'answer_text', type: 'string' },
            { name: 'difficulty', type: 'string', isOptional: true },
            { name: 'choices', type: 'string', isOptional: true },
            { name: 'correct_choice_index', type: 'number', isOptional: true },
            { name: 'asked_at', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
  ],
});