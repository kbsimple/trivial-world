import { PlayerColor } from '../constants/categories';
import { Difficulty } from '@trivial-world/types';

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
  /** Wedges earned (max 6, one per category) - SCOR-01 */
  wedges: PlayerColor[];
  /** Per-player pack override — null means use game-level activePackId */
  packId?: string | null;
  /** Per-player difficulty override — null means use game-level enabledDifficulties */
  difficultyPreference?: Difficulty | null;
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
  /** Update player name */
  updatePlayerName: (id: string, name: string) => void;
  /** Clear all players */
  resetPlayers: () => void;
  /** Assign a question pack to a specific player (null = use game default) */
  updatePlayerPack: (id: string, packId: string | null) => void;
  /** Assign a difficulty preference to a specific player (null = use game-level default) */
  updatePlayerDifficulty: (id: string, difficulty: Difficulty | null) => void;

  // Scoring actions (SCOR-01)
  /** Award a wedge to a player for correct answer on category space */
  awardWedge: (playerId: string, category: PlayerColor) => void;
  /** Get count of wedges for a player */
  getWedgeCount: (playerId: string) => number;
  /** Check if player has all 6 wedges */
  hasAllWedges: (playerId: string) => boolean;
  /** Reset wedges for all players (new game) */
  resetWedges: () => void;
}