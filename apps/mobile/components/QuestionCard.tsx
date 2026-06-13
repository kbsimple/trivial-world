import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';
import { PlayerColor } from '../constants/categories';
import { CategoryBadge } from './CategoryBadge';

const CHOICE_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

interface QuestionCardProps {
  questionNumber: number;
  category: PlayerColor;
  questionText: string;
  answerText: string;
  revealed: boolean;
  onReveal: () => void;
  choices?: string[];
  correctChoiceIndex?: number;
}

/**
 * QuestionCard component
 * Supports both open-answer and multiple-choice questions.
 *
 * MC flow: choices always visible (conductor reads them aloud), "Reveal Answer"
 * highlights the correct choice. Correct/Incorrect buttons follow as normal.
 *
 * Per D-09: Large centered text for arm's-distance reading (24pt minimum)
 * Per D-11: Question number shown as "Q1", "Q2", etc.
 * Per D-12: Answer hidden by default, large "Reveal Answer" button
 * Per D-14: Minimal chrome
 */
export function QuestionCard({
  questionNumber,
  category,
  questionText,
  answerText,
  revealed,
  onReveal,
  choices,
  correctChoiceIndex,
}: QuestionCardProps) {
  const theme = useTheme();
  const isMultipleChoice = Array.isArray(choices) && choices.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background?.val as string }]}>
      <CategoryBadge category={category} size="$4" />

      <Text style={[styles.questionNumber, { color: theme.color?.val as string }]}>
        Q{questionNumber}
      </Text>

      <Text style={[styles.questionText, { color: theme.color?.val as string }]}>
        {questionText}
      </Text>

      {isMultipleChoice ? (
        <View style={styles.choicesContainer}>
          {choices!.map((choice, index) => {
            const isCorrect = index === correctChoiceIndex;
            const choiceStyle = revealed
              ? isCorrect
                ? styles.choiceCorrect
                : styles.choiceWrong
              : styles.choiceDefault;

            return (
              <View key={index} style={[styles.choiceRow, choiceStyle]}>
                <Text style={[styles.choiceLabel, revealed && isCorrect && styles.choiceLabelCorrect]}>
                  {CHOICE_LABELS[index]}
                </Text>
                <Text style={[styles.choiceText, revealed && isCorrect && styles.choiceTextCorrect]}>
                  {choice}
                </Text>
              </View>
            );
          })}

          {!revealed && (
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
      ) : (
        revealed ? (
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
        )
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
    fontSize: 24,
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
    marginTop: 24,
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
    backgroundColor: '#1a6b2a',
    borderWidth: 2,
    borderColor: '#2d9e40',
  },
  choiceWrong: {
    borderWidth: 2,
    borderColor: '#333',
    opacity: 0.45,
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
});
