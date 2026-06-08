import { View, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { useGameStore } from '../../stores/gameStore';
import { usePlayerStore } from '../../stores/playerStore';
import { QuestionCard } from '../../components/QuestionCard';
import { AnswerButtons } from '../../components/AnswerButtons';
import { PlayerIndicator } from '../../components/PlayerIndicator';

/**
 * Question screen
 * Displays current question for game conductor to read aloud
 *
 * Per D-14: Minimal chrome - no scores, no player list, no board
 * Per D-15: Conductor mode implicit (person holding phone)
 * Per D-16: Auto-advance after marking to next player
 * Per LOOP-04: Advance turn after question
 * Per LOOP-05: Turn cycling through all participants
 */
export default function QuestionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const {
    answerRevealed,
    revealAnswer,
    markAnswer,
    currentQuestion,
    currentCategory,
    questionNumber,
    currentPlayerIndex,
  } = useGameStore();
  const { players } = usePlayerStore();

  // Get current player for indicator
  const currentPlayer = players[currentPlayerIndex];

  // Default category to blue if no question yet
  const category = currentCategory || currentQuestion?.category || 'blue';

  // Handle answer marking
  const handleMarkAnswer = (correct: boolean) => {
    // Mark the answer (resets answerRevealed, increments questionNumber)
    markAnswer(correct);

    // Note: markAnswer now includes nextTurn() call with 500ms delay
    // After the delay, phase will be 'rolling' and we navigate to roll screen
    setTimeout(() => {
      router.replace('/game/roll');
    }, 600); // Slightly longer than the delay in markAnswer
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background?.val as string }]}>
      {/* Player indicator at top - D-17 */}
      {currentPlayer && (
        <View style={styles.playerIndicator}>
          <PlayerIndicator
            playerName={currentPlayer.name}
            playerColor={currentPlayer.color}
          />
        </View>
      )}

      {/* Question card in center - D-09, D-10, D-11, D-12 */}
      <View style={styles.questionContainer}>
        {currentQuestion ? (
          <QuestionCard
            questionNumber={questionNumber}
            category={category}
            questionText={currentQuestion.questionText}
            answerText={currentQuestion.answerText}
            revealed={answerRevealed}
            onReveal={() => revealAnswer()}
          />
        ) : (
          <QuestionCard
            questionNumber={questionNumber}
            category="blue"
            questionText="No question loaded. Please start a new game."
            answerText="N/A"
            revealed={false}
            onReveal={() => {}}
          />
        )}
      </View>

      {/* Answer buttons at bottom - D-13, D-20 */}
      <View style={styles.answerButtons}>
        <AnswerButtons
          visible={answerRevealed}
          onMark={handleMarkAnswer}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  playerIndicator: {
    alignItems: 'center',
    paddingTop: 8,
  },
  questionContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  answerButtons: {
    paddingBottom: 32,
  },
});