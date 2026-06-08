import { z } from 'zod';
import { QuestionPackSchema, QuestionSchema, PackMetadataSchema, PackIndexEntrySchema } from './question-pack.js';

/**
 * JSON Schema exports for validation in non-TypeScript environments
 * Uses JSON Schema draft-07 format for broad compatibility
 *
 * Note: Zod v4 includes built-in JSON Schema conversion via z.toJSONSchema()
 */

export const questionPackJsonSchema = z.toJSONSchema(QuestionPackSchema);

export const questionJsonSchema = z.toJSONSchema(QuestionSchema);

export const packMetadataJsonSchema = z.toJSONSchema(PackMetadataSchema);

export const packIndexEntryJsonSchema = z.toJSONSchema(PackIndexEntrySchema);