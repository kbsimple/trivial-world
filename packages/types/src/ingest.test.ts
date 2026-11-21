import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  GameRecordSchema,
  FeedbackSchema,
  IngestReceiptSchema,
  ApiErrorSchema,
  HealthResponseSchema,
  MAX_OUTCOMES,
  MAX_BODY_BYTES,
} from './ingest.js';

const HASH = 'a'.repeat(64);

function outcome(seq: number, seat = 0) {
  return {
    seq,
    seat,
    packId: randomUUID(),
    questionId: 'q-1',
    contentHash: HASH,
    category: 'blue',
    difficulty: 'easy',
    correct: true,
  };
}

function validGame(): any {
  return {
    schemaVersion: 1,
    gameId: randomUUID(),
    installId: randomUUID(),
    status: 'finished',
    startedAt: '2026-11-17T10:00:00.000Z',
    endedAt: '2026-11-17T10:30:00.000Z',
    playerCount: 2,
    winnerSeat: 1,
    championshipReached: true,
    seats: [
      { seat: 0, packIds: [randomUUID()], comboId: null, difficulty: null },
      { seat: 1, packIds: [], comboId: randomUUID(), difficulty: 'hard' },
    ],
    outcomes: [outcome(0, 0), outcome(1, 1), outcome(2, 0)],
  };
}

function validFeedback(): any {
  return {
    schemaVersion: 1,
    feedbackId: randomUUID(),
    installId: randomUUID(),
    gameId: randomUUID(),
    packId: randomUUID(),
    questionId: 'q-1',
    contentHash: HASH,
    reason: 'typo',
    note: 'looks wrong',
    questionSnapshot: {
      questionText: 'Q?',
      answerText: 'A',
      choices: ['A', 'B'],
      category: 'pink',
      difficulty: 'medium',
    },
    createdAt: '2026-11-17T10:00:00.000Z',
  };
}

describe('constants', () => {
  it('caps', () => {
    expect(MAX_BODY_BYTES).toBe(65536);
    expect(MAX_OUTCOMES).toBe(500);
  });
});

describe('GameRecordSchema', () => {
  it('parses a valid finished game', () => {
    expect(GameRecordSchema.safeParse(validGame()).success).toBe(true);
  });
  it('parses an abandoned game with no winner and no outcomes', () => {
    const g = validGame();
    g.status = 'abandoned';
    g.winnerSeat = null;
    g.outcomes = [];
    expect(GameRecordSchema.safeParse(g).success).toBe(true);
  });
  it('rejects extra top-level key (players)', () => {
    const g = validGame();
    g.players = [{ name: 'Ann' }];
    const r = GameRecordSchema.safeParse(g);
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error!.issues)).toContain('unrecognized_keys');
  });
  it('rejects name on a seat', () => {
    const g = validGame();
    g.seats[0].name = 'Ann';
    expect(GameRecordSchema.safeParse(g).success).toBe(false);
  });
  it('rejects extra key on an outcome', () => {
    const g = validGame();
    g.outcomes[0].extra = 1;
    expect(GameRecordSchema.safeParse(g).success).toBe(false);
  });
  it('accepts 500 outcomes and rejects 501', () => {
    const g = validGame();
    g.outcomes = Array.from({ length: 500 }, (_, i) => outcome(i));
    expect(GameRecordSchema.safeParse(g).success).toBe(true);
    g.outcomes = Array.from({ length: 501 }, (_, i) => outcome(i));
    expect(GameRecordSchema.safeParse(g).success).toBe(false);
  });
  it('rejects schemaVersion 2', () => {
    const g = validGame();
    g.schemaVersion = 2;
    expect(GameRecordSchema.safeParse(g).success).toBe(false);
  });
  it('rejects non-RFC-4122 installId', () => {
    const g = validGame();
    g.installId = 'fc00d001-f00d-0000-0000-000000000000';
    expect(GameRecordSchema.safeParse(g).success).toBe(false);
  });
  it('rejects seats.length != playerCount', () => {
    const g = validGame();
    g.playerCount = 3;
    expect(GameRecordSchema.safeParse(g).success).toBe(false);
  });
  it('rejects duplicate seat values', () => {
    const g = validGame();
    g.seats[1].seat = 0;
    expect(GameRecordSchema.safeParse(g).success).toBe(false);
  });
  it('rejects seat >= playerCount', () => {
    const g = validGame();
    g.seats[1].seat = 5;
    expect(GameRecordSchema.safeParse(g).success).toBe(false);
  });
  it('rejects duplicate outcome seq', () => {
    const g = validGame();
    g.outcomes[1].seq = 0;
    expect(GameRecordSchema.safeParse(g).success).toBe(false);
  });
  it('rejects outcome seat >= playerCount', () => {
    const g = validGame();
    g.outcomes[0].seat = 2;
    expect(GameRecordSchema.safeParse(g).success).toBe(false);
  });
  it('rejects winnerSeat >= playerCount', () => {
    const g = validGame();
    g.winnerSeat = 2;
    expect(GameRecordSchema.safeParse(g).success).toBe(false);
  });
  it('rejects finished with null winner', () => {
    const g = validGame();
    g.winnerSeat = null;
    expect(GameRecordSchema.safeParse(g).success).toBe(false);
  });
  it('rejects endedAt before startedAt', () => {
    const g = validGame();
    g.endedAt = '2026-11-17T09:00:00.000Z';
    expect(GameRecordSchema.safeParse(g).success).toBe(false);
  });
  it('rejects bad contentHash (63 chars, uppercase)', () => {
    const g = validGame();
    g.outcomes[0].contentHash = 'a'.repeat(63);
    expect(GameRecordSchema.safeParse(g).success).toBe(false);
    g.outcomes[0].contentHash = 'A'.repeat(64);
    expect(GameRecordSchema.safeParse(g).success).toBe(false);
  });
  it('rejects bad questionId', () => {
    const g = validGame();
    g.outcomes[0].questionId = 'Bad Id!';
    expect(GameRecordSchema.safeParse(g).success).toBe(false);
  });
});

