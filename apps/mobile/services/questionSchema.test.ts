import { describe, it, expect } from 'vitest';
import { QuestionSchema } from '@trivial-world/types';

/**
 * TDD test for QuestionSchema tidbits field (Phase 16, Plan 01)
 */
describe('QuestionSchema tidbits field', () => {
  const baseQuestion = {
    id: 'q-001',
    category: 'blue',
    questionText: 'What is the largest continent on Earth?',
    answerText: 'Asia',
  };

  it('accepts a question with a valid tidbits string', () => {
    const result = QuestionSchema.safeParse({
      ...baseQuestion,
      tidbits: 'Fun fact: Asia covers about 30% of Earth\'s total land area.',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tidbits).toBe('Fun fact: Asia covers about 30% of Earth\'s total land area.');
    }
  });

  it('accepts a question without tidbits (tidbits is optional)', () => {
    const result = QuestionSchema.safeParse(baseQuestion);
    expect(result.success).toBe(true);
  });

  it('rejects a tidbits string exceeding 500 characters', () => {
    const result = QuestionSchema.safeParse({
      ...baseQuestion,
      tidbits: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('preserves tidbits value through parse round-trip', () => {
    const tidbit = 'Asia spans 44.58 million km² and contains 48 countries.';
    const result = QuestionSchema.parse({ ...baseQuestion, tidbits: tidbit });
    expect(result.tidbits).toBe(tidbit);
  });
});
