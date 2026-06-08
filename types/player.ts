import { PlayerColor } from '../constants/categories';

/**
 * Player interface
 * Represents a participant in the game
 */
export interface Player {
  /** Unique identifier */
  id: string;
  /** Display name (default: "Player N") */
  name: string;
  /** Auto-assigned color matching category */
  color: PlayerColor;
}

/**
 * Player state interface
 * Managed by Zustand store
 */
export interface PlayerState {
  /** Array of players in game (max 6) */
  players: Player[];

  // Actions
  /** Add a new player with auto-assigned color */
  addPlayer: (name?: string) => void;
  /** Remove player by ID and reassign colors */
  removePlayer: (id: string) => void;
  /** Clear all players */
  resetPlayers: () => void;
}