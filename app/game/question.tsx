import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';
import { useGameStore } from '../../stores/gameStore';
import { usePlayerStore } from '../../stores/playerStore';

/**
 * Question screen (placeholder)
 * - Will display question for game conductor
 * - Phase 1: Basic placeholder for navigation
 * - Phase 2: Full implementation
 */
export default function QuestionScreen() {
  const theme = useTheme();
  const { phase, questionNumber, currentPlayerIndex } = useGameStore();
  const { players } = usePlayerStore();

  const currentPlayer = players[currentPlayerIndex];

  return (
    <View style={[styles.container, { backgroundColor: theme.background?.val as string }]}>
      <Text style={[styles.title, { color: theme.color?.val as string }]}>
        Question Screen
      </Text>
      <Text style={[styles.info, { color: theme.color?.val as string }]}>
        Phase: {phase}
      </Text>
      <Text style={[styles.info, { color: theme.color?.val as string }]}>
        Question: {questionNumber}
      </Text>
      {currentPlayer && (
        <Text style={[styles.info, { color: theme.color?.val as string }]}>
          Current Player: {currentPlayer.name}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  info: {
    fontSize: 18,
    marginBottom: 10,
  },
});