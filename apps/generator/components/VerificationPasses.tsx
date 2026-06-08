/**
 * VerificationPasses component
 * Displays all 3 verification pass results
 * Per D-09: All 3 pass results visible to human reviewer
 * Per D-10: Pass/fail status clearly indicated
 */

import type { VerificationResult } from '@/lib/ollama/verification';

interface VerificationPassesProps {
  /** Array of verification results (typically 3) */
  results: VerificationResult[];
}

/**
 * Map prompt key to display name
 * Per D-07: Three verification passes with different phrasings
 */
const PROMPT_NAMES: Record<string, string> = {
  factualAccuracy: 'Factual Accuracy',
  alternatePhrasing: 'Alternate Phrasing',
  reverseVerification: 'Reverse Verification',
};

/**
 * Get display name for a prompt key
 * Falls back to the key itself if unknown
 */
function getPromptName(promptKey: string): string {
  return PROMPT_NAMES[promptKey] || promptKey;
}

/**
 * Truncate text to max length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + '...';
}

/**
 * Checkmark SVG for passed verification
 */
function CheckIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M10 18a8 8 0 100-16 8 8 0 000 16z"
        fill="#22c55e"
      />
      <path
        d="M6 10l3 3 5-6"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * X mark SVG for failed verification
 */
function XIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M10 18a8 8 0 100-16 8 8 0 000 16z"
        fill="#ef4444"
      />
      <path
        d="M7 7l6 6M13 7l-6 6"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function VerificationPasses({ results }: VerificationPassesProps) {
  // Handle empty/pending state
  if (results.length === 0) {
    return (
      <div
        style={{
          padding: '16px',
          backgroundColor: '#1e1e2e',
          borderRadius: '8px',
        }}
      >
        <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
          Pending verification...
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #374151',
          marginBottom: '4px',
        }}
      >
        <h3 style={{ color: '#ffffff', fontSize: '16px', fontWeight: 600, margin: 0 }}>
          Verification Results
        </h3>
      </div>

      {results.map((result) => {
        const passNumber = result.pass;
        const totalPasses = 3;
        const promptName = getPromptName(result.prompt);
        const passed = result.passed;
        const responseText = truncateText(result.response, 200);

        return (
          <div
            key={passNumber}
            style={{
              padding: '12px 16px',
              backgroundColor: '#1e1e2e',
              borderRadius: '8px',
              borderLeft: `3px solid ${passed ? '#22c55e' : '#ef4444'}`,
            }}
          >
            {/* Pass number and prompt type */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
              }}
            >
              {passed ? <CheckIcon /> : <XIcon />}
              <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                Pass {passNumber}/{totalPasses}:
              </span>
              <span style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 500 }}>
                {promptName}
              </span>
            </div>

            {/* Pass/fail status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: passed ? '#22c55e' : '#ef4444',
                }}
              >
                {passed ? '✓ Correct' : '✗ Incorrect'}
              </span>
              {result.response && (
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                  — "{responseText}"
                </span>
              )}
            </div>

            {/* Full response on hover or click would go here in a tooltip/modal */}
            {/* For now, we show truncated response inline */}
          </div>
        );
      })}
    </div>
  );
}