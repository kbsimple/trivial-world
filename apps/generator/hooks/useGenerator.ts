import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { Question, Category } from '@trivial-world/types';
import { generateQuestion } from '@/lib/ollama/client';
import { verifyQuestion, type ConfidenceScore, type VerificationResult } from '@/lib/ollama/verification';
import { DEFAULT_MODEL } from '@/lib/ollama/client';

/**
 * Question with verification metadata
 * Per D-09: All 3 verification pass results visible to reviewer
 */
export interface QuestionWithVerification {
  /** The generated question */
  question: Question;
  /** Verification pass results */
  verification: ConfidenceScore;
  /** Question status in review queue */
  status: 'pending' | 'approved' | 'rejected' | 'needs-edit';
  /** Edited question (if user modified it) */
  editedQuestion?: Question;
}

/**
 * Progress status during generation
 */
export type ProgressStatus = 'generating' | 'verifying' | 'complete';

/**
 * Progress state for VerificationProgress component
 * Per D-14: Show progress to maintain UX during generation
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

/**
 * Generator state hook
 * Per RESEARCH.md Pattern 4: React state management for question queue
 * Per D-14: Pipeline automation with fast batch processing
 * Per AI-02: Source material support
 */
export function useGenerator() {
  const [queue, setQueue] = useState<QuestionWithVerification[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressState | null>(null);

  // Per WR-05: Track timeout for cleanup on unmount
  const progressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (progressTimeoutRef.current) {
        clearTimeout(progressTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Generate a batch of questions
   * Per D-16: Batch size limited to 10 for reasonable response times
   * Per AI-02: Source material passed through for context-aware generation
   *
   * @param topic - The topic for questions
   * @param category - The question category
   * @param count - Number of questions to generate (max 10)
   * @param guidance - Optional additional guidance
   * @param sourceMaterial - Optional source material (AI-02)
   * @param model - Model to use
   * @param ollamaUrl - Optional Ollama endpoint override
   */
  const generateBatch = useCallback(async (
    topic: string,
    category: Category,
    count: number,
    guidance?: string,
    sourceMaterial?: string,
    model: string = DEFAULT_MODEL,
    ollamaUrl?: string
  ) => {
    // Per D-16: Limit batch size
    const batchSize = Math.min(count, 10);
    setIsGenerating(true);
    setError(null);
    setProgress({ currentQuestion: 0, totalQuestions: batchSize, currentPass: 0, status: 'generating' });

    try {
      const newQuestions: QuestionWithVerification[] = [];

      for (let i = 0; i < batchSize; i++) {
        // Generation phase
        setProgress({ currentQuestion: i + 1, totalQuestions: batchSize, currentPass: 0, status: 'generating' });

        // Generate question with source material (AI-02)
        const question = await generateQuestion(
          topic,
          category,
          guidance,
          sourceMaterial,
          model,
          ollamaUrl
        );

        // Verification phase - 3 passes
        // Per D-07: Multi-pass verification with different phrasings
        setProgress({ currentQuestion: i + 1, totalQuestions: batchSize, currentPass: 1, status: 'verifying' });
        const verification = await verifyQuestion(question, model, ollamaUrl);

        newQuestions.push({
          question,
          verification,
          status: verification.needsReview ? 'pending' : 'pending', // D-10: all visible
        });
      }

      // Save to localStorage per RESEARCH.md Pattern 4
      // Per WR-02: Race condition safe - isGenerating prevents concurrent batches
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('trivial-world-generator-queue');
        const existing = stored ? JSON.parse(stored) : [];
        localStorage.setItem(
          'trivial-world-generator-queue',
          JSON.stringify([...existing, ...newQuestions])
        );
      }

      setQueue((prev) => [...prev, ...newQuestions]);

      // Mark as complete
      setProgress({ currentQuestion: batchSize, totalQuestions: batchSize, currentPass: 3, status: 'complete' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
      // Clear progress after a brief delay to show "Complete"
      // Per WR-05: Use ref to track timeout for cleanup
      if (progressTimeoutRef.current) {
        clearTimeout(progressTimeoutRef.current);
      }
      progressTimeoutRef.current = setTimeout(() => setProgress(null), 500);
    }
  }, []);

  /**
   * Load queue from localStorage on mount
   */
  const loadQueue = useCallback(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('trivial-world-generator-queue');
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as QuestionWithVerification[];
          setQueue(parsed);
        } catch {
          // Invalid stored data, clear it
          localStorage.removeItem('trivial-world-generator-queue');
        }
      }
    }
  }, []);

  /**
   * Approve a question
   * Per D-13: Approve adds to pack
   */
  const approve = useCallback((id: string) => {
    setQueue((prev) => {
      const updated = prev.map((q) =>
        q.question.id === id ? { ...q, status: 'approved' as const } : q
      );
      // Update localStorage with error handling
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('trivial-world-generator-queue', JSON.stringify(updated));
        } catch (err) {
          console.error('Failed to save queue state:', err);
        }
      }
      return updated;
    });
  }, []);

  /**
   * Reject a question
   * Per D-13: Reject discards question
   */
  const reject = useCallback((id: string) => {
    setQueue((prev) => {
      const updated = prev.map((q) =>
        q.question.id === id ? { ...q, status: 'rejected' as const } : q
      );
      // Update localStorage with error handling
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('trivial-world-generator-queue', JSON.stringify(updated));
        } catch (err) {
          console.error('Failed to save queue state:', err);
        }
      }
      return updated;
    });
  }, []);

  /**
   * Edit a question
   * Per D-12: Full edit capability before approve
   */
  const edit = useCallback((id: string, edited: Question) => {
    setQueue((prev) => {
      const updated = prev.map((q) =>
        q.question.id === id ? { ...q, editedQuestion: edited } : q
      );
      // Update localStorage with error handling
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('trivial-world-generator-queue', JSON.stringify(updated));
        } catch (err) {
          console.error('Failed to save queue state:', err);
        }
      }
      return updated;
    });
  }, []);

  /**
   * Clear the queue
   */
  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentIndex(0);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('trivial-world-generator-queue');
    }
  }, []);

  /**
   * Get pending questions (awaiting review)
   * Per IN-04: Use useMemo to avoid unnecessary re-renders
   */
  const pendingQuestions = useMemo(() =>
    queue.filter((q) => q.status === 'pending'),
    [queue]
  );

  /**
   * Get approved questions (ready for pack)
   * Per IN-04: Use useMemo to avoid unnecessary re-renders
   */
  const approvedQuestions = useMemo(() =>
    queue.filter((q) => q.status === 'approved'),
    [queue]
  );

  /**
   * Get queue statistics
   * Returns total, pending, and needs-review counts
   * Per IN-04: Use useMemo to avoid unnecessary re-renders
   */
  const queueStats = useMemo(() => {
    const total = queue.length;
    const pending = queue.filter((q) => q.status === 'pending').length;
    const needsReview = queue.filter((q) => q.verification.needsReview).length;
    return { total, pending, needsReview };
  }, [queue]);

  /**
   * Set current index directly
   * Useful for navigation after approve/reject
   */
  const setCurrentIndexDirect = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  return {
    queue,
    currentQuestion: queue[currentIndex],
    currentIndex,
    isGenerating,
    error,
    progress,
    generateBatch,
    loadQueue,
    approve,
    reject,
    edit,
    clearQueue,
    pendingQuestions,
    approvedQuestions,
    queueStats,
    setCurrentIndex: setCurrentIndexDirect,
    next: () => setCurrentIndex((i) => Math.min(i + 1, queue.length - 1)),
    prev: () => setCurrentIndex((i) => Math.max(i - 1, 0)),
  };
}