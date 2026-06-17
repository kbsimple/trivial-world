import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from 'tamagui';
import { usePlayerStore } from '../../stores/playerStore';
import { useGameStore } from '../../stores/gameStore';
import { usePackStore } from '../../stores/packStore';
import { CATEGORY_COLORS } from '../../constants/categories';
import type { PlayerColor } from '../../constants/categories';
import type { QuestionPackModel } from '../../database/models';
import { SEMANTIC_COLORS } from '../../constants/theme';

/**
 * Game setup screen
 * - Add/remove participants (D-04)
 * - Auto-assigned colors (D-05)
 * - 1-6 players (D-06)
 * - Optional names, default "Player N" (D-07)
 * - Swipe to remove (D-08)
 * - Show selected pack info (D-01)
 * - Prevent start without pack selection (CONF-01)
 */
export default function SetupScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { players, addPlayer, removePlayer, updatePlayerName, updatePlayerPack, updatePlayerCombo, updatePlayerDifficulty } = usePlayerStore();
  const { startGame } = useGameStore();
  const activePackId = usePackStore((state) => state.activePackId);
  const availablePacks = usePackStore((state) => state.availablePacks);
  const savedCombos = usePackStore((state) => state.savedCombos);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [packName, setPackName] = useState<string | null>(null);

  const allPlayersCustom =
    players.length > 0 &&
    players.every((p) => p.packId !== null || p.comboId !== null);

  const canStart =
    players.length > 0 && (!!activePackId || allPlayersCustom);

  // Load pack name — check the in-memory index first (web-safe), then WatermelonDB
  useEffect(() => {
    let cancelled = false;

    if (!activePackId) {
      setPackName(null);
      return;
    }

    const fromIndex = availablePacks.find((p) => p.id === activePackId);
    if (fromIndex) {
      setPackName(fromIndex.name);
      return;
    }

    const loadPackName = async () => {
      try {
        const { getDatabase } = await import('../../database');
        const { Q } = await import('@nozbe/watermelondb');
        const database = getDatabase();
        const packs = await database.get<QuestionPackModel>('question_packs')
          .query(Q.where('pack_id', activePackId))
          .fetch();
        if (!cancelled && packs.length > 0) {
          setPackName(packs[0].name);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading pack name:', error);
        }
      }
    };
    loadPackName();

    return () => { cancelled = true; };
  }, [activePackId, availablePacks]);

  const handleAddPlayer = () => {
    if (players.length < 6) addPlayer();
  };

  const handleCustomPack = (playerId: string) => {
    router.push({ pathname: '/packs', params: { targetPlayerId: playerId } });
  };

  const handleRevertToShared = (playerId: string) => {
    updatePlayerPack(playerId, null);
    updatePlayerCombo(playerId, null);
    updatePlayerDifficulty(playerId, null);
  };

  const handleStartGame = async () => {
    if (!activePackId && !allPlayersCustom) {
      Alert.alert(
        'No Pack Selected',
        'Please select a question pack before starting the game.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    if (players.length === 0) {
      Alert.alert(
        'No Players',
        'Please add at least 1 participant before starting the game.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    await startGame();

    if (useGameStore.getState().phase === 'selecting') {
      router.replace('/game/turn');
    } else {
      Alert.alert('Error', 'Failed to start game. Please try again.');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background?.val as string }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Pack selector */}
      <Text style={styles.sectionLabel}>QUESTION PACK</Text>
      <Pressable style={styles.row} onPress={() => router.push('/packs')}>
        <Text
          style={[styles.rowText, { color: theme.color?.val as string, opacity: packName ? 1 : 0.5 }]}
          numberOfLines={1}
        >
          {packName
            ? packName
            : allPlayersCustom
              ? 'All players have custom packs'
              : 'Select a pack'}
        </Text>
        <Text style={[styles.rowChevron, { color: theme.color?.val as string }]}>
          {packName ? 'Change ›' : '›'}
        </Text>
      </Pressable>

      {/* Players */}
      <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>PLAYERS</Text>
      <View>
        {players.map((player, index) => {
          const isCustom = player.packId !== null || player.comboId !== null;
          return (
            <View key={player.id} style={styles.playerRowOuter}>
              <View style={styles.playerRow}>
                <View
                  style={[styles.colorDot, { backgroundColor: CATEGORY_COLORS[player.color as PlayerColor] }]}
                />
                <TextInput
                  style={[styles.nameInput, { color: theme.color?.val as string }]}
                  value={player.name}
                  onChangeText={(name) => updatePlayerName(player.id, name)}
                  placeholder={`Player ${index + 1}`}
                  placeholderTextColor="rgba(255,255,255,0.35)"
                />
                <Pressable onPress={() => removePlayer(player.id)} hitSlop={8}>
                  <Text style={styles.removeText}>×</Text>
                </Pressable>
              </View>

              <View style={styles.packSegmented}>
                <Text style={styles.packLabel}>Pack</Text>
                <Pressable
                  style={[styles.segment, !isCustom && styles.segmentActive]}
                  onPress={() => { if (isCustom) handleRevertToShared(player.id); }}
                >
                  <Text style={[styles.segmentText, !isCustom && styles.segmentTextActive]}>
                    Shared
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.segment, isCustom && styles.segmentActive]}
                  onPress={() => handleCustomPack(player.id)}
                >
                  <Text style={[styles.segmentText, isCustom && styles.segmentTextActive]}>
                    Custom
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        {players.length < 6 && (
          <Pressable style={styles.addRow} onPress={handleAddPlayer}>
            <Text style={styles.addRowText}>+ Add Player</Text>
          </Pressable>
        )}
      </View>

      {/* Start */}
      <Pressable
        style={[
          styles.startButton,
          { backgroundColor: canStart ? SEMANTIC_COLORS.success : 'rgba(255,255,255,0.1)' },
        ]}
        onPress={handleStartGame}
        disabled={!canStart}
      >
        <Text style={[
          styles.startText,
          { color: canStart ? (theme.background?.val as string) : 'rgba(255,255,255,0.3)' },
        ]}>
          Start Game
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 6,
  },
  sectionLabelSpaced: {
    marginTop: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    gap: 8,
  },
  rowText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
  },
  rowChevron: {
    fontSize: 14,
    opacity: 0.55,
    fontWeight: '600',
  },
  playerRowOuter: {
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 12,
  },
  nameInput: {
    flex: 1,
    fontSize: 17,
    paddingVertical: 2,
  },
  removeText: {
    fontSize: 22,
    color: SEMANTIC_COLORS.remove,
    paddingHorizontal: 4,
  },
  packSegmented: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 6,
  },
  packLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginRight: 2,
  },
  segment: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  segmentActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderColor: 'rgba(255,255,255,0.5)',
  },
  segmentText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  segmentTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  addRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    marginBottom: 8,
  },
  addRowText: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  startButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 48,
  },
  startText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
