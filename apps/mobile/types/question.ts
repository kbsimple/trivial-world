/**
 * Question types - re-exported from @trivial-world/types
 * Single source of truth for question pack contracts
 *
 * This file maintains backward compatibility with existing imports
 * while delegating to the shared types package.
 */

// Re-export all question-related types from shared package
export {
  QuestionSchema,
  PackMetadataSchema,
  QuestionPackSchema,
  type Question,
  type PackMetadata,
  type QuestionPack,
} from '@trivial-world/types';

// Re-export difficulty type for backward compatibility
export { DifficultySchema, type Difficulty } from '@trivial-world/types';

// Legacy type alias for backward compatibility
// Note: QuestionDifficulty is now Difficulty in the shared package
export type QuestionDifficulty = import('@trivial-world/types').Difficulty;