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

// Ingest contracts
export {
  INGEST_SCHEMA_VERSION,
  MAX_BODY_BYTES,
  MAX_OUTCOMES,
  MAX_NOTE_CHARS,
  MAX_SEATS,
  ContentHashSchema,
  QuestionIdSchema,
  SeatSchema,
  OutcomeSchema,
  GameStatusSchema,
  GameRecordSchema,
  FeedbackReasonSchema,
  QuestionSnapshotSchema,
  FeedbackSchema,
  IngestReceiptSchema,
  ApiErrorCodeSchema,
  ApiErrorSchema,
  HealthResponseSchema,
} from './ingest.js';
export type {
  GameRecord,
  Outcome,
  Seat,
  Feedback,
  FeedbackReason,
  QuestionSnapshot,
  IngestReceipt,
  ApiError,
  ApiErrorCode,
  HealthResponse,
} from './ingest.js';

// Review contracts
export {
  REVIEW_SCHEMA_VERSION,
  MAX_REVIEW_FEEDBACK_ITEMS,
  MAX_REVIEW_DECISIONS,
  ReviewDecisionKindSchema,
  ReviewExportItemSchema,
  ProposedFixSchema,
  ReviewDecisionSchema,
  ReviewDecisionBatchSchema,
  ReviewItemResultSchema,
  ReviewBatchResponseSchema,
} from './review.js';
export type {
  ReviewExportItem,
  ReviewDecision,
  ReviewDecisionBatch,
  ReviewItemResult,
  ReviewBatchResponse,
} from './review.js';

// JSON Schema exports
export {
  questionPackJsonSchema,
  questionJsonSchema,
  packMetadataJsonSchema,
  packIndexEntryJsonSchema,
} from './json-schema.js';