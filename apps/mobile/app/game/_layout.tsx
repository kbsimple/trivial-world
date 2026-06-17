import { Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { BackHandler, Platform, Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';
import { PauseOverlay } from '../../components/PauseOverlay';
import { useGameStore } from '../../stores/gameStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useRouter } from 'expo-router';

/**
 * Game flow layout
 * Nested layout for game screens
 * Inherits dark theme from parent layout
 *
 * Flow: setup -> roll -> move -> question -> (repeat or results)
 * SCOR-04: Results screen shown when phase === 'finished'
 *
 * STAT-03: Pause overlay with Resume/End Game options
 * STAT-04: Back button confirmation during active game
 */
export default function GameLayout() {
  const [pauseOpen, setPauseOpen] = useState(false);
  const router = useRouter();
  const theme = useTheme();
  const phase = useGameStore((state) => state.phase);
  const resetPlayers = usePlayerStore((state) => state.resetPlayers);
  const resetGame = useGameStore((state) => state.resetGame);

  const handleNewGame = () => {
    resetPlayers();
    resetGame();
    router.replace('/');
  };

  const handleResume = () => {
    setPauseOpen(false);
  };

  // D-03: Back button confirmation during active game (Android only)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (phase !== 'setup' && phase !== 'finished') {
        setPauseOpen(true);
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [phase]);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: true,
          headerTitle: 'Trivial World',
          headerStyle: { backgroundColor: theme.background?.val as string },
          headerTintColor: theme.color?.val as string,
          headerLeft: () => (
            <Pressable onPress={() => setPauseOpen(true)} style={styles.pauseButton}>
              <Text style={[styles.pauseText, { color: theme.color?.val as string }]}>
                {Platform.OS === 'web' ? '☰' : 'Pause'}
              </Text>
            </Pressable>
          ),
        }}
      >
        <Stack.Screen name="setup" />
        <Stack.Screen name="turn" />
        <Stack.Screen name="question" />
        <Stack.Screen name="results" options={{ headerLeft: () => null }} />
      </Stack>
      <PauseOverlay
        open={pauseOpen}
        onOpenChange={setPauseOpen}
        onResume={handleResume}
        onNewGame={handleNewGame}
      />
    </>
  );
}

const styles = StyleSheet.create({
  pauseButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pauseText: {
    fontSize: 16,
    fontWeight: '600',
  },
});