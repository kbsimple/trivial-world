import { z } from 'zod';
import { CategorySchema, DifficultySchema } from './category.js';

/**
 * Ingest wire contracts (game records, feedback, receipts, errors, health).
 *
 * These schemas are the single source of truth for the server (Phase 25) and
 * client pre-validation (Phases 26-30). Bumping INGEST_SCHEMA_VERSION requires
 * a server change: the server accepts the current version only (D-11).
 *
 * All objects are strict (unknown keys rejected). There is deliberately no
 * player-name field anywhere (D-10); seats are indexes only.
 */

export const INGEST_SCHEMA_VERSION = 1 as const;
export const MAX_BODY_BYTES = 65536; // 64 KB (D-08)
export const MAX_OUTCOMES = 500; // D-08
export const MAX_NOTE_CHARS = 500; // D-08
export const MAX_SEATS = 8;

const MAX_SEAT_INDEX = MAX_SEATS - 1;

export const ContentHashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const QuestionIdSchema = z.string().max(100).regex(/^[a-z0-9-]+$/);

export const SeatSchema = z.strictObject({
  seat: z.number().int().min(0).max(MAX_SEAT_INDEX),
  packIds: z.array(z.uuid()).max(20),
  comboId: z.uuid().nullable(),
  difficulty: DifficultySchema.nullable(),
});

export const OutcomeSchema = z.strictObject({
  seq: z.number().int().min(0).max(9999),
  seat: z.number().int().min(0).max(MAX_SEAT_INDEX),
  packId: z.uuid(),
  questionId: QuestionIdSchema,
  contentHash: ContentHashSchema,
  category: CategorySchema,
  difficulty: DifficultySchema.nullable(),
  correct: z.boolean(),
});

export const GameStatusSchema = z.enum(['finished', 'abandoned']);

export const GameRecordSchema = z
  .strictObject({
    schemaVersion: z.literal(INGEST_SCHEMA_VERSION),
    gameId: z.uuid(),
    installId: z.uuid(),
    status: GameStatusSchema,
    startedAt: z.iso.datetime(),
    endedAt: z.iso.datetime(),
    playerCount: z.number().int().min(1).max(MAX_SEATS),
    winnerSeat: z.number().int().min(0).max(MAX_SEAT_INDEX).nullable(),
    championshipReached: z.boolean(),
    seats: z.array(SeatSchema).min(1).max(MAX_SEATS),
    outcomes: z.array(OutcomeSchema).max(MAX_OUTCOMES),
  })
  .superRefine((g, ctx) => {
    if (g.seats.length !== g.playerCount) {
      ctx.addIssue({ code: 'custom', path: ['seats'], message: 'seats.length must equal playerCount' });
    }
    const seen = new Set<number>();
    g.seats.forEach((s, i) => {
      if (s.seat >= g.playerCount) {
        ctx.addIssue({ code: 'custom', path: ['seats', i, 'seat'], message: 'seat must be < playerCount' });
      }
      if (seen.has(s.seat)) {
        ctx.addIssue({ code: 'custom', path: ['seats', i, 'seat'], message: 'duplicate seat' });
      }
      seen.add(s.seat);
    });
    const seqs = new Set<number>();
    g.outcomes.forEach((o, i) => {
      if (o.seat >= g.playerCount) {
        ctx.addIssue({ code: 'custom', path: ['outcomes', i, 'seat'], message: 'seat must be < playerCount' });
      }
      if (seqs.has(o.seq)) {
        ctx.addIssue({ code: 'custom', path: ['outcomes', i, 'seq'], message: 'duplicate seq' });
      }
      seqs.add(o.seq);
    });
    if (g.winnerSeat !== null && g.winnerSeat >= g.playerCount) {
      ctx.addIssue({ code: 'custom', path: ['winnerSeat'], message: 'winnerSeat must be < playerCount' });
    }
    if (g.status === 'finished' && g.winnerSeat === null) {
      ctx.addIssue({ code: 'custom', path: ['winnerSeat'], message: 'finished game requires winnerSeat' });
    }
    if (Date.parse(g.endedAt) < Date.parse(g.startedAt)) {
      ctx.addIssue({ code: 'custom', path: ['endedAt'], message: 'endedAt must not precede startedAt' });
    }
  });

export const FeedbackReasonSchema = z.enum([
  'wrong_answer',
  'ambiguous',
  'outdated',
  'typo',
  'offensive',
  'other',
]);

export const QuestionSnapshotSchema = z.strictObject({
  questionText: z.string().min(1).max(500),
  answerText: z.string().min(1).max(200),
  choices: z.array(z.string().max(200)).max(6).optional(),
  category: CategorySchema,
  difficulty: DifficultySchema.nullable().optional(),
});

export const FeedbackSchema = z
  .strictObject({
    schemaVersion: z.literal(INGEST_SCHEMA_VERSION),
    feedbackId: z.uuid(),
    installId: z.uuid(),
    gameId: z.uuid().nullable().optional(),
    packId: z.uuid(),
    questionId: QuestionIdSchema,
    contentHash: ContentHashSchema,
    reason: FeedbackReasonSchema,
    note: z.string().max(MAX_NOTE_CHARS).optional(),
    questionSnapshot: QuestionSnapshotSchema,
    createdAt: z.iso.datetime(),
  })
  .superRefine((f, ctx) => {
    if (f.reason === 'other' && (f.note ?? '').trim().length === 0) {
      ctx.addIssue({ code: 'custom', path: ['note'], message: 'note is required when reason is other' });
    }
  });

export const IngestReceiptSchema = z.strictObject({
  id: z.uuid(),
  receivedAt: z.iso.datetime(),
});

export const ApiErrorCodeSchema = z.enum([
  'invalid_request',
  'payload_too_large',
  'rate_limited',
  'method_not_allowed',
  'not_found',
  'backend_disabled',
  'internal_error',
]);

export const ApiErrorSchema = z.strictObject({
  error: ApiErrorCodeSchema,
  issues: z
    .array(z.strictObject({ path: z.string(), message: z.string() }))
    .max(20)
    .optional(),
});

export const HealthResponseSchema = z.strictObject({
  status: z.enum(['ok', 'degraded']),
  db: z.strictObject({
    status: z.enum(['ok', 'down']),
    latencyMs: z.number().nullable(),
  }),
  time: z.iso.datetime(),
});

export type Seat = z.infer<typeof SeatSchema>;
export type Outcome = z.infer<typeof OutcomeSchema>;
export type GameRecord = z.infer<typeof GameRecordSchema>;
export type FeedbackReason = z.infer<typeof FeedbackReasonSchema>;
export type QuestionSnapshot = z.infer<typeof QuestionSnapshotSchema>;
export type Feedback = z.infer<typeof FeedbackSchema>;
export type IngestReceipt = z.infer<typeof IngestReceiptSchema>;
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
