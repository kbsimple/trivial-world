import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { useGameStore } from '../../stores/gameStore';
import { usePlayerStore } from '../../stores/playerStore';
import { CATEGORY_COLORS, CATEGORY_NAMES, PLAYER_COLORS, PlayerColor } from '../../constants/categories';

/**
 * Results Screen — v4.0 Simplified Gameplay
 *
 * Shows winner and each player's category completion at game end.
 * No wedge count — progress is shown as colored category dots.
 */
export default function ResultsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { winner, questionNumber, completedCategories, resetGame } = useGameStore();
  const { players, resetPlayers } = usePlayerStore();

  const totalQuestions = questionNumber > 1 ? questionNumber - 1 : 0;
  const textColor = theme.color?.val as string || '#ffffff';
  const bgColor = theme.background?.val as string || '#1a1a2e';

  const handleNewGame = () => {
    resetGame();
    resetPlayers();
    router.replace('/');
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>
          {winner ? `${winner.name} Wins! 🏆` : 'Game Complete'}
        </Text>
        <Text style={[styles.subtitle, { color: textColor }]}>
          {totalQuestions} questions asked
        </Text>
      </View>

      <ScrollView style={styles.scores}>
        {players.map((player, idx) => {
          const completed: PlayerColor[] = completedCategories[idx] ?? [];
          const isWinner = winner?.id === player.id;
          return (
            <View
              key={player.id}
              style={[
                styles.playerCard,
                isWinner && styles.playerCardWinner,
              ]}
            >
              <View style={styles.playerRow}>
                <View style={[styles.colorDot, { backgroundColor: CATEGORY_COLORS[player.color] }]} />
                <Text style={[styles.playerName, { color: textColor }]}>
                  {player.name}
                  {isWinner ? ' 🏆' : ''}
                </Text>
                <Text style={[styles.categoryCount, { color: textColor }]}>
                  {completed.length}/6
                </Text>
              </View>
              <View style={styles.categoryDots}>
                {PLAYER_COLORS.map((c) => (
                  <View
                    key={c}
                    style={[
                      styles.categoryDot,
                      {
                        backgroundColor: CATEGORY_COLORS[c],
                        opacity: completed.includes(c) ? 1 : 0.2,
                      },
                    ]}
                  />
                ))}
              </View>
              <View style={styles.categoryLabels}>
                {PLAYER_COLORS.map((c) => (
                  <Text key={c} style={styles.categoryLabel} numberOfLines={1}>
                    {CATEGORY_NAMES[c].split(' ')[0]}
                  </Text>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          style={[styles.button, { backgroundColor: theme.accent?.val as string || '#4CAF50' }]}
          onPress={handleNewGame}
        >
          <Text style={styles.buttonText}>New Game</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { alignItems: 'center', paddingVertical: 24 },
  title: { fontSize: 32, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 16, marginTop: 8, opacity: 0.7 },
  scores: { flex: 1 },
  playerCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  playerCardWinner: {
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.4)',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  colorDot: { width: 14, height: 14, borderRadius: 7, marginRight: 10 },
  playerName: { flex: 1, fontSize: 18, fontWeight: '600' },
  categoryCount: { fontSize: 14, opacity: 0.7 },
  categoryDots: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryDot: { width: 28, height: 28, borderRadius: 14 },
  categoryLabels: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  categoryLabel: { width: 28, fontSize: 9, textAlign: 'center', color: '#888' },
  actions: { paddingVertical: 16, alignItems: 'center' },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
});
