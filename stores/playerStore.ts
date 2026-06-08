import { create } from 'zustand';
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
 */
export const usePlayerStore = create<PlayerState>((set, get) => ({
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

  resetPlayers: () => set({ players: [] }),
}));