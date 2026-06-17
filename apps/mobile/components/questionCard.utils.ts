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

const CHOICE_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * Resolves the correct choice index for a multiple-choice question.
 *
 * Uses `correctChoiceIndex` when present. Falls back to parsing a "(C)"-style
 * letter from `answerText` — needed for embedded-MC questions where choices are
 * stored inside questionText and correctness is only expressed in answerText.
 */
export function resolveCorrectChoiceIndex(
  correctChoiceIndex: number | null | undefined,
  answerText: string | undefined,
): number | undefined {
  if (correctChoiceIndex != null) return correctChoiceIndex;
  if (!answerText) return undefined;
  const match = answerText.match(/\(([A-F])\)/);
  if (!match) return undefined;
  const idx = CHOICE_LABELS.indexOf(match[1]);
  return idx >= 0 ? idx : undefined;
}
