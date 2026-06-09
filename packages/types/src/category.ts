import { z } from 'zod';

/**
 * Category enum matching existing PlayerColor type
 * Six categories adapted from Trivial Pursuit
 */
export const CategorySchema = z.enum([
  'blue',    // The World Outside
  'pink',    // Pop Culture & Streaming
  'yellow',  // Milestones & Myths
  'purple',  // Animation and Artwork
  'green',   // Tech, Space & Logic
  'orange',  // Sports & Gaming
]);
export type Category = z.infer<typeof CategorySchema>;

/**
 * Category display names for UI
 */
export const CATEGORY_NAMES: Record<Category, string> = {
  blue: 'The World Outside',
  pink: 'Pop Culture & Streaming',
  yellow: 'Milestones & Myths',
  purple: 'Animation and Artwork',
  green: 'Tech, Space & Logic',
  orange: 'Sports & Gaming',
};

/**
 * Difficulty levels for questions
 */
export const DifficultySchema = z.enum(['easy', 'medium', 'hard']);
export type Difficulty = z.infer<typeof DifficultySchema>;