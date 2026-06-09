import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { useGameStore } from '../../stores/gameStore';
import { usePlayerStore } from '../../stores/playerStore';
import { PlayerIndicator } from '../../components/PlayerIndicator';
import { PlayerColor } from '../../constants/categories';

/**
 * Move Screen
 * Displays die roll result and move options
 *
 * Per QSTN-02: Category is determined by board position (Phase 4 integration)
 * Per QSTN-03: Questions selected without repeating via questionStore
 */
export default function MoveScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { dieResult, transitionTo, currentPlayerIndex, selectCategory } = useGameStore();
  // WR-02: Use the hook for reactivity
  const { players } = usePlayerStore();

  // WR-02: Add null safety for invalid index
  const currentPlayer = players[currentPlayerIndex];
  if (!currentPlayer) {
    // Handle edge case - redirect to setup or show error
    // This should not happen in normal flow, but protects against corrupted state
    return null;
  }

  /**
   * Handle move selection
   * QSTN-02: Category is determined by board position (Phase 4 integration)
   * For Phase 3: Accept category parameter or use default
   * Phase 4 will replace this with actual board position logic
   */
  const handleMoveSelected = (category?: PlayerColor) => {
    // Phase 4 TODO: Determine category from board position
    // WR-04: Use deterministic default for development
    const selectedCategory = category ?? 'blue'; // Default for testing
    console.warn('Using default category - board position logic pending Phase 4');

    // Set category and load question
    selectCategory(selectedCategory);

    // Transition to answering phase
    transitionTo('answering');

    // Navigate to question screen
    router.replace('/game/question');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background?.val as string }]}>
      {/* Current player indicator */}
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
          (Board positions coming in Phase 4)
        </Text>
      </View>

      {/* Continue button */}
      <Pressable
        style={[styles.continueButton, { backgroundColor: theme.accent?.val as string }]}
        onPress={() => handleMoveSelected()}
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