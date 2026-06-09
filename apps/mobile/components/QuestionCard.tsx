import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';
import { PlayerColor } from '../constants/categories';
import { CategoryBadge } from './CategoryBadge';

interface QuestionCardProps {
  /** Question number (Q1, Q2, etc.) */
  questionNumber: number;
  /** Category color for badge */
  category: PlayerColor;
  /** Question text to display */
  questionText: string;
  /** Answer text (hidden until revealed) */
  answerText: string;
  /** Whether answer is currently revealed */
  revealed: boolean;
  /** Callback when user taps reveal button */
  onReveal: () => void;
}

/**
 * QuestionCard component
 * Displays question text with category badge and answer reveal functionality
 *
 * Per D-09: Large centered text for arm's-distance reading (24pt minimum)
 * Per D-11: Question number shown as "Q1", "Q2", etc.
 * Per D-12: Answer hidden by default, large "Reveal Answer" button
 * Per D-14: Minimal chrome - only category badge, question number, question text, and reveal button
 */
export function QuestionCard({
  questionNumber,
  category,
  questionText,
  answerText,
  revealed,
  onReveal,
}: QuestionCardProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background?.val as string }]}>
      {/* Category Badge - D-10 */}
      <CategoryBadge category={category} size="$4" />

      {/* Question Number - D-11 */}
      <Text style={[styles.questionNumber, { color: theme.color?.val as string }]}>
        Q{questionNumber}
      </Text>

      {/* Question Text - D-09: 24pt minimum, centered */}
      <Text style={[styles.questionText, { color: theme.color?.val as string }]}>
        {questionText}
      </Text>

      {/* Answer Reveal Button or Answer Text - D-12 */}
      {revealed ? (
        <Text style={[styles.answerText, { color: theme.color?.val as string }]}>
          {answerText}
        </Text>
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.revealButton,
            { backgroundColor: pressed ? '#444' : '#333' },
          ]}
          onPress={onReveal}
        >
          <Text style={styles.revealButtonText}>Reveal Answer</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  questionNumber: {
    fontSize: 16,
    opacity: 0.7,
    marginTop: 12,
  },
  questionText: {
    fontSize: 24, // D-09: minimum 24pt
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
  },
  answerText: {
    fontSize: 20,
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 16,
    fontWeight: '600',
  },
  revealButton: {
    marginTop: 40,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  revealButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});