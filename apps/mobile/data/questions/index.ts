import { PlayerColor } from '../../constants/categories';
import { Question } from '../../types/question';
import { WORLD_OUTSIDE_QUESTIONS } from './world-outside';
import { POP_CULTURE_QUESTIONS } from './pop-culture';
import { MILESTONES_MYTHS_QUESTIONS } from './milestones-myths';
import { ANIMATION_ARTWORK_QUESTIONS } from './animation-artwork';
import { TECH_SPACE_LOGIC_QUESTIONS } from './tech-space-logic';
import { SPORTS_GAMING_QUESTIONS } from './sports-gaming';

/**
 * All questions from all categories
 * Single source of truth for question data
 */
export const ALL_QUESTIONS: Question[] = [
  ...WORLD_OUTSIDE_QUESTIONS,
  ...POP_CULTURE_QUESTIONS,
  ...MILESTONES_MYTHS_QUESTIONS,
  ...ANIMATION_ARTWORK_QUESTIONS,
  ...TECH_SPACE_LOGIC_QUESTIONS,
  ...SPORTS_GAMING_QUESTIONS,
];

/**
 * Get all questions for a specific category
 * @param category - The category color to filter by
 * @returns Array of questions for the specified category
 */
export function getQuestionsByCategory(category: PlayerColor): Question[] {
  switch (category) {
    case 'blue':
      return WORLD_OUTSIDE_QUESTIONS;
    case 'pink':
      return POP_CULTURE_QUESTIONS;
    case 'yellow':
      return MILESTONES_MYTHS_QUESTIONS;
    case 'purple':
      return ANIMATION_ARTWORK_QUESTIONS;
    case 'green':
      return TECH_SPACE_LOGIC_QUESTIONS;
    case 'orange':
      return SPORTS_GAMING_QUESTIONS;
  }
}

/**
 * Get the count of questions for a category or all questions
 * @param category - Optional category to count. If not provided, returns total count.
 * @returns Number of questions
 */
export function getQuestionCount(category?: PlayerColor): number {
  if (category) {
    return getQuestionsByCategory(category).length;
  }
  return ALL_QUESTIONS.length;
}