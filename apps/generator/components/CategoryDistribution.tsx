/**
 * CategoryDistribution component
 * Shows question count per category with visual indicators
 * Per UI-SPEC: Category distribution breakdown with counts
 * Per D-02: Schema validation ensures category matches allowed values
 */

'use client';

import type { Category } from '@trivial-world/types';
import { CATEGORY_NAMES } from '@trivial-world/types';

/**
 * Category colors matching mobile app and UI-SPEC
 */
const CATEGORY_COLORS: Record<Category, string> = {
  blue: '#0066cc',
  pink: '#ff69b4',
  yellow: '#ffd700',
  purple: '#9932cc',
  green: '#228b22',
  orange: '#ff8c00',
};

/**
 * Category order for consistent display
 */
const CATEGORY_ORDER: Category[] = ['blue', 'pink', 'yellow', 'purple', 'green', 'orange'];

interface CategoryDistributionProps {
  /** Counts per category */
  categoryCounts: Record<Category, number>;
}

/**
 * CategoryDistribution component
 * Displays total questions and breakdown by category
 */
export function CategoryDistribution({ categoryCounts }: CategoryDistributionProps) {
  // Calculate total
  const totalQuestions = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* Total count header */}
      <div
        style={{
          borderBottom: '1px solid #374151',
          paddingBottom: '16px',
        }}
      >
        <h3
          style={{
            color: '#ffffff',
            fontSize: '18px',
            fontWeight: 600,
            margin: 0,
          }}
        >
          Approved Questions ({totalQuestions} total)
        </h3>
      </div>

      {/* Category breakdown */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {CATEGORY_ORDER.map((category) => {
          const count = categoryCounts[category] ?? 0;
          const color = CATEGORY_COLORS[category];
          const name = CATEGORY_NAMES[category];

          return (
            <div
              key={category}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              {/* Category color indicator */}
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: color,
                  borderRadius: '3px',
                }}
              />

              {/* Category name */}
              <span
                style={{
                  color: '#e5e7eb',
                  fontSize: '14px',
                  fontWeight: 500,
                  minWidth: '140px',
                }}
              >
                {name}
              </span>

              {/* Question count */}
              <span
                style={{
                  color: '#9ca3af',
                  fontSize: '14px',
                }}
              >
                {count} {count === 1 ? 'question' : 'questions'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}