import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';
import { PlayerColor } from '../constants/categories';
import { CategoryBadge } from './CategoryBadge';
import { Difficulty } from '../types/question';
import { resolveCorrectChoiceIndex } from './questionCard.utils';

const CHOICE_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; color: string; size: number }> = {
  easy:   { label: 'E', color: '#4caf50', size: 11 },
  medium: { label: 'M', color: '#ff9800', size: 11 },
  hard:   { label: 'H', color: '#f44336', size: 11 },
};

// Parse "Question text? A) opt1, B) opt2, C) opt3, D) opt4" into stem + options array.
function parseEmbeddedMC(text: string): { stem: string; options: string[] } | null {
  const aIdx = text.search(/\bA\)\s/);
  if (aIdx === -1) return null;
  const stem = text.slice(0, aIdx).trim();
  const optionsPart = text.slice(aIdx);
  const parts = optionsPart
    .split(/\s*\b[B-F]\)\s+/)
    .map(s => s.replace(/^A\)\s+/, '').replace(/,\s*$/, '').trim())
    .filter(Boolean);
  return parts.length >= 2 ? { stem, options: parts } : null;
}

interface QuestionCardProps {
  questionNumber: number;
  category: PlayerColor;
  questionText: string;
  revealed: boolean;
  choices?: string[];
  correctChoiceIndex?: number;
  answerText?: string;
  difficulty?: Difficulty;
  tidbits?: string;
}

/**
 * QuestionCard component
 * Renders: category badge, difficulty badge, question number, question stem, MC choices.
 * Reveal button, answer text, and tidbits are rendered by the parent screen (question.tsx).
 *
 * MC flow: choices always visible (conductor reads them aloud), `revealed` prop
 * highlights the correct choice. Correct/Incorrect buttons follow in the parent footer.
 *
 * Per D-09: Large centered text for arm's-distance reading (24pt minimum)
 * Per D-11: Question number shown as "Q1", "Q2", etc.
 * Per D-12: Answer hidden by default — reveal handled by parent screen
 * Per D-14: Minimal chrome
 */
export function QuestionCard({
  questionNumber,
  category,
  questionText,
  revealed,
  choices,
  correctChoiceIndex,
  answerText,
  difficulty,
  tidbits,
}: QuestionCardProps) {
  const theme = useTheme();

  // Prefer explicit choices array; fall back to parsing embedded MC options from questionText.
  const parsed = (!choices || choices.length === 0) ? parseEmbeddedMC(questionText) : null;
  const resolvedChoices = choices && choices.length > 0 ? choices : parsed?.options ?? null;
  const resolvedStem = parsed ? parsed.stem : questionText;
  const isMultipleChoice = Array.isArray(resolvedChoices) && resolvedChoices.length > 0;

  // Resolve correct index: explicit prop first; falls back to "(C)"-style parsing from answerText
  // for embedded-MC questions that lack a correctChoiceIndex field.
  const resolvedCorrectIndex = resolveCorrectChoiceIndex(correctChoiceIndex, answerText);

  const diffConfig = difficulty ? DIFFICULTY_CONFIG[difficulty] : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background?.val as string }]}>
      <View style={styles.headerRow}>
        <CategoryBadge category={category} size="$4" />
      </View>

      <View style={styles.questionRow}>
        <Text style={[styles.questionNumber, { color: theme.color?.val as string }]}>
          Q{questionNumber}
        </Text>
        {diffConfig && (
          <View style={[styles.difficultyBadge, { borderColor: diffConfig.color }]}>
            <Text style={[styles.difficultyLabel, { color: diffConfig.color, fontSize: diffConfig.size }]}>
              {diffConfig.label}
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.questionText, { color: theme.color?.val as string }]}>
        {resolvedStem}
      </Text>

      {isMultipleChoice && (
        <View style={styles.choicesContainer}>
          {resolvedChoices!.map((choice, index) => {
            const isCorrect = index === resolvedCorrectIndex;
            const revealedInlineStyle = revealed
              ? isCorrect
                ? { backgroundColor: '#16a34a', borderWidth: 2, borderColor: '#22c55e' }
                : { borderWidth: 2, borderColor: '#333', opacity: 0.4 }
              : undefined;

            return (
              <View key={index} style={[styles.choiceRow, styles.choiceDefault, revealedInlineStyle]}>
                <Text style={[styles.choiceLabel, revealed && isCorrect && styles.choiceLabelCorrect]}>
                  {CHOICE_LABELS[index]}
                </Text>
                <Text style={[styles.choiceText, revealed && isCorrect && styles.choiceTextCorrect]}>
                  {choice}
                </Text>
              </View>
            );
          })}

          {revealed && tidbits && (
            <Text style={styles.tidbitsText}>
              {tidbits}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  difficultyBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  difficultyLabel: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  questionNumber: {
    fontSize: 16,
    opacity: 0.7,
  },
  questionText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
  },
  choicesContainer: {
    width: '100%',
    marginTop: 20,
    gap: 8,
    paddingHorizontal: 8,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  choiceDefault: {
    borderWidth: 2,
    borderColor: '#444',
  },
  choiceCorrect: {
    backgroundColor: '#16a34a',
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  choiceWrong: {
    borderWidth: 2,
    borderColor: '#333',
    opacity: 0.4,
  },
  choiceLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#aaa',
    width: 22,
    textAlign: 'center',
  },
  choiceLabelCorrect: {
    color: '#7dde8f',
  },
  choiceText: {
    fontSize: 16,
    color: '#ddd',
    flex: 1,
  },
  choiceTextCorrect: {
    color: '#ffffff',
    fontWeight: '600',
  },
  tidbitsText: {
    fontSize: 20,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 8,
    opacity: 0.6,
    fontStyle: 'italic',
    color: '#ccc',
  },
});
