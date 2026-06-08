import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { useGameStore } from '../../stores/gameStore';
import { usePlayerStore } from '../../stores/playerStore';
import { PlayerIndicator } from '../../components/PlayerIndicator';

/**
 * Move Screen
 * Displays die roll result and move options
 *
 * Per RESEARCH.md: Placeholder for Phase 3 board position logic
 * Currently shows die result and "Continue" button
 * Will be enhanced in Phase 3 to show actual board positions
 *
 * Per LOOP-02: Displays valid move choices (simplified for Phase 2)
 */
export default function MoveScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { dieResult, transitionTo, currentPlayerIndex, selectCategory } = useGameStore();
  const { players } = usePlayerStore();

  const currentPlayer = players[currentPlayerIndex];

  // Placeholder: Select random category for question
  // Phase 3 will add board-based category selection
  const handleMoveSelected = () => {
    // Categories are blue, pink, yellow, purple, green, orange
    // Random selection for testing purposes
    const categories = ['blue', 'pink', 'yellow', 'purple', 'green', 'orange'] as const;
    const randomCategory = categories[Math.floor(Math.random() * 6)];

    // Set category and load question
    selectCategory(randomCategory);

    // Transition to answering phase
    transitionTo('answering');

    // Navigate to question screen
    router.replace('/game/question');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background?.val as string }]}>
      {/* Current player indicator - D-17 */}
      {currentPlayer && (
        <View style={styles.playerIndicator}>
          <PlayerIndicator
            playerName={currentPlayer.name}
            playerColor={currentPlayer.color}
          />
        </View>
      )}

      {/* Die result display */}
      <View style={styles.resultContainer}>
        <Text style={[styles.resultLabel, { color: theme.color?.val as string }]}>
          You rolled
        </Text>
        <Text style={[styles.resultNumber, { color: theme.accent?.val as string }]}>
          {dieResult}
        </Text>
      </View>

      {/* Move instruction */}
      <View style={styles.instructionContainer}>
        <Text style={[styles.instructionText, { color: theme.color?.val as string }]}>
          Select your move
        </Text>
        <Text style={[styles.placeholderText, { color: theme.color?.val as string, opacity: 0.6 }]}>
          (Board positions coming in Phase 3)
        </Text>
      </View>

      {/* Continue button - placeholder for move selection */}
      <Pressable
        style={[styles.continueButton, { backgroundColor: theme.accent?.val as string }]}
        onPress={handleMoveSelected}
      >
        <Text style={styles.continueButtonText}>
          Continue
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerIndicator: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  resultContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  resultLabel: {
    fontSize: 20,
    marginBottom: 8,
  },
  resultNumber: {
    fontSize: 72,
    fontWeight: 'bold',
  },
  instructionContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  instructionText: {
    fontSize: 18,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 14,
  },
  continueButton: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    minWidth: 200,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});