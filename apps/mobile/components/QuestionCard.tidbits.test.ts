import { describe, it, expect } from 'vitest';

/**
 * TDD tests for QuestionCard tidbits display logic (Phase 16, Plan 04)
 *
 * These tests verify the conditional rendering logic for tidbits:
 * - tidbits shown only when revealed=true AND tidbits is non-empty
 * - tidbits NOT shown when revealed=false
 * - tidbits NOT shown when tidbits is undefined
 *
 * shouldShowTidbits is a pure helper exported from questionCard.utils.ts
 * that mirrors the JSX conditional: `{revealed && tidbits && <Text>...}`
 *
 * NOTE: questionCard.utils.ts does NOT yet exist.
 * These tests will FAIL (RED) until the file is created.
 */
import { shouldShowTidbits, resolveCorrectChoiceIndex } from './questionCard.utils';

describe('QuestionCard tidbits display logic', () => {
  describe('shouldShowTidbits', () => {
    it('returns true when revealed=true and tidbits is a non-empty string', () => {
      expect(shouldShowTidbits(true, "Iron Man's suit is made of titanium-gold alloy.")).toBe(true);
    });

    it('returns false when revealed=false even if tidbits is provided', () => {
      expect(shouldShowTidbits(false, 'some interesting fact')).toBe(false);
    });

    it('returns false when revealed=true but tidbits is undefined', () => {
      expect(shouldShowTidbits(true, undefined)).toBe(false);
    });

    it('returns false when revealed=true but tidbits is empty string', () => {
      expect(shouldShowTidbits(true, '')).toBe(false);
    });

    it('returns false when both revealed=false and tidbits=undefined', () => {
      expect(shouldShowTidbits(false, undefined)).toBe(false);
    });
  });

  describe('resolveCorrectChoiceIndex', () => {
    it('returns the explicit correctChoiceIndex when provided', () => {
      expect(resolveCorrectChoiceIndex(2, '36 (C)')).toBe(2);
    });

    it('returns 0 for explicit index 0', () => {
      expect(resolveCorrectChoiceIndex(0, '30 (A)')).toBe(0);
    });

    it('derives index from "(A)" in answerText when correctChoiceIndex is null', () => {
      expect(resolveCorrectChoiceIndex(null, '30 (A)')).toBe(0);
    });

    it('derives index from "(B)" in answerText when correctChoiceIndex is undefined', () => {
      expect(resolveCorrectChoiceIndex(undefined, '35 (B)')).toBe(1);
    });

    it('derives index from "(C)" in answerText — the World Wide Web case', () => {
      expect(resolveCorrectChoiceIndex(null, '36 (C)')).toBe(2);
    });

    it('derives index from "(D)" in answerText', () => {
      expect(resolveCorrectChoiceIndex(null, 'Some answer (D)')).toBe(3);
    });

    it('returns undefined when answerText has no "(X)" pattern', () => {
      expect(resolveCorrectChoiceIndex(null, 'Just an answer with no letter')).toBeUndefined();
    });

    it('returns undefined when both correctChoiceIndex and answerText are absent', () => {
      expect(resolveCorrectChoiceIndex(undefined, undefined)).toBeUndefined();
    });

    it('prefers explicit index over answerText when both are present', () => {
      // Index says 0 (A), answerText says (C) — explicit wins
      expect(resolveCorrectChoiceIndex(0, 'something (C)')).toBe(0);
    });
  });
});
