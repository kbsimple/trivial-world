import { appSchema, tableSchema } from '@nozbe/watermelondb';

/**
 * WatermelonDB schema for Trivial World
 * Version 2: Added question_packs and questions tables
 *
 * Per RESEARCH.md Pattern 2 (Offline-First Pack Caching):
 * - Pack metadata stored in question_packs table
 * - Individual questions stored in questions table
 * - Lazy loading via WatermelonDB queries (not all questions in memory)
 */
export const schema = appSchema({
  version: 2, // Incremented from v1 (original game state)
  tables: [
    // Question packs table
    // Stores pack metadata and download status
    tableSchema({
      name: 'question_packs',
      columns: [
        { name: 'pack_id', type: 'string' },       // UUID from pack metadata (indexed)
        { name: 'name', type: 'string' },          // Pack display name
        { name: 'description', type: 'string', isOptional: true },
        { name: 'version', type: 'string' },       // SemVer string (e.g., "1.0.0")
        { name: 'author', type: 'string' },
        { name: 'downloaded_at', type: 'number' }, // Unix timestamp
        { name: 'checksum', type: 'string' },      // SHA-256 for integrity
        { name: 'is_active', type: 'boolean' },    // Per D-04: single active pack per session
        { name: 'category_counts', type: 'string' }, // JSON string: Record<Category, number>
        { name: 'total_questions', type: 'number' },
        { name: 'schema_version', type: 'string' }, // Per D-05: pack schema version
      ],
    }),
    // Questions table
    // Stores individual questions with relation to pack
    tableSchema({
      name: 'questions',
      columns: [
        { name: 'question_pack_id', type: 'string' },    // Foreign key to question_packs
        { name: 'question_id', type: 'string' },         // ID within pack (URL-safe)
        { name: 'category', type: 'string' },            // PlayerColor enum value
        { name: 'question_text', type: 'string' },
        { name: 'answer_text', type: 'string' },
        { name: 'difficulty', type: 'string', isOptional: true }, // 'easy' | 'medium' | 'hard'
        { name: 'choices', type: 'string', isOptional: true },    // JSON array of strings
        { name: 'correct_choice_index', type: 'number', isOptional: true },
        { name: 'asked_at', type: 'number', isOptional: true },   // Unix timestamp or null
      ],
    }),
  ],
});