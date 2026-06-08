import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { useGameStore } from '../../stores/gameStore';
import { usePlayerStore } from '../../stores/playerStore';
import { PlayerScoreCard } from '../../components/PlayerScoreCard';

/**
 * Results Screen
 * Displays final scores and winner when game ends
 *
 * Per SCOR-04:
 * - Shows all players sorted by wedge count
 * - Highlights winner prominently
 * - Displays total questions asked
 * - New Game button returns to setup
 *
 * Per D-15: Conductor mode implicit (person holding phone)
 */
export default function ResultsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { winner, questionNumber } = useGameStore();
  const { players, resetPlayers } = usePlayerStore();

  // Sort players by wedge count (highest first)
  const sortedPlayers = [...players].sort(
    (a, b) => b.wedges.length - a.wedges.length
  );

  // Calculate total questions asked (questionNumber - 1 because it increments after each)
  const totalQuestions = questionNumber > 1 ? questionNumber - 1 : 0;

  // Handle new game
  const handleNewGame = () => {
    // Reset game state
    useGameStore.getState().transitionTo('setup');

    // Reset players (clear wedges, keep names)
    resetPlayers();

    // Navigate to setup
    router.replace('/');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background?.val as string || '#1a1a2e' }]}>
      {/* Header: Winner announcement */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.color?.val as string || '#ffffff' }]}>
          {winner ? `${winner.name} Wins!` : 'Game Complete'}
        </Text>
        <Text style={[styles.subtitle, { color: theme.color?.val as string || '#ffffff' }]}>
          {totalQuestions} questions asked
        </Text>
      </View>

      {/* Player scores sorted by wedge count */}
      <ScrollView style={styles.scores}>
        {sortedPlayers.map((player, index) => (
          <PlayerScoreCard
            key={player.id}
            player={player}
            rank={index + 1}
            isWinner={winner?.id === player.id}
          />
        ))}
      </ScrollView>

      {/* New Game button */}
      <View style={styles.actions}>
        <Pressable
          style={[
            styles.button,
            { backgroundColor: theme.accent?.val as string || '#4CAF50' },
          ]}
          onPress={handleNewGame}
        >
          <Text style={styles.buttonText}>New Game</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    opacity: 0.7,
  },
  scores: {
    flex: 1,
  },
  actions: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});