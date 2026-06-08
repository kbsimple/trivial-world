import { PlayerColor } from '../constants/categories';
import { Player } from './player';

/**
 * Game phase state machine
 * Valid transitions defined in VALID_TRANSITIONS
 */
export type GamePhase =
  | 'setup'
  | 'rolling'
  | 'moving'
  | 'answering'
  | 'scoring'
  | 'finished';

/**
 * Valid phase transitions
 * Ensures game progresses in correct order
 * SCOR-03: 'scoring' can transition to 'finished' on win
 */
export const VALID_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
  setup: ['rolling'],
  rolling: ['moving'],
  moving: ['answering'],
  answering: ['scoring'],
  scoring: ['rolling', 'finished'], // Can go to finished on win
  finished: [],
};

/**
 * Game state interface
 * Persisted to AsyncStorage via Zustand middleware
 */
export interface GameState {
  /** Current phase in game lifecycle */
  phase: GamePhase;
  /** Index of current player in players array */
  currentPlayerIndex: number;
  /** Current question number (increments each turn) */
  questionNumber: number;
  /** Whether answer is currently visible */
  answerRevealed: boolean;
  /** Result of die roll (1-6) or null if not rolled yet */
  dieResult: number | null;
  /** Whether current question is a center question (win attempt) - SCOR-03 */
  isCenterQuestion: boolean;
  /** Player who won (null if game ongoing) - SCOR-03 */
  winner: Player | null;

  // Actions
  /** Start game from setup phase */
  startGame: () => void;
  /** Move to next turn */
  nextTurn: () => void;
  /** Reveal the answer */
  revealAnswer: () => void;
  /** Mark answer as correct or incorrect */
  markAnswer: (correct: boolean) => void;
}

/**
 * Category type derived from Trivial World categories
 * Maps to player colors (blue, pink, yellow, purple, green, orange)
 */
export type Category = PlayerColor;

/**
 * Question interface
 */
export interface Question {
  id: string;
  category: Category;
  questionText: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
}