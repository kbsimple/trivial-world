import { z } from 'zod';
import { CategorySchema, DifficultySchema } from './category.js';

/**
 * Single question schema
 * Per D-03: question.id uses URL-safe pattern (^[a-z0-9-]+$)
 */
export const QuestionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'Question ID must be URL-safe (lowercase letters, numbers, hyphens)'),
  category: CategorySchema,
  questionText: z.string().min(10, 'Question text must be at least 10 characters').max(500),
  answerText: z.string().min(1, 'Answer text is required').max(200),
  difficulty: DifficultySchema.optional(),
  // Future: multiple choice support
  choices: z.array(z.string()).max(6).optional(),
  correctChoiceIndex: z.number().int().min(0).optional(),
  tidbits: z.string().max(500).optional(), // interesting context shown at answer reveal
  // Metadata
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  author: z.string().max(100).optional(),
  source: z.string().url().optional(),
});
export type Question = z.infer<typeof QuestionSchema>;

/**
 * Pack metadata schema
 * Per D-03: pack_id uses UUID format
 * Per D-05: schemaVersion field for versioning
 */
export const PackMetadataSchema = z.object({
  id: z.string().uuid('Pack ID must be a valid UUID'),
  name: z.string().min(1, 'Pack name is required').max(100),
  description: z.string().max(500).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be SemVer format (e.g., 1.0.0)'),
  author: z.string().min(1, 'Author name is required').max(100),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  // Category breakdown
  categoryCounts: z.record(CategorySchema, z.number().int().min(0)),
  totalQuestions: z.number().int().min(1, 'Pack must have at least 1 question'),
  // Validation checksums
  checksum: z.string().regex(/^[a-f0-9]{64}$/, 'Checksum must be SHA-256 hex string'),
  schemaVersion: z.literal('1.0.0'),
  // Mobile delivery optimization
  contentEncoding: z.enum(['gzip', 'identity']).default('gzip'),
  size: z.number().int().positive('Size must be positive integer (bytes)'),
});
export type PackMetadata = z.infer<typeof PackMetadataSchema>;

/**
 * Full question pack schema
 * Minimum 20 questions per pack for meaningful gameplay
 */
export const QuestionPackSchema = z.object({
  metadata: PackMetadataSchema,
  questions: z.array(QuestionSchema).min(20, 'Pack must have at least 20 questions'),
});
export type QuestionPack = z.infer<typeof QuestionPackSchema>;

/**
 * Pack index entry for browsing available packs
 */
export const PackIndexEntrySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  author: z.string(),
  version: z.string(),
  totalQuestions: z.number(),
  categoryCounts: z.record(CategorySchema, z.number()),
  downloadUrl: z.string().url(),
  checksum: z.string(),
  size: z.number(),
});
export type PackIndexEntry = z.infer<typeof PackIndexEntrySchema>;