describe('FeedbackSchema', () => {
  it('parses a valid feedback', () => {
    expect(FeedbackSchema.safeParse(validFeedback()).success).toBe(true);
  });
  it('accepts null/omitted gameId and omitted note', () => {
    const f = validFeedback();
    f.gameId = null;
    delete f.note;
    expect(FeedbackSchema.safeParse(f).success).toBe(true);
    delete f.gameId;
    expect(FeedbackSchema.safeParse(f).success).toBe(true);
  });
  it('rejects note of 501 chars, accepts 500', () => {
    const f = validFeedback();
    f.note = 'x'.repeat(500);
    expect(FeedbackSchema.safeParse(f).success).toBe(true);
    f.note = 'x'.repeat(501);
    expect(FeedbackSchema.safeParse(f).success).toBe(false);
  });
  it('requires a note for reason other', () => {
    const f = validFeedback();
    f.reason = 'other';
    delete f.note;
    expect(FeedbackSchema.safeParse(f).success).toBe(false);
    f.note = '   ';
    expect(FeedbackSchema.safeParse(f).success).toBe(false);
    f.note = 'explained';
    expect(FeedbackSchema.safeParse(f).success).toBe(true);
  });
  it('rejects unknown key', () => {
    const f = validFeedback();
    f.playerName = 'Ann';
    expect(FeedbackSchema.safeParse(f).success).toBe(false);
  });
  it('rejects extra key in questionSnapshot', () => {
    const f = validFeedback();
    f.questionSnapshot.extra = 1;
    expect(FeedbackSchema.safeParse(f).success).toBe(false);
  });
});

describe('response schemas', () => {
  it('receipt', () => {
    expect(
      IngestReceiptSchema.safeParse({ id: randomUUID(), receivedAt: '2026-11-17T10:00:00.000Z' }).success,
    ).toBe(true);
  });
  it('api error with issues cap 20', () => {
    const issue = { path: 'a', message: 'b' };
    expect(ApiErrorSchema.safeParse({ error: 'invalid_request', issues: Array(20).fill(issue) }).success).toBe(true);
    expect(ApiErrorSchema.safeParse({ error: 'invalid_request', issues: Array(21).fill(issue) }).success).toBe(false);
    expect(ApiErrorSchema.safeParse({ error: 'rate_limited' }).success).toBe(true);
  });
  it('health', () => {
    expect(
      HealthResponseSchema.safeParse({
        status: 'ok',
        db: { status: 'ok', latencyMs: 3 },
        time: '2026-11-17T10:00:00.000Z',
      }).success,
    ).toBe(true);
    expect(
      HealthResponseSchema.safeParse({
        status: 'degraded',
        db: { status: 'down', latencyMs: null },
        time: '2026-11-17T10:00:00.000Z',
      }).success,
    ).toBe(true);
  });
});
