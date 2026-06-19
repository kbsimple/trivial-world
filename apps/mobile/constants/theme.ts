/**
 * Theme constants
 * Additional styling tokens beyond Tamagui config
 */

/**
 * Typography scale
 * Tamagui tokens for consistent sizing
 */
export const TYPOGRAPHY = {
  /** Small text (labels, captions) */
  small: '$3',
  /** Body text */
  body: '$4',
  /** Subhead */
  subhead: '$5',
  /** Headline */
  headline: '$6',
  /** Title */
  title: '$7',
  /** Large title */
  largeTitle: '$8',
  /** Display */
  display: '$10',
} as const;

/**
 * Spacing tokens
 * Used for margins and padding
 */
export const SPACING = {
  /** Extra small (4px) */
  xs: '$1',
  /** Small (8px) */
  sm: '$2',
  /** Medium (16px) */
  md: '$3',
  /** Large (24px) */
  lg: '$4',
  /** Extra large (32px) */
  xl: '$5',
  /** 2X large (48px) */
  xxl: '$6',
} as const;

/**
 * Button sizes
 * Touch target minimums for accessibility
 */
export const BUTTON_SIZES = {
  /** Small button (32px height) */
  small: '$3',
  /** Medium button (44px height) */
  medium: '$4',
  /** Large button (56px height) */
  large: '$5',
} as const;

/**
 * Animation durations
 * Standard timing for transitions
 */
export const ANIMATION = {
  /** Fast transition (150ms) */
  fast: 150,
  /** Standard transition (300ms) */
  standard: 300,
  /** Slow transition (500ms) */
  slow: 500,
} as const;

/**
 * Semantic color tokens
 * Used for consistent UI colors across the app
 * IN-02: Centralized colors for success, error, etc.
 */
export const SEMANTIC_COLORS = {
  /** Success color (bold red) - for start/positive action buttons (Option A palette) */
  success: '#e5191e',
  /** Error color (red) - for incorrect answers, destructive actions */
  error: '#dc143c',
  /** Remove/warning color (coral) - for remove buttons, warnings */
  remove: '#ff6b6b',
  /** Overlay background (semi-transparent white) */
  overlay: 'rgba(255,255,255,0.15)',
} as const;