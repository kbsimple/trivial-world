/**
 * Pure utility functions for QuestionCard component logic.
 * Extracted to enable unit testing without React Native renderer.
 */

/**
 * Returns true when tidbits should be displayed below the answer.
 * Mirrors the JSX conditional: `{revealed && tidbits && <Text>...}`
 *
 * @param revealed - Whether the answer has been revealed
 * @param tidbits - Optional interesting fact string to show after reveal
 */
export function shouldShowTidbits(
  revealed: boolean,
  tidbits: string | undefined,
): boolean {
  return revealed && !!tidbits;
}
