import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PLAYER_COLORS, PlayerColor } from '../constants/categories';
import { Player, PlayerState } from '../types/player';

/**
 * Generate unique ID for players
 * Uses crypto.randomUUID if available, falls back to timestamp-based
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Player store
 * Manages participant list with auto-assigned colors
 * Max 6 players (limited by category colors)
 * Persisted to AsyncStorage for game resume (STAT-01, STAT-02)
 */
export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
  players: [],

  addPlayer: (name?: string) => set((state) => {
    // Max 6 players (D-06)
    if (state.players.length >= 6) {
      return state;
    }

    // Auto-assign color from PLAYER_COLORS (D-05)
    const nextColor = PLAYER_COLORS[state.players.length] as PlayerColor;

    // Default name if not provided (D-07)
    const playerName = name || `Player ${state.players.length + 1}`;

    return {
      players: [
        ...state.players,
        {
          id: generateId(),
          name: playerName,
          color: nextColor,
          wedges: [], // Initialize empty wedges array
        },
      ],
    };
  }),

  removePlayer: (id: string) => set((state) => {
    const filtered = state.players.filter(p => p.id !== id);

    // Reassign colors to remaining players (D-08)
    const reassigned = filtered.map((player, index) => ({
      ...player,
      color: PLAYER_COLORS[index] as PlayerColor,
    }));

    return { players: reassigned };
  }),

  updatePlayerName: (id: string, name: string) => set((state) => ({
    players: state.players.map(p =>
      p.id === id ? { ...p, name } : p
    ),
  })),

  resetPlayers: () => set({ players: [] }),

  // SCOR-01: Award wedge to player
  awardWedge: (playerId: string, category: PlayerColor) => set((state) => {
    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      console.warn(`Player ${playerId} not found`);
      return state;
    }

    // Check if already has this wedge (prevent duplicates)
    if (player.wedges.includes(category)) {
      console.warn(`Player ${playerId} already has ${category} wedge`);
      return state;
    }

    // Check wedge limit (max 6)
    if (player.wedges.length >= 6) {
      console.warn(`Player ${playerId} already has 6 wedges`);
      return state;
    }

    return {
      players: state.players.map(p =>
        p.id === playerId
          ? { ...p, wedges: [...p.wedges, category] }
          : p
      ),
    };
  }),

  // Get wedge count for player
  getWedgeCount: (playerId: string) => {
    const player = get().players.find(p => p.id === playerId);
    return player?.wedges.length ?? 0;
  },

  // Check if player has all 6 wedges
  hasAllWedges: (playerId: string) => {
    const player = get().players.find(p => p.id === playerId);
    return player?.wedges.length === 6;
  },

  // Reset wedges for all players (new game)
  resetWedges: () => set((state) => ({
    players: state.players.map(p => ({ ...p, wedges: [] })),
  })),
    }),
    {
      name: 'trivial-world-players',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);