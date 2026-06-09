import { View, Text, Pressable, StyleSheet } from 'react-native';
import { NotificationFeedbackType } from 'expo-haptics';
import { notificationAsync } from '../utils/haptics';
import { SEMANTIC_COLORS } from '../constants/theme';

interface AnswerButtonsProps {
  /** Callback when answer is marked */
  onMark: (correct: boolean) => void;
  /** Whether buttons are visible (controlled by answerRevealed state) */
  visible?: boolean;
}

/**
 * AnswerButtons component
 * Displays Correct/Incorrect buttons for marking answers
 *
 * Per D-13: 50% width buttons for easy thumb tapping
 * Per D-20: Haptic feedback on marking (Success for correct, Error for incorrect)
 */
export function AnswerButtons({ onMark, visible = true }: AnswerButtonsProps) {
  if (!visible) {
    return null;
  }

  const handleCorrect = async () => {
    // D-20: Haptic feedback for correct answer (D-10: platform-aware)
    await notificationAsync(NotificationFeedbackType.Success);
    onMark(true);
  };

  const handleIncorrect = async () => {
    // D-20: Haptic feedback for incorrect answer (D-10: platform-aware)
    await notificationAsync(NotificationFeedbackType.Error);
    onMark(false);
  };

  return (
    <View style={styles.container}>
      {/* Correct Button - 50% width, green */}
      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.correctButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={handleCorrect}
      >
        <Text style={styles.buttonText}>✓ Correct</Text>
      </Pressable>

      {/* Incorrect Button - 50% width, red */}
      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.incorrectButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={handleIncorrect}
      >
        <Text style={styles.buttonText}>✗ Incorrect</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    paddingHorizontal: 16,
  },
  button: {
    flex: 1, // D-13: 50% width each
    paddingVertical: 20, // Full-height for easy thumb tapping
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64, // Large tap target
  },
  correctButton: {
    backgroundColor: SEMANTIC_COLORS.success,
  },
  incorrectButton: {
    backgroundColor: SEMANTIC_COLORS.error,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});