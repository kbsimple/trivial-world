/**
 * SHA-256 checksum utility for pack verification
 * Per CLOUD-02: Checksum verification for integrity
 * Per D-12: Silent on success, error on mismatch
 */

/**
 * Compute SHA-256 hash of a string
 * Uses Web Crypto API (available in React Native via polyfill)
 *
 * @param content - The string content to hash
 * @returns Promise resolving to hex string of SHA-256 hash
 */
export async function computeSha256(content: string): Promise<string> {
  // Encode string as UTF-8
  const encoder = new TextEncoder();
  const data = encoder.encode(content);

  // Compute SHA-256 using Web Crypto API
  // React Native provides crypto.subtle via polyfill
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Verify checksum matches expected value
 * Per D-12: Silent on success (no return), throws on mismatch
 *
 * @param content - The content to hash
 * @param expectedChecksum - The expected SHA-256 hex string
 * @throws Error if checksum does not match
 */
export async function verifyChecksum(content: string, expectedChecksum: string): Promise<void> {
  const computed = await computeSha256(content);

  if (computed !== expectedChecksum) {
    throw new Error(
      `Checksum mismatch: expected ${expectedChecksum.substring(0, 8)}..., got ${computed.substring(0, 8)}...`
    );
  }
  // Per D-12: Silent on success (no return value needed)
}