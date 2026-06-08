/**
 * Store exports
 * Re-export Zustand stores for convenience
 */

export { useGameStore } from './gameStore';
export { usePlayerStore } from './playerStore';

// Re-export types for convenience
export type { GameState, GamePhase } from '../types/game';
export type { Player, PlayerState } from '../types/player';
export { VALID_TRANSITIONS } from '../types/game';
export { PLAYER_COLORS, CATEGORY_COLORS, CATEGORY_NAMES } from '../constants/categories';
export type { PlayerColor } from '../constants/categories';