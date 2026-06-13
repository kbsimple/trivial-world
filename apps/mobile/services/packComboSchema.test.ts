import { describe, it, expect } from 'vitest';
import { PackComboSchema } from '@trivial-world/types';

/**
 * TDD tests for PackComboSchema (Phase 18, Plan 01)
 */
describe('PackComboSchema', () => {
  const validUuid1 = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const validUuid2 = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
  const validUuid3 = 'c3d4e5f6-a7b8-9012-cdef-123456789012';

  const validCombo = {
    id: validUuid1,
    name: 'Mix',
    packIds: [validUuid2, validUuid3],
    createdAt: '2026-06-13T00:00:00.000Z',
  };

  it('parses a valid combo successfully', () => {
    const result = PackComboSchema.safeParse(validCombo);
    expect(result.success).toBe(true);
  });

  it('rejects a combo with an empty name (min 1)', () => {
    const result = PackComboSchema.safeParse({ ...validCombo, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a combo with a name exceeding 50 characters (max 50)', () => {
    const result = PackComboSchema.safeParse({ ...validCombo, name: 'x'.repeat(51) });
    expect(result.success).toBe(false);
  });

  it('accepts a combo with a name of exactly 50 characters', () => {
    const result = PackComboSchema.safeParse({ ...validCombo, name: 'x'.repeat(50) });
    expect(result.success).toBe(true);
  });

  it('rejects a combo with only 1 pack ID (min 2)', () => {
    const result = PackComboSchema.safeParse({ ...validCombo, packIds: [validUuid2] });
    expect(result.success).toBe(false);
  });

  it('rejects a combo with a non-UUID in packIds', () => {
    const result = PackComboSchema.safeParse({ ...validCombo, packIds: ['not-a-uuid', validUuid2] });
    expect(result.success).toBe(false);
  });

  it('accepts a combo with 3 or more pack IDs', () => {
    const result = PackComboSchema.safeParse({ ...validCombo, packIds: [validUuid1, validUuid2, validUuid3] });
    expect(result.success).toBe(true);
  });

  it('rejects a combo with a non-UUID id field', () => {
    const result = PackComboSchema.safeParse({ ...validCombo, id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects a combo with a non-ISO createdAt', () => {
    const result = PackComboSchema.safeParse({ ...validCombo, createdAt: '2026-06-13' });
    expect(result.success).toBe(false);
  });
});
