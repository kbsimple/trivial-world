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
import { shouldShowTidbits } from './questionCard.utils';

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
});
