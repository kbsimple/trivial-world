import { PlayerColor } from '../constants/categories';

/**
 * Question difficulty levels
 * Used for potential difficulty filtering in future versions
 */
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Question interface
 * Represents a single trivia question with category, text, and answer
 */
export interface Question {
  /** Unique identifier (format: '{category}-{number}') */
  id: string;
  /** Category color (maps to PlayerColor) */
  category: PlayerColor;
  /** Question text to display */
  questionText: string;
  /** Correct answer */
  answerText: string;
  /** Optional difficulty level */
  difficulty?: QuestionDifficulty;
}