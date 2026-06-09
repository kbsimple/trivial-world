/**
 * Tests for SHA-256 checksum utility
 * Per CLOUD-02: Checksum verification for integrity
 * Per D-12: Silent on success, error on mismatch
 */

import { describe, it, expect } from 'vitest';
import { computeSha256, verifyChecksum } from './checksum';

describe('computeSha256', () => {
  it('returns SHA-256 hex string (64 characters)', async () => {
    const content = 'test content';
    const checksum = await computeSha256(content);

    // SHA-256 produces 64 character hex string
    expect(checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns consistent checksum for same input', async () => {
    const content = 'test content';
    const checksum1 = await computeSha256(content);
    const checksum2 = await computeSha256(content);

    expect(checksum1).toBe(checksum2);
  });

  it('returns different checksum for different input', async () => {
    const checksum1 = await computeSha256('content one');
    const checksum2 = await computeSha256('content two');

    expect(checksum1).not.toBe(checksum2);
  });

  it('returns known checksum for known input', async () => {
    // Known SHA-256 hash of empty string
    const checksum = await computeSha256('');

    // SHA-256 of empty string is a known constant
    expect(checksum).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
  });

  it('handles empty string correctly', async () => {
    const checksum = await computeSha256('');

    // Empty string should produce valid 64-char hex
    expect(checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(checksum).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
  });

  it('handles special characters', async () => {
    const specialContent = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';
    const checksum = await computeSha256(specialContent);

    // Should produce valid 64-char hex
    expect(checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(checksum.length).toBe(64);
  });

  it('handles unicode characters', async () => {
    const unicodeContent = 'Hello 世界 🌍 émojis';
    const checksum = await computeSha256(unicodeContent);

    // Should produce valid 64-char hex
    expect(checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it('handles newlines and whitespace', async () => {
    const multilineContent = 'line1\nline2\rline3\r\nline4\ttabbed';
    const checksum = await computeSha256(multilineContent);

    // Should produce valid 64-char hex
    expect(checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it('handles long strings', async () => {
    // Create a long string (10KB)
    const longContent = 'x'.repeat(10 * 1024);
    const checksum = await computeSha256(longContent);

    // Should produce valid 64-char hex
    expect(checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(checksum.length).toBe(64);
  });

  it('handles JSON-like content', async () => {
    const jsonContent = JSON.stringify({
      name: 'Test Pack',
      questions: [
        { id: 'q-1', category: 'blue', questionText: 'Question?' },
        { id: 'q-2', category: 'pink', questionText: 'Another?' },
      ],
    });
    const checksum = await computeSha256(jsonContent);

    // Should produce valid 64-char hex
    expect(checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces consistent results across multiple calls', async () => {
    const content = 'consistency test';
    const checksums = await Promise.all([
      computeSha256(content),
      computeSha256(content),
      computeSha256(content),
    ]);

    // All should be identical
    expect(new Set(checksums).size).toBe(1);
  });
});

describe('verifyChecksum', () => {
  it('does not throw when checksum matches', async () => {
    const content = 'test content';
    const expectedChecksum = await computeSha256(content);

    // Should not throw
    await expect(verifyChecksum(content, expectedChecksum)).resolves.toBeUndefined();
  });

  it('throws when checksum does not match', async () => {
    const content = 'test content';
    const wrongChecksum = '0'.repeat(64); // Invalid checksum

    await expect(verifyChecksum(content, wrongChecksum)).rejects.toThrow(
      'Checksum mismatch'
    );
  });

  it('throws error with truncated checksums in message', async () => {
    const content = 'test content';
    const actualChecksum = await computeSha256(content);
    const wrongChecksum = '0'.repeat(64);

    try {
      await verifyChecksum(content, wrongChecksum);
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      const message = (error as Error).message;

      // Error message should contain first 8 chars of both checksums
      expect(message).toContain('expected 00000000...');
      expect(message).toContain(`got ${actualChecksum.substring(0, 8)}...`);
    }
  });

  it('verifies empty string with known checksum', async () => {
    const knownEmptyChecksum =
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    // Should not throw for correct checksum
    await expect(verifyChecksum('', knownEmptyChecksum)).resolves.toBeUndefined();
  });

  it('throws for empty string with wrong checksum', async () => {
    const wrongChecksum = 'a'.repeat(64);

    await expect(verifyChecksum('', wrongChecksum)).rejects.toThrow('Checksum mismatch');
  });

  it('verifies special characters correctly', async () => {
    const specialContent = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';
    const expectedChecksum = await computeSha256(specialContent);

    // Should not throw
    await expect(verifyChecksum(specialContent, expectedChecksum)).resolves.toBeUndefined();
  });

  it('verifies unicode content correctly', async () => {
    const unicodeContent = 'Hello 世界 🌍 émojis';
    const expectedChecksum = await computeSha256(unicodeContent);

    // Should not throw
    await expect(verifyChecksum(unicodeContent, expectedChecksum)).resolves.toBeUndefined();
  });

  it('verifies long strings correctly', async () => {
    const longContent = 'x'.repeat(10 * 1024);
    const expectedChecksum = await computeSha256(longContent);

    // Should not throw
    await expect(verifyChecksum(longContent, expectedChecksum)).resolves.toBeUndefined();
  });

  it('handles case sensitivity (checksums are lowercase hex)', async () => {
    const content = 'test content';
    const lowercaseChecksum = await computeSha256(content);
    const uppercaseChecksum = lowercaseChecksum.toUpperCase();

    // Lowercase should work
    await expect(verifyChecksum(content, lowercaseChecksum)).resolves.toBeUndefined();

    // Uppercase should fail (checksums are lowercase hex)
    await expect(verifyChecksum(content, uppercaseChecksum)).rejects.toThrow(
      'Checksum mismatch'
    );
  });
});