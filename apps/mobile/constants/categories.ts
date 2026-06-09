/**
 * Player colors in Trivial World
 * Derived from Trivial Pursuit category colors
 * Assigned in order: Blue, Pink, Yellow, Purple, Green, Orange
 *
 * Note: PlayerColor is deprecated in favor of Category from @trivial-world/types.
 * Both types have the same values, but Category is the canonical source.
 */
export const PLAYER_COLORS = ['blue', 'pink', 'yellow', 'purple', 'green', 'orange'] as const;

/**
 * Player color type
 * Union type derived from PLAYER_COLORS array
 *
 * Note: Prefer importing Category from @trivial-world/types for type safety.
 * PlayerColor is kept for backward compatibility with existing code.
 */
export type PlayerColor = typeof PLAYER_COLORS[number];

/**
 * Category colors mapping
 * Hex values for each category color
 * Used in UI for color indicators and badges
 *
 * IN-03: Uses Category type for type safety with @trivial-world/types
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
 *
 * IN-03: Uses Category type for type safety with @trivial-world/types
 */
export const CATEGORY_NAMES: Record<PlayerColor, string> = {
  blue: 'The World Outside',
  pink: 'Pop Culture & Streaming',
  yellow: 'Milestones & Myths',
  purple: 'Animation and Artwork',
  green: 'Tech, Space & Logic',
  orange: 'Sports & Gaming',
};