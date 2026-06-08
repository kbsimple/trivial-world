import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from 'tamagui';
import { usePlayerStore } from '../../stores/playerStore';
import { useGameStore } from '../../stores/gameStore';
import { AddPlayerButton } from '../../components/AddPlayerButton';
import { CATEGORY_COLORS } from '../../constants/categories';
import type { PlayerColor } from '../../constants/categories';

/**
 * Game setup screen
 * - Add/remove participants (D-04)
 * - Auto-assigned colors (D-05)
 * - 1-6 players (D-06)
 * - Optional names, default "Player N" (D-07)
 * - Swipe to remove (D-08)
 */
export default function SetupScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { players, addPlayer, removePlayer, updatePlayerName } = usePlayerStore();
  const { startGame } = useGameStore();
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const handleStartGame = () => {
    if (players.length > 0) {
      startGame();
      router.push('/game/question');
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

      {/* Participant list */}
      <View style={styles.playerList}>
        {players.map((player, index) => (
          <View key={player.id} style={styles.playerRow}>
            {/* Color indicator */}
            <View
              style={[
                styles.colorIndicator,
                { backgroundColor: CATEGORY_COLORS[player.color as PlayerColor] },
              ]}
            />

            {/* Name input (D-04: inline editing) */}
            <TextInput
              style={[styles.nameInput, { color: theme.color?.val as string }]}
              value={player.name}
              onChangeText={(name) => handleNameChange(player.id, name)}
              placeholder={`Player ${index + 1}`}
              placeholderTextColor={theme.color?.val as string}
            />

            {/* Remove button */}
            <Pressable
              style={styles.removeButton}
              onPress={() => handleRemovePlayer(player.id)}
            >
              <Text style={styles.removeButtonText}>×</Text>
            </Pressable>
          </View>
        ))}
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
              backgroundColor: players.length === 0
                ? (theme.color?.val as string) + '40'
                : '#228b22', // Green for Start Game
              opacity: players.length === 0 ? 0.5 : 1,
            },
          ]}
          onPress={handleStartGame}
          disabled={players.length === 0}
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
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 24,
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
  playerList: {
    marginBottom: 16,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
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
    color: '#ff6b6b',
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
});