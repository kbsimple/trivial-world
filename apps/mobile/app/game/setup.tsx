import { useState, useEffect } from 'react';
import { Platform, View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert, Modal, TouchableWithoutFeedback } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from 'tamagui';
import { usePlayerStore } from '../../stores/playerStore';
import { useGameStore } from '../../stores/gameStore';
import { usePackStore } from '../../stores/packStore';
import { AddPlayerButton } from '../../components/AddPlayerButton';
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
  const { players, addPlayer, removePlayer, updatePlayerName, updatePlayerPack, updatePlayerCombo, updatePlayerDifficulty, clearPlayerPackSources } = usePlayerStore();
  const { startGame } = useGameStore();
  const activePackId = usePackStore((state) => state.activePackId);
  const availablePacks = usePackStore((state) => state.availablePacks);
  const downloadedPackIds = usePackStore((state) => state.downloadedPackIds);
  const savedCombos = usePackStore((state) => state.savedCombos);
  const packMode = usePackStore((state) => state.packMode);
  const setPackMode = usePackStore((state) => state.setPackMode);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [packName, setPackName] = useState<string | null>(null);
  const [webPicker, setWebPicker] = useState<{
    title: string;
    options: { label: string; onPress: () => void }[];
  } | null>(null);

  // Load pack name — check the in-memory index first (web-safe), then WatermelonDB
  useEffect(() => {
    let cancelled = false;

    if (!activePackId) {
      setPackName(null);
      return;
    }

    // Quick lookup from the pack index already in memory (works on web without DB)
    const fromIndex = availablePacks.find((p) => p.id === activePackId);
    if (fromIndex) {
      setPackName(fromIndex.name);
      return;
    }

    // Mobile fallback: load from WatermelonDB
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

    return () => {
      cancelled = true;
    };
  }, [activePackId, availablePacks]);

  const handleAddPlayer = () => {
    if (players.length < 6) {
      addPlayer();
    }
  };

  const handleRemovePlayer = (id: string) => {
    removePlayer(id);
  };

  const handleNameChange = (id: string, name: string) => {
    updatePlayerName(id, name);
  };

  const handlePickSource = (playerId: string) => {
    // On web, all packs are available (no download step); on native, filter to downloaded only.
    const selectablePacks = Platform.OS === 'web'
      ? availablePacks
      : availablePacks.filter(p => downloadedPackIds.includes(p.id));

    const options = [
      {
        label: 'Default (game source)',
        onPress: () => { updatePlayerPack(playerId, null); updatePlayerCombo(playerId, null); },
      },
      ...selectablePacks.map(p => ({
        label: p.name.length > 28 ? p.name.slice(0, 25) + '...' : p.name,
        onPress: () => { updatePlayerPack(playerId, p.id); },
      })),
      ...savedCombos.map(c => ({
        label: `Combo: ${c.name.length > 22 ? c.name.slice(0, 19) + '...' : c.name}`,
        onPress: () => { updatePlayerCombo(playerId, c.id); },
      })),
    ];

    if (Platform.OS === 'web') {
      setWebPicker({ title: 'Select Pack or Combo', options });
    } else {
      Alert.alert('Select Pack or Combo', undefined, [
        ...options.map(o => ({ text: o.label, onPress: o.onPress })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  const handlePickDifficulty = (playerId: string) => {
    const options = [
      { label: 'Any Difficulty', onPress: () => updatePlayerDifficulty(playerId, null) },
      { label: 'Easy', onPress: () => updatePlayerDifficulty(playerId, 'easy') },
      { label: 'Medium', onPress: () => updatePlayerDifficulty(playerId, 'medium') },
      { label: 'Hard', onPress: () => updatePlayerDifficulty(playerId, 'hard') },
    ];

    if (Platform.OS === 'web') {
      setWebPicker({ title: 'Select Difficulty', options });
    } else {
      Alert.alert('Select Difficulty', undefined, [
        ...options.map(o => ({ text: o.label, onPress: o.onPress })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  const handleSetPackMode = (mode: 'shared' | 'custom') => {
    if (mode === 'shared') {
      clearPlayerPackSources();
    }
    setPackMode(mode);
  };

  const handleStartGame = async () => {
    // CONF-01: Prevent starting without pack selection
    if (!activePackId) {
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

    // Only navigate if the game actually started — startGame catches errors internally
    // and resets phase to 'setup' on failure.
    if (useGameStore.getState().phase === 'selecting') {
      router.replace('/game/turn');
    } else {
      Alert.alert('Error', 'Failed to start game. Please try again.');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background?.val as string }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.color?.val as string }]}>
          Setup Game
        </Text>
        <Text style={[styles.subtitle, { color: theme.color?.val as string, opacity: 0.7 }]}>
          Add 1-6 participants
        </Text>
      </View>

      {/* Pack info display — tap to navigate to pack selection (D-01) */}
      <Pressable style={styles.packInfo} onPress={() => router.push('/packs')}>
        {packName ? (
          <>
            <Text style={[styles.packText, { color: theme.color?.val as string }]}>
              Pack: {packName}
            </Text>
            <Text style={[styles.packChange, { color: theme.color?.val as string }]}>
              Change
            </Text>
          </>
        ) : (
          <Text style={[styles.packWarning, { color: '#ffa500' }]}>
            Tap to select a question pack
          </Text>
        )}
      </Pressable>

      {/* Pack mode toggle — Shared Pack vs Per Player (v7.0) */}
      <View style={styles.segmentedControl}>
        <Pressable
          style={[styles.segment, packMode === 'shared' && styles.segmentActive]}
          onPress={() => handleSetPackMode('shared')}
        >
          <Text style={[styles.segmentText, packMode === 'shared' && styles.segmentTextActive]}>
            Shared Pack
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segment, packMode === 'custom' && styles.segmentActive]}
          onPress={() => handleSetPackMode('custom')}
        >
          <Text style={[styles.segmentText, packMode === 'custom' && styles.segmentTextActive]}>
            Per Player
          </Text>
        </Pressable>
      </View>

      {/* Participant list */}
      <View style={styles.playerList}>
        {players.map((player, index) => {
          const playerComboName = player.comboId
            ? (savedCombos.find(c => c.id === player.comboId)?.name ?? 'Custom Combo')
            : null;
          const playerPackName = !playerComboName && player.packId
            ? (availablePacks.find(p => p.id === player.packId)?.name ?? 'Custom Pack')
            : null;
          const displayName = playerComboName ?? playerPackName;
          const chipLabel = displayName
            ? (displayName.length > 12 ? displayName.slice(0, 12) + '...' : displayName)
            : 'Default';
          const difficultyLabel = player.difficultyPreference
            ? player.difficultyPreference.charAt(0).toUpperCase() + player.difficultyPreference.slice(1)
            : 'Any Difficulty';

          return (
            <View key={player.id} style={styles.playerRowOuter}>
              {/* Row 1: color dot | name input | remove button */}
              <View style={styles.playerRow}>
                <View
                  style={[
                    styles.colorIndicator,
                    { backgroundColor: CATEGORY_COLORS[player.color as PlayerColor] },
                  ]}
                />
                <TextInput
                  style={[styles.nameInput, { color: theme.color?.val as string }]}
                  value={player.name}
                  onChangeText={(name) => handleNameChange(player.id, name)}
                  placeholder={`Player ${index + 1}`}
                  placeholderTextColor={theme.color?.val as string}
                />
                <Pressable
                  style={styles.removeButton}
                  onPress={() => handleRemovePlayer(player.id)}
                >
                  <Text style={styles.removeButtonText}>×</Text>
                </Pressable>
              </View>

              {/* Row 2 (custom mode only): full-width source row + difficulty chip */}
              {packMode === 'custom' && (
                <>
                  <Pressable
                    style={styles.playerSourceRow}
                    onPress={() => handlePickSource(player.id)}
                  >
                    <Text style={styles.playerSourceLabel} numberOfLines={1}>
                      {displayName ? `Pack: ${displayName}` : 'Pack: Default (game pack)'}
                    </Text>
                    <Text style={styles.playerSourceChevron}>{'→'}</Text>
                  </Pressable>
                  <View style={styles.packChipRow}>
                    <Pressable
                      style={[
                        styles.packChip,
                        player.difficultyPreference ? styles.packChipActive : styles.packChipDefault,
                      ]}
                      onPress={() => handlePickDifficulty(player.id)}
                    >
                      <Text style={styles.packChipText} numberOfLines={1}>
                        {difficultyLabel}
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          );
        })}
      </View>

      {/* Add participant button */}
      <View style={styles.addButtonContainer}>
        <AddPlayerButton
          onPress={handleAddPlayer}
          disabled={players.length >= 6}
        />
        {players.length >= 6 && (
          <Text style={[styles.maxPlayersHint, { color: theme.color?.val as string }]}>
            Maximum 6 participants
          </Text>
        )}
      </View>

      {/* Start game button */}
      <View style={styles.startContainer}>
        <Pressable
          style={[
            styles.startButton,
            {
              backgroundColor: players.length === 0 || !activePackId
                ? (theme.color?.val as string) + '40'
                : SEMANTIC_COLORS.success,
              opacity: players.length === 0 || !activePackId ? 0.5 : 1,
            },
          ]}
          onPress={handleStartGame}
          disabled={players.length === 0 || !activePackId}
        >
          <Text style={[styles.startButtonText, { color: theme.background?.val as string }]}>
            Start Game
          </Text>
        </Pressable>
        {players.length === 0 && (
          <Text style={[styles.minPlayersHint, { color: theme.color?.val as string }]}>
            Add at least 1 participant
          </Text>
        )}
        {!activePackId && players.length > 0 && (
          <Text style={[styles.minPlayersHint, { color: '#ffa500' }]}>
            Select a pack above to start
          </Text>
        )}
      </View>
      {/* Web picker modal — replaces Alert.alert for source/difficulty selection */}
      {Platform.OS === 'web' && webPicker && (
        <Modal transparent visible onRequestClose={() => setWebPicker(null)}>
          <TouchableWithoutFeedback onPress={() => setWebPicker(null)}>
            <View style={styles.webPickerBackdrop}>
              <TouchableWithoutFeedback>
                <View style={styles.webPickerCard}>
                  <Text style={styles.webPickerTitle}>{webPicker.title}</Text>
                  <View style={styles.webPickerDivider} />
                  {webPicker.options.map((opt, i) => (
                    <Pressable
                      key={i}
                      style={({ pressed }) => [
                        styles.webPickerItem,
                        pressed && styles.webPickerItemPressed,
                      ]}
                      onPress={() => { opt.onPress(); setWebPicker(null); }}
                    >
                      <Text style={styles.webPickerItemText}>{opt.label}</Text>
                    </Pressable>
                  ))}
                  <View style={styles.webPickerDivider} />
                  <Pressable
                    style={({ pressed }) => [styles.webPickerItem, pressed && styles.webPickerItemPressed]}
                    onPress={() => setWebPicker(null)}
                  >
                    <Text style={[styles.webPickerItemText, { opacity: 0.5 }]}>Cancel</Text>
                  </Pressable>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  packInfo: {
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  packText: {
    fontSize: 16,
    fontWeight: '500',
  },
  packChange: {
    fontSize: 14,
    opacity: 0.6,
    textDecorationLine: 'underline',
  },
  packWarning: {
    fontSize: 14,
    fontWeight: '500',
  },
  playerList: {
    marginBottom: 16,
  },
  playerRowOuter: {
    marginBottom: 8,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  colorIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  nameInput: {
    flex: 1,
    fontSize: 18,
    paddingVertical: 4,
  },
  removeButton: {
    padding: 8,
  },
  removeButtonText: {
    fontSize: 24,
    color: SEMANTIC_COLORS.remove,
  },
  packChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 36,
    marginTop: 4,
    gap: 4,
  },
  packChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  packChipDefault: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  packChipActive: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  packChipText: {
    fontSize: 11,
    color: '#ccc',
  },
  addButtonContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  maxPlayersHint: {
    fontSize: 12,
    marginTop: 8,
    opacity: 0.7,
  },
  startContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  startButton: {
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  minPlayersHint: {
    fontSize: 12,
    marginTop: 8,
    opacity: 0.7,
  },
  webPickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webPickerCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    width: 280,
    overflow: 'hidden',
  },
  webPickerTitle: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    letterSpacing: 0.3,
  },
  webPickerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  webPickerItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  webPickerItemPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  webPickerItemText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    marginBottom: 16,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#aaa',
  },
  segmentTextActive: {
    color: '#111',
  },
  playerSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 4,
  },
  playerSourceLabel: {
    fontSize: 14,
    color: '#ccc',
    flex: 1,
  },
  playerSourceChevron: {
    fontSize: 14,
    color: '#ccc',
    marginLeft: 8,
  },
});