import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { useGameStore } from '../../stores/gameStore';
import { usePlayerStore } from '../../stores/playerStore';
import { QuestionCard } from '../../components/QuestionCard';
import { AnswerButtons } from '../../components/AnswerButtons';
import { PlayerIndicator } from '../../components/PlayerIndicator';

/**
 * Question screen — v4.0 Simplified Gameplay
 *
 * Shows championship banner when the active player is in championship mode (SIMP-09).
 * After marking: navigates to /game/results on win, /game/turn otherwise.
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
    isChampionshipMode,
  } = useGameStore();
  const { players } = usePlayerStore();
  const [submitted, setSubmitted] = useState(false);

  const currentPlayer = players[currentPlayerIndex];
  const category = currentCategory || currentQuestion?.category || 'blue';
  const inChampionship = isChampionshipMode[currentPlayerIndex] ?? false;

  const handleMarkAnswer = (correct: boolean) => {
    setSubmitted(true);
    markAnswer(correct);
    setTimeout(() => {
      const phase = useGameStore.getState().phase;
      if (phase === 'finished') {
        router.replace('/game/results');
      } else {
        router.replace('/game/turn');
      }
    }, 600);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background?.val as string }]}>
      {currentPlayer && (
        <View style={styles.playerIndicator}>
          <PlayerIndicator
            playerName={currentPlayer.name}
            playerColor={currentPlayer.color}
          />
        </View>
      )}

      {/* Championship banner — SIMP-09 */}
      {inChampionship && (
        <View style={styles.championshipBanner}>
          <Text style={styles.championshipText}>🏆 Championship Question</Text>
        </View>
      )}

      <View style={styles.questionContainer}>
        {!submitted && currentQuestion ? (
          <QuestionCard
            questionNumber={questionNumber}
            category={category}
            questionText={currentQuestion.questionText}
            answerText={currentQuestion.answerText}
            revealed={answerRevealed}
            onReveal={() => revealAnswer()}
            choices={currentQuestion.choices}
            correctChoiceIndex={currentQuestion.correctChoiceIndex}
            tidbits={currentQuestion.tidbits}
            difficulty={currentQuestion.difficulty}
          />
        ) : null}
      </View>

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
  championshipBanner: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  championshipText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  questionContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  answerButtons: {
    paddingBottom: 32,
  },
});
