/**
 * VerificationProgress component
 * Displays real-time progress during question generation and verification
 * Per D-14: Pipeline automation with fast batch processing (show progress to maintain UX)
 * Per D-15: Generation triggered by user action, results appear within reasonable time
 * Per UI-SPEC: Generator Page Progress Indicator (lines 217-219)
 */

/**
 * Progress status during generation
 */
export type ProgressStatus = 'generating' | 'verifying' | 'complete';

/**
 * Progress state passed from useGenerator hook
 */
export interface ProgressState {
  /** Current question number (1-indexed) */
  currentQuestion: number;
  /** Total questions in batch */
  totalQuestions: number;
  /** Current verification pass (0 = generating, 1-3 = verifying) */
  currentPass: number;
  /** Overall status */
  status: ProgressStatus;
}

interface VerificationProgressProps {
  /** Current progress state */
  progress: ProgressState;
}

/**
 * Get status text based on current phase
 */
function getStatusText(status: ProgressStatus, currentPass: number): string {
  switch (status) {
    case 'generating':
      return 'Generating question...';
    case 'verifying':
      return `Verifying (${currentPass}/3)`;
    case 'complete':
      return 'Complete';
    default:
      return '';
  }
}

/**
 * Calculate overall progress percentage
 * Progress calculation per UI-SPEC:
 * - Each question = 100% / totalQuestions
 * - Within each question: generation (33%), verification pass 1 (22%), pass 2 (22%), pass 3 (23%)
 * - Overall progress = ((currentQuestion - 1) + currentPhaseProgress) / totalQuestions * 100
 */
function calculateProgress(progress: ProgressState): number {
  const { currentQuestion, totalQuestions, currentPass, status } = progress;

  if (status === 'complete') {
    return 100;
  }

  // Base progress from completed questions
  const completedQuestions = currentQuestion - 1;
  const baseProgress = (completedQuestions / totalQuestions) * 100;

  // Progress within current question
  let currentQuestionProgress = 0;
  if (status === 'generating') {
    // Generation is roughly 33% of a question's progress
    currentQuestionProgress = (1 / totalQuestions) * 33;
  } else if (status === 'verifying') {
    // Each pass is roughly 22-23% of a question's progress
    // Pass 1 = 22%, Pass 2 = 22%, Pass 3 = 23%
    const passWeight = currentPass === 3 ? 0.23 : 0.22;
    currentQuestionProgress = (1 / totalQuestions) * (33 + currentPass * passWeight * 100);
  }

  return Math.min(100, Math.round(baseProgress + currentQuestionProgress));
}

/**
 * VerificationProgress component
 * Shows real-time feedback during question generation and verification
 */
export function VerificationProgress({ progress }: VerificationProgressProps) {
  const { currentQuestion, totalQuestions, currentPass, status } = progress;
  const percentage = calculateProgress(progress);
  const statusText = getStatusText(status, currentPass);

  return (
    <div className="w-full space-y-2">
      {/* Status text */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Question {currentQuestion}/{totalQuestions} — {statusText}
        </span>
        <span className="text-sm text-muted">{percentage}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Verification pass indicators (only shown during verifying) */}
      {status === 'verifying' && (
        <div className="flex items-center gap-2 mt-2">
          {[1, 2, 3].map((passNum) => (
            <div
              key={passNum}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                passNum < currentPass
                  ? 'bg-green-100 text-green-800'
                  : passNum === currentPass
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {passNum < currentPass ? (
                <span>✓</span>
              ) : passNum === currentPass ? (
                <span className="animate-pulse">●</span>
              ) : (
                <span>○</span>
              )}
              <span>Pass {passNum}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}