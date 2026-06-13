import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
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
 * Layout: top zone (PlayerIndicator + championship banner + QuestionCard)
 *         spacer (flex: 1, pushes footer down)
 *         bottom footer (Reveal Answer button pre-reveal; answer + tidbits + AnswerButtons post-reveal)
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
      {/* Top zone — content stacks from top */}
      <View style={styles.topZone}>
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

        {!submitted && currentQuestion ? (
          <QuestionCard
            questionNumber={questionNumber}
            category={category}
            questionText={currentQuestion.questionText}
            revealed={answerRevealed}
            choices={currentQuestion.choices}
            correctChoiceIndex={currentQuestion.correctChoiceIndex}
            difficulty={currentQuestion.difficulty}
            tidbits={currentQuestion.tidbits}
          />
        ) : null}

        {/* answerZone: non-MC only — MC questions show the green bar + tidbits inside QuestionCard */}
        {answerRevealed && currentQuestion && !(currentQuestion.choices && currentQuestion.choices.length > 0) && (
          <View style={styles.answerZone}>
            <Text style={[styles.answerText, { color: theme.color?.val as string }]}>
              {currentQuestion.answerText}
            </Text>
            {currentQuestion.tidbits && (
              <Text style={[styles.tidbitsText, { color: theme.color?.val as string }]}>
                {currentQuestion.tidbits}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Spacer — pushes footer to bottom */}
      <View style={styles.spacer} />

      {/* Bottom footer */}
      <View style={styles.footer}>
        {!answerRevealed && !submitted && (
          <Pressable
            style={({ pressed }) => [
              styles.revealButton,
              { backgroundColor: pressed ? '#444' : '#333' },
            ]}
            onPress={() => revealAnswer()}
          >
            <Text style={styles.revealButtonText}>Reveal Answer</Text>
          </Pressable>
        )}

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
  topZone: {
    // natural height only — no flex: 1
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
  spacer: {
    flex: 1,
  },
  footer: {
    paddingBottom: 32,
    alignItems: 'center',
  },
  answerZone: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  answerText: {
    fontSize: 20,
    textAlign: 'center',
    paddingHorizontal: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  tidbitsText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 16,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  revealButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
    marginBottom: 16,
  },
  revealButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
