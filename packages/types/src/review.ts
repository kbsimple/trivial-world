import { z } from 'zod';
import { CategorySchema, DifficultySchema } from './category.js';
import { ContentHashSchema, QuestionIdSchema, FeedbackReasonSchema } from './ingest.js';

/**
 * Review export and decision-batch contracts (Phases 29-30).
 * `untrustedNote` is user-supplied text: consumers must treat it as data and
 * delimit it, never as instructions (REVW-01).
 */

export const REVIEW_SCHEMA_VERSION = 1 as const;
export const MAX_REVIEW_FEEDBACK_ITEMS = 200;
export const MAX_REVIEW_DECISIONS = 100;

export const ReviewDecisionKindSchema = z.enum(['keep', 'edit', 'retire', 'dismiss']);

export const ReviewExportItemSchema = z.strictObject({
  schemaVersion: z.literal(REVIEW_SCHEMA_VERSION),
  packId: z.uuid(),
  questionId: QuestionIdSchema,
  contentHash: ContentHashSchema,
  question: z.strictObject({
    questionText: z.string().min(1).max(500),
    answerText: z.string().min(1).max(200),
    choices: z.array(z.string().max(200)).max(6).optional(),
    tidbits: z.string().max(500).optional(),
    category: CategorySchema,
    difficulty: DifficultySchema.nullable(),
  }),
  stats: z.strictObject({
    timesAsked: z.number().int().min(0),
    timesCorrect: z.number().int().min(0),
  }),
  feedback: z
    .array(
      z.strictObject({
        feedbackId: z.uuid(),
        reason: FeedbackReasonSchema,
        untrustedNote: z.string().max(500).nullable(),
        receivedAt: z.iso.datetime(),
      }),
    )
    .max(MAX_REVIEW_FEEDBACK_ITEMS),
});

export const ProposedFixSchema = z
  .strictObject({
    questionText: z.string().min(1).max(500).optional(),
    answerText: z.string().min(1).max(200).optional(),
    choices: z.array(z.string().max(200)).max(6).optional(),
    tidbits: z.string().max(500).optional(),
  })
  .refine((f) => Object.keys(f).length > 0, { message: 'proposedFix must contain at least one field' });

export const ReviewDecisionSchema = z
  .strictObject({
    packId: z.uuid(),
    questionId: QuestionIdSchema,
    contentHash: ContentHashSchema,
    decision: ReviewDecisionKindSchema,
    proposedFix: ProposedFixSchema.optional(),
    rationale: z.string().min(1).max(2000),
    confidence: z.number().min(0).max(1),
    feedbackIds: z.array(z.uuid()).min(1).max(MAX_REVIEW_FEEDBACK_ITEMS),
  })
  .refine((d) => d.decision !== 'edit' || d.proposedFix !== undefined, {
    path: ['proposedFix'],
    message: 'proposedFix is required for edit decisions',
  });

export const ReviewDecisionBatchSchema = z.strictObject({
  schemaVersion: z.literal(REVIEW_SCHEMA_VERSION),
  batchId: z.uuid(),
  dryRun: z.boolean().default(false),
  decisions: z.array(ReviewDecisionSchema).min(1).max(MAX_REVIEW_DECISIONS),
});

export const ReviewItemResultSchema = z.strictObject({
  packId: z.uuid(),
  questionId: QuestionIdSchema,
  status: z.enum(['proposed', 'applied', 'stale', 'invalid', 'duplicate']),
  message: z.string().max(500).optional(),
});

export const ReviewBatchResponseSchema = z.strictObject({
  batchId: z.uuid(),
  dryRun: z.boolean(),
  results: z.array(ReviewItemResultSchema),
});

export type ReviewExportItem = z.infer<typeof ReviewExportItemSchema>;
export type ReviewDecision = z.infer<typeof ReviewDecisionSchema>;
export type ReviewDecisionBatch = z.infer<typeof ReviewDecisionBatchSchema>;
export type ReviewItemResult = z.infer<typeof ReviewItemResultSchema>;
export type ReviewBatchResponse = z.infer<typeof ReviewBatchResponseSchema>;
