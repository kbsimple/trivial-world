import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { useGameStore } from '../../stores/gameStore';
import { usePlayerStore } from '../../stores/playerStore';
import { PlayerIndicator } from '../../components/PlayerIndicator';
import { PLAYER_COLORS, CATEGORY_COLORS, CATEGORY_NAMES, PlayerColor } from '../../constants/categories';

export default function MoveScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { dieResult, transitionTo, currentPlayerIndex, selectCategory } = useGameStore();
  const { players } = usePlayerStore();

  const currentPlayer = players[currentPlayerIndex];
  if (!currentPlayer) return null;

  const handleCategorySelected = (category: PlayerColor) => {
    selectCategory(category);
    transitionTo('answering');
    router.replace('/game/question');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background?.val as string }]}>
      <View style={styles.playerIndicator}>
        <PlayerIndicator
          playerName={currentPlayer.name}
          playerColor={currentPlayer.color}
        />
      </View>

      <View style={styles.resultContainer}>
        <Text style={[styles.resultLabel, { color: theme.color?.val as string }]}>
          You rolled
        </Text>
        <Text style={[styles.resultNumber, { color: theme.accent?.val as string }]}>
          {dieResult}
        </Text>
      </View>

      <Text style={[styles.instructionText, { color: theme.color?.val as string }]}>
        Choose a category
      </Text>

      <View style={styles.categoryGrid}>
        {PLAYER_COLORS.map((color) => (
          <Pressable
            key={color}
            testID={`category-button-${color}`}
            style={({ pressed }) => [
              styles.categoryButton,
              { backgroundColor: CATEGORY_COLORS[color], opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() => handleCategorySelected(color)}
          >
            <Text style={styles.categoryButtonText}>
              {CATEGORY_NAMES[color]}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  playerIndicator: {
    paddingTop: 8,
    alignItems: 'center',
    width: '100%',
  },
  resultContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  resultLabel: {
    fontSize: 18,
    marginBottom: 4,
  },
  resultNumber: {
    fontSize: 72,
    fontWeight: 'bold',
  },
  instructionText: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 16,
  },
  categoryGrid: {
    width: '100%',
    gap: 10,
  },
  categoryButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  categoryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});