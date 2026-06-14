import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { useGameStore } from '../../stores/gameStore';
import { usePlayerStore } from '../../stores/playerStore';
import { usePackStore } from '../../stores/packStore';
import { PlayerIndicator } from '../../components/PlayerIndicator';
import { PLAYER_COLORS, CATEGORY_COLORS, CATEGORY_NAMES, PlayerColor } from '../../constants/categories';

/**
 * Turn Screen — v4.0 Simplified Gameplay
 *
 * Replaces roll + move screens. Shows category buttons for the active player.
 * Completed categories are visually marked and disabled (SIMP-07).
 * Championship mode shows a banner when all 6 are done (SIMP-08/09).
 * Tapping a category calls selectCategory() → navigates to question screen.
 */
export default function TurnScreen() {
  const theme = useTheme();
  const router = useRouter();
  const {
    selectCategory,
    currentPlayerIndex,
    completedCategories,
    isChampionshipMode,
    playerPackIds,
    playerCategories,
    playerDifficulties,
    lastMarkSnapshot,
    undoLastMark,
  } = useGameStore();
  const { players } = usePlayerStore();
  const availablePacks = usePackStore((state) => state.availablePacks);
  // Per-player categories from game snapshot (immutable during game, CONTEXT.md decision)
  const activeCategories: PlayerColor[] =
    playerCategories[currentPlayerIndex] ?? PLAYER_COLORS;

  const currentPlayer = players[currentPlayerIndex];
  if (!currentPlayer) return null;

  const myCompleted: PlayerColor[] = completedCategories[currentPlayerIndex] ?? [];
  const inChampionship = isChampionshipMode[currentPlayerIndex] ?? false;

  const handleCategorySelected = async (color: PlayerColor) => {
    if (!inChampionship && myCompleted.includes(color)) return; // already done
    await selectCategory(color);
    router.replace('/game/question');
  };

  const handleUndo = () => {
    undoLastMark();
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

      {inChampionship ? (
        <View style={styles.championshipBanner}>
          <Text style={styles.championshipTitle}>🏆 Championship Round</Text>
          <Text style={styles.championshipSub}>
            {currentPlayer.name} has completed all 6 categories!
          </Text>
          <Text style={styles.championshipInstruction}>
            Opponents choose a category. Answer correctly to win.
          </Text>
        </View>
      ) : (
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: theme.color?.val as string }]}>
            {myCompleted.length} / {activeCategories.length} categories done
          </Text>
          <Text style={[styles.chooseLabel, { color: theme.color?.val as string }]}>
            Choose a category
          </Text>
        </View>
      )}

      <View style={styles.categoryGrid}>
        {activeCategories.map((color) => {
          const done = myCompleted.includes(color);
          const disabled = !inChampionship && done;

          return (
            <Pressable
              key={color}
              testID={`category-button-${color}`}
              style={({ pressed }) => [
                styles.categoryButton,
                {
                  backgroundColor: CATEGORY_COLORS[color],
                  opacity: disabled ? 0.35 : pressed ? 0.8 : 1,
                },
              ]}
              onPress={() => handleCategorySelected(color)}
              disabled={disabled}
            >
              <Text style={styles.categoryButtonText}>
                {CATEGORY_NAMES[color]}
              </Text>
              {done && !inChampionship && (
                <Text style={styles.doneCheck}>✓</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* All-players progress strip */}
      {players.length > 1 && (
        <View style={styles.progressStrip}>
          {players.map((player, idx) => {
            const count = (completedCategories[idx] ?? []).length;
            const champ = isChampionshipMode[idx] ?? false;
            const totalCats = (playerCategories[idx] ?? PLAYER_COLORS).length;
            const pid = playerPackIds[idx];
            const rawPackName = pid
              ? (availablePacks.find(p => p.id === pid)?.name ?? null)
              : null;
            const displayPackName = rawPackName
              ? (rawPackName.length > 12 ? rawPackName.slice(0, 12) + '...' : rawPackName)
              : null;
            const difficultyLabel = playerDifficulties?.[idx] != null
              ? (playerDifficulties[idx] as string).charAt(0).toUpperCase()
                + (playerDifficulties[idx] as string).slice(1)
              : null;
            return (
              <View key={player.id} style={styles.progressEntry}>
                <View style={[styles.progressDot, { backgroundColor: CATEGORY_COLORS[player.color] }]} />
                <Text style={styles.progressName} numberOfLines={1}>
                  {player.name}
                </Text>
                {displayPackName && (
                  <Text style={styles.progressPack} numberOfLines={1}>{displayPackName}</Text>
                )}
                {difficultyLabel && (
                  <Text style={styles.progressDifficulty} numberOfLines={1}>{difficultyLabel}</Text>
                )}
                <Text style={styles.progressCount}>
                  {champ ? '🏆' : `${count}/${totalCats}`}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {lastMarkSnapshot && (
        <Pressable
          testID="undo-last-mark"
          style={({ pressed }) => [styles.undoLink, { opacity: pressed ? 0.5 : 1 }]}
          onPress={handleUndo}
        >
          <Text style={styles.undoLinkText}>↩ Undo last mark</Text>
        </Pressable>
      )}
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
  progressHeader: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 4,
  },
  chooseLabel: {
    fontSize: 16,
    opacity: 0.8,
  },
  championshipBanner: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  championshipTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  championshipSub: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.9,
  },
  championshipInstruction: {
    fontSize: 13,
    color: '#fff',
    marginTop: 6,
    textAlign: 'center',
    opacity: 0.7,
    fontStyle: 'italic',
  },
  categoryGrid: {
    width: '100%',
    gap: 10,
    marginTop: 12,
    flex: 1,
  },
  categoryButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'relative',
  },
  categoryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  doneCheck: {
    position: 'absolute',
    right: 16,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressStrip: {
    width: '100%',
    paddingTop: 12,
    paddingBottom: 4,
    gap: 4,
  },
  progressEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  progressName: {
    flex: 1,
    color: '#aaa',
    fontSize: 13,
  },
  progressCount: {
    color: '#aaa',
    fontSize: 13,
    minWidth: 30,
    textAlign: 'right',
  },
  progressPack: {
    color: '#888',
    fontSize: 11,
    marginRight: 4,
  },
  progressDifficulty: {
    color: '#888',
    fontSize: 11,
    marginRight: 4,
  },
  undoLink: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  undoLinkText: {
    color: '#888',
    fontSize: 13,
    opacity: 0.8,
  },
});
