/**
 * Player colors in Trivial World
 * Derived from Trivial Pursuit category colors
 * Assigned in order: Blue, Pink, Yellow, Purple, Green, Orange
 */
export const PLAYER_COLORS = ['blue', 'pink', 'yellow', 'purple', 'green', 'orange'] as const;

/**
 * Player color type
 * Union type derived from PLAYER_COLORS array
 */
export type PlayerColor = typeof PLAYER_COLORS[number];

/**
 * Category colors mapping
 * Hex values for each player/category color
 * Used in UI for color indicators and badges
 */
export const CATEGORY_COLORS: Record<PlayerColor, string> = {
  blue: '#0066cc',
  pink: '#ff69b4',
  yellow: '#ffd700',
  purple: '#9932cc',
  green: '#228b22',
  orange: '#ff8c00',
};

/**
 * Category display names
 * Human-readable category names matching each color
 */
export const CATEGORY_NAMES: Record<PlayerColor, string> = {
  blue: 'The World Outside',
  pink: 'Pop Culture & Streaming',
  yellow: 'Milestones & Myths',
  purple: 'Animation and Artwork',
  green: 'Tech, Space & Logic',
  orange: 'Sports & Gaming',
};