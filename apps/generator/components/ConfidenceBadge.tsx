/**
 * ConfidenceBadge component
 * Displays verification confidence score with color-coded indicator
 * Per D-08: Confidence scoring based on pass agreement (3/3=100%, 2/3=67%, 1/3 or 0/3=flagged)
 * Per D-10: Questions marked 'needs review' displayed with yellow/red color
 * Per UI-SPEC: Confidence Score Colors (lines 94-100)
 */

interface ConfidenceBadgeProps {
  /** Confidence score percentage (0-100) */
  score: number;
  /** Number of verification passes that passed (0-3) */
  passes: number;
}

/**
 * Get color and label based on confidence score
 * Per UI-SPEC:
 * - 100% (3/3 passes): #22c55e (green) — High confidence
 * - 67% (2/3 passes): #eab308 (yellow) — Needs review
 * - 33% or lower (0-1/3 passes): #ef4444 (red) — Low confidence
 */
function getConfidenceDisplay(score: number): { color: string; label: string } {
  if (score >= 90) {
    return { color: '#22c55e', label: 'High confidence' };
  } else if (score >= 67) {
    return { color: '#eab308', label: 'Needs review' };
  } else {
    return { color: '#ef4444', label: 'Low confidence' };
  }
}

export function ConfidenceBadge({ score, passes }: ConfidenceBadgeProps) {
  const { color, label } = getConfidenceDisplay(score);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color,
        padding: '12px 24px',
        borderRadius: '8px',
        minWidth: '200px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '8px',
        }}
      >
        <span
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#ffffff',
          }}
        >
          {score}%
        </span>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'rgba(255, 255, 255, 0.9)',
          }}
        >
          — {label}
        </span>
      </div>
      <span
        style={{
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.8)',
          marginTop: '4px',
        }}
      >
        {passes}/3 passes verified
      </span>
    </div>
  );
}