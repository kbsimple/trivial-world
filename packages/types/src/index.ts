// Category types
export { CategorySchema, DifficultySchema, CATEGORY_NAMES } from './category.js';
export type { Category, Difficulty } from './category.js';

// Question pack types
export {
  QuestionSchema,
  PackMetadataSchema,
  QuestionPackSchema,
  PackIndexEntrySchema,
  PackComboSchema,
} from './question-pack.js';
export type { Question, PackMetadata, QuestionPack, PackIndexEntry, PackCombo } from './question-pack.js';

// JSON Schema exports
export {
  questionPackJsonSchema,
  questionJsonSchema,
  packMetadataJsonSchema,
  packIndexEntryJsonSchema,
} from './json-schema.js';