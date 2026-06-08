import { useRouter } from 'expo-router';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';
import { useGameStore } from '../stores/gameStore';
import { usePlayerStore } from '../stores/playerStore';

/**
 * Home screen
 * Entry point for the app
 * - Displays "Trivial World" title
 * - Shows "Resume Game" and "New Game" buttons when a game is in progress (D-02)
 * - Single "New Game" button when no active game (D-01)
 */
export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const phase = useGameStore((state) => state.phase);
  const players = usePlayerStore((state) => state.players);
  const resetPlayers = usePlayerStore((state) => state.resetPlayers);

  // D-02: Game resumable if in progress and has players
  const hasActiveGame = phase !== 'setup' && phase !== 'finished' && players.length > 0;

  const handleResumeGame = () => {
    // Navigate based on current phase
    const phaseRoutes: Record<string, string> = {
      rolling: '/game/roll',
      moving: '/game/move',
      answering: '/game/question',
      scoring: '/game/question',
    };
    const route = phaseRoutes[phase] || '/game/roll';
    router.push(route as any);
  };

  const handleNewGame = () => {
    // D-02: If game in progress, reset state before starting new
    if (hasActiveGame) {
      resetPlayers();
    }
    router.push('/game/setup');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background?.val as string }]}>
      {/* Title */}
      <Text style={[styles.title, { color: theme.color?.val as string }]}>
        Trivial World
      </Text>

      {/* Resume Game button (shown when game is in progress) */}
      {hasActiveGame && (
        <Pressable
          style={[styles.primaryButton, { backgroundColor: '#228b22' }]}
          onPress={handleResumeGame}
        >
          <Text style={[styles.buttonText, { color: theme.background?.val as string }]}>
            Resume Game
          </Text>
        </Pressable>
      )}

      {/* New Game button */}
      <Pressable
        style={[
          hasActiveGame ? styles.secondaryButton : styles.primaryButton,
          { backgroundColor: hasActiveGame ? 'rgba(255,255,255,0.2)' : theme.color?.val as string }
        ]}
        onPress={handleNewGame}
      >
        <Text style={[styles.buttonText, { color: theme.background?.val as string }]}>
          New Game
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    marginBottom: 12,
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 180,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});