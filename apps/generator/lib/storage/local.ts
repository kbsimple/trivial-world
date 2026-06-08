/**
 * LocalStorage persistence layer for approved questions
 * Per D-18: Manual JSON download for approved packs
 * Per RESEARCH.md: LocalStorage for client-side persistence
 */

import type { Question, Category } from '@trivial-world/types';
import { QuestionSchema } from '@trivial-world/types';

/**
 * Storage key for approved questions
 */
const STORAGE_KEY = 'trivial-world-approved-questions';

/**
 * Approved question with timestamp
 * Per D-18: Track when questions were approved
 */
export interface ApprovedQuestion {
  question: Question;
  approvedAt: string;
}

/**
 * Save a question to approved list in LocalStorage
 * Per T-07-10: Try-catch for QuotaExceededError handling
 *
 * @param question - The question to save
 * @throws Error if validation fails or storage quota exceeded
 */
export function saveApprovedQuestion(question: Question): void {
  if (typeof window === 'undefined') {
    return; // SSR guard
  }

  try {
    // Validate question against schema
    const result = QuestionSchema.safeParse(question);
    if (!result.success) {
      throw new Error(`Invalid question: ${result.error.message}`);
    }

    // Get existing approved questions
    const existing = getApprovedQuestions();

    // Check if question already exists (by ID)
    const alreadyApproved = existing.some((aq) => aq.question.id === question.id);
    if (alreadyApproved) {
      console.warn(`Question ${question.id} already approved, skipping duplicate save`);
      return;
    }

    // Add new question with timestamp
    const approvedQuestion: ApprovedQuestion = {
      question: result.data,
      approvedAt: new Date().toISOString(),
    };

    // Save to LocalStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, approvedQuestion]));
  } catch (err) {
    if (err instanceof Error && err.name === 'QuotaExceededError') {
      console.error('LocalStorage quota exceeded. Consider clearing old approved questions.');
      throw new Error('Storage quota exceeded. Please download your pack and clear some approved questions.');
    }
    throw err;
  }
}

/**
 * Get all approved questions from LocalStorage
 *
 * @returns Array of approved questions with timestamps
 */
export function getApprovedQuestions(): ApprovedQuestion[] {
  if (typeof window === 'undefined') {
    return []; // SSR guard
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    // Validate that it's an array
    if (!Array.isArray(parsed)) {
      console.warn('Invalid approved questions format in storage, clearing');
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }

    // Validate each question
    return parsed.filter((item: unknown) => {
      if (typeof item !== 'object' || item === null) {
        return false;
      }
      const aq = item as { question?: unknown; approvedAt?: unknown };
      if (typeof aq.approvedAt !== 'string') {
        return false;
      }
      // Validate question against schema
      const result = QuestionSchema.safeParse(aq.question);
      return result.success;
    }) as ApprovedQuestion[];
  } catch (err) {
    console.error('Error reading approved questions:', err);
    return [];
  }
}

/**
 * Clear all approved questions from LocalStorage
 */
export function clearApprovedQuestions(): void {
  if (typeof window === 'undefined') {
    return; // SSR guard
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Error clearing approved questions:', err);
  }
}

/**
 * Remove a specific approved question by ID
 *
 * @param questionId - The ID of the question to remove
 */
export function removeApprovedQuestion(questionId: string): void {
  if (typeof window === 'undefined') {
    return; // SSR guard
  }

  try {
    const existing = getApprovedQuestions();
    const filtered = existing.filter((aq) => aq.question.id !== questionId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Error removing approved question:', err);
  }
}

/**
 * Get count of approved questions by category
 * Per D-18: Track category distribution for pack metadata
 *
 * @returns Record mapping category to count
 */
export function getApprovedCountByCategory(): Record<Category, number> {
  if (typeof window === 'undefined') {
    return {
      blue: 0,
      pink: 0,
      yellow: 0,
      purple: 0,
      green: 0,
      orange: 0,
    };
  }

  const approved = getApprovedQuestions();

  // Initialize all categories to 0
  const counts: Record<Category, number> = {
    blue: 0,
    pink: 0,
    yellow: 0,
    purple: 0,
    green: 0,
    orange: 0,
  };

  // Count by category
  for (const aq of approved) {
    counts[aq.question.category] = (counts[aq.question.category] || 0) + 1;
  }

  return counts;
}

/**
 * Get total count of approved questions
 *
 * @returns Total number of approved questions
 */
export function getApprovedCount(): number {
  if (typeof window === 'undefined') {
    return 0;
  }
  return getApprovedQuestions().length;
}