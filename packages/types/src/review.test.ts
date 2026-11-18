import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  ReviewExportItemSchema,
  ReviewDecisionBatchSchema,
  ReviewBatchResponseSchema,
} from './review.js';

const HASH = 'b'.repeat(64);

function feedbackEntry(): any {
  return {
    feedbackId: randomUUID(),
    reason: 'typo',
    untrustedNote: 'some note',
    receivedAt: '2026-11-17T10:00:00.000Z',
  };
}

function exportItem(): any {
  return {
    schemaVersion: 1,
    packId: randomUUID(),
    questionId: 'q-1',
    contentHash: HASH,
    question: {
      questionText: 'Q?',
      answerText: 'A',
      choices: ['A', 'B'],
      tidbits: 'fun fact',
      category: 'green',
      difficulty: 'hard',
    },
    stats: { timesAsked: 10, timesCorrect: 4 },
    feedback: [feedbackEntry(), { ...feedbackEntry(), untrustedNote: null }],
  };
}

function decision(over: any = {}): any {
  return {
    packId: randomUUID(),
    questionId: 'q-1',
    contentHash: HASH,
    decision: 'keep',
    rationale: 'fine as is',
    confidence: 0.8,
    feedbackIds: [randomUUID()],
    ...over,
  };
}

function batch(decisions: any[]): any {
  return { schemaVersion: 1, batchId: randomUUID(), decisions };
}

describe('ReviewExportItemSchema', () => {
  it('parses a valid item', () => {
    expect(ReviewExportItemSchema.safeParse(exportItem()).success).toBe(true);
  });
  it('rejects 201 feedback entries', () => {
    const i = exportItem();
    i.feedback = Array.from({ length: 201 }, feedbackEntry);
    expect(ReviewExportItemSchema.safeParse(i).success).toBe(false);
    i.feedback = Array.from({ length: 200 }, feedbackEntry);
    expect(ReviewExportItemSchema.safeParse(i).success).toBe(true);
  });
  it('rejects untrustedNote over 500 chars', () => {
    const i = exportItem();
    i.feedback[0].untrustedNote = 'x'.repeat(501);
    expect(ReviewExportItemSchema.safeParse(i).success).toBe(false);
  });
  it('rejects extra key', () => {
    const i = exportItem();
    i.extra = true;
    expect(ReviewExportItemSchema.safeParse(i).success).toBe(false);
  });
});

describe('ReviewDecisionBatchSchema', () => {
  it('parses 3 decisions and defaults dryRun to false', () => {
    const r = ReviewDecisionBatchSchema.safeParse(batch([decision(), decision(), decision()]));
    expect(r.success).toBe(true);
    expect(r.data!.dryRun).toBe(false);
  });
  it('rejects edit without proposedFix', () => {
    expect(ReviewDecisionBatchSchema.safeParse(batch([decision({ decision: 'edit' })])).success).toBe(false);
  });
  it('rejects edit with empty proposedFix', () => {
    expect(
      ReviewDecisionBatchSchema.safeParse(batch([decision({ decision: 'edit', proposedFix: {} })])).success,
    ).toBe(false);
  });
  it('accepts edit with proposedFix', () => {
    expect(
      ReviewDecisionBatchSchema.safeParse(
        batch([decision({ decision: 'edit', proposedFix: { answerText: 'B' } })]),
      ).success,
    ).toBe(true);
  });
  it('rejects confidence 1.2', () => {
    expect(ReviewDecisionBatchSchema.safeParse(batch([decision({ confidence: 1.2 })])).success).toBe(false);
  });
  it('rejects empty feedbackIds', () => {
    expect(ReviewDecisionBatchSchema.safeParse(batch([decision({ feedbackIds: [] })])).success).toBe(false);
  });
  it('rejects 101 decisions', () => {
    expect(
      ReviewDecisionBatchSchema.safeParse(batch(Array.from({ length: 101 }, () => decision()))).success,
    ).toBe(false);
  });
  it('rejects schemaVersion 2', () => {
    const b = batch([decision()]);
    b.schemaVersion = 2;
    expect(ReviewDecisionBatchSchema.safeParse(b).success).toBe(false);
  });
});

describe('ReviewBatchResponseSchema', () => {
  it('accepts every status', () => {
    const results = ['proposed', 'applied', 'stale', 'invalid', 'duplicate'].map((status) => ({
      packId: randomUUID(),
      questionId: 'q-1',
      status,
    }));
    expect(
      ReviewBatchResponseSchema.safeParse({ batchId: randomUUID(), dryRun: true, results }).success,
    ).toBe(true);
  });
});
