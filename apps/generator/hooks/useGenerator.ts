import { useState, useCallback } from 'react';
import type { Question, Category } from '@trivial-world/types';
import { generateQuestion, verifyQuestion, type ConfidenceScore, DEFAULT_MODEL } from '@/lib/ollama/client';

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
  const [progress, setProgress] = useState<{ current: number; total: number; pass: number } | null>(null);

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
    setProgress({ current: 0, total: batchSize, pass: 0 });

    try {
      const newQuestions: QuestionWithVerification[] = [];

      for (let i = 0; i < batchSize; i++) {
        setProgress({ current: i + 1, total: batchSize, pass: 0 });

        // Generate question with source material (AI-02)
        const question = await generateQuestion(
          topic,
          category,
          guidance,
          sourceMaterial,
          model,
          ollamaUrl
        );

        // Verify with 3 passes
        setProgress({ current: i + 1, total: batchSize, pass: 1 });
        const verification = await verifyQuestion(question, model, ollamaUrl);

        newQuestions.push({
          question,
          verification,
          status: verification.needsReview ? 'pending' : 'pending', // D-10: all visible
        });
      }

      // Save to localStorage per RESEARCH.md Pattern 4
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('trivial-world-generator-queue');
        const existing = stored ? JSON.parse(stored) : [];
        localStorage.setItem(
          'trivial-world-generator-queue',
          JSON.stringify([...existing, ...newQuestions])
        );
      }

      setQueue((prev) => [...prev, ...newQuestions]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
      setProgress(null);
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
      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('trivial-world-generator-queue', JSON.stringify(updated));
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
      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('trivial-world-generator-queue', JSON.stringify(updated));
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
      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('trivial-world-generator-queue', JSON.stringify(updated));
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
   */
  const getPendingQuestions = useCallback(() => {
    return queue.filter((q) => q.status === 'pending');
  }, [queue]);

  /**
   * Get approved questions (ready for pack)
   */
  const getApprovedQuestions = useCallback(() => {
    return queue.filter((q) => q.status === 'approved');
  }, [queue]);

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
    getPendingQuestions,
    getApprovedQuestions,
    next: () => setCurrentIndex((i) => Math.min(i + 1, queue.length - 1)),
    prev: () => setCurrentIndex((i) => Math.max(i - 1, 0)),
  };
}