import { PlayerColor } from '../constants/categories';
import { Player } from './player';
import { Difficulty } from '@trivial-world/types';

/**
 * Game phase state machine — v4.0 Simplified Gameplay
 *
 * Flow: setup → selecting (pick a category) → answering → back to selecting
 * Streak: correct answer = same player selects next category
 *         incorrect answer = next player's turn
 * Championship: all 6 categories complete → isChampionshipMode flag set;
 *               correct championship answer wins the game
 */
export type GamePhase =
  | 'setup'
  | 'selecting'
  | 'answering'
  | 'finished';

export const VALID_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
  setup: ['selecting'],
  selecting: ['answering'],
  answering: ['selecting', 'finished'],
  finished: [],
};

/**
 * Game state — persisted via platformStorage (AsyncStorage mobile, sessionStorage web)
 */
export interface GameState {
  phase: GamePhase;
  currentPlayerIndex: number;
  questionNumber: number;
  answerRevealed: boolean;
  /** Categories each player has answered correctly, indexed by player order — SIMP-02 */
  completedCategories: PlayerColor[][];
  /** Whether each player has all 6 done and is in championship mode — SIMP-08 */
  isChampionshipMode: boolean[];
  /** Player who won (null if game ongoing) */
  winner: Player | null;
  /** Snapshotted pack ID per player at game start (index matches player order).
   *  null = player inherited the game-level activePackId. */
  playerPackIds: (string | null)[];
  /** Snapshotted active categories per player (from pack categoryCounts + enabledCategories filter).
   *  Immutable during game — determines per-player championship condition. */
  playerCategories: PlayerColor[][];
  /** Snapshotted difficulty preference per player at game start (index matches player order).
   *  null = player uses game-level enabledDifficulties fallback. */
  playerDifficulties: (Difficulty | null)[];

  // Actions
  startGame: () => void;
  nextTurn: () => void;
  revealAnswer: () => void;
  markAnswer: (correct: boolean) => void;
}

/**
 * Category type alias — maps to player colors
 */
export type Category = PlayerColor;

/**
 * Question interface (local UI type)
 */
export interface Question {
  id: string;
  category: Category;
  questionText: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
}
