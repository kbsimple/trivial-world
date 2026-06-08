import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { usePlayerStore } from '../../stores/playerStore';
import { Die } from '../../components/Die';
import { PlayerIndicator } from '../../components/PlayerIndicator';

/**
 * Roll Screen
 * Displays die for current player to roll
 * Shows current player indicator at top
 * Transitions to move screen after roll
 *
 * Per D-17: Current player indicator at top
 * Per RESEARCH.md: Phase-based navigation with useEffect
 */
export default function RollScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { dieResult, rollDie, transitionTo, currentPlayerIndex, phase } = useGameStore();
  const { players } = usePlayerStore();
  const [isRolling, setIsRolling] = useState(false);

  const currentPlayer = players[currentPlayerIndex];

  // Handle roll
  const handleRoll = () => {
    setIsRolling(true);

    // Generate random result
    rollDie(); // This sets dieResult in store

    // Transition to moving phase after animation
    setTimeout(() => {
      setIsRolling(false);
      transitionTo('moving');
    }, 1500); // Match animation duration
  };

  // Auto-navigate when phase changes to 'moving'
  useEffect(() => {
    if (phase === 'moving') {
      router.replace('/game/move');
    }
  }, [phase]);

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

      {/* Die display */}
      <View style={styles.dieContainer}>
        <Die
          result={dieResult}
          onRoll={handleRoll}
          isRolling={isRolling}
        />
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={[styles.instructionText, { color: theme.color?.val as string }]}>
          {isRolling ? 'Rolling...' : 'Tap the die to roll'}
        </Text>
      </View>
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
  dieContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructions: {
    paddingBottom: 32,
  },
  instructionText: {
    fontSize: 18,
    textAlign: 'center',
  },
});