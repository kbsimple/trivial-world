import { Category, Difficulty, Question } from '@trivial-world/types';
import { ALL_QUESTIONS, getQuestionsByCategory } from '../data/questions';
import { PlayerColor } from '../constants/categories';
import { logger } from '../utils/logger';
import { getCachedPackQuestions, setCachedPackQuestions } from './packCache';

async function fetchWebPackQuestions(packId: string): Promise<Question[] | null> {
  // 1. Check IDB cache first — persists across page reloads
  const cached = await getCachedPackQuestions(packId);
  if (cached) return cached;

  // 2. Try network (existing fetch logic)
  const { usePackStore } = await import('../stores/packStore');
  const packEntry = usePackStore.getState().availablePacks.find(p => p.id === packId);
  if (!packEntry) return null;

  try {
    const res = await fetch(packEntry.downloadUrl);
    if (!res.ok) return null;
    const { QuestionPackSchema } = await import('@trivial-world/types');
    const result = QuestionPackSchema.safeParse(await res.json());
    if (!result.success) return null;
    await setCachedPackQuestions(packId, result.data.questions);
    return result.data.questions;
  } catch {
    return null; // offline + no IDB cache → caller falls back to ALL_QUESTIONS
  }
}

/**
 * Question provider abstraction per D-07.
 *
 * Web/PWA-only (Phase 24-02 collapse): the IDB-first web path is the sole
 * implementation. The WatermelonDB native path was removed in 24-01; the
 * former web-only branches in getNextQuestion / getQuestionsForCategory
 * are inlined as the only path.
 */

/**
 * Convert PlayerColor to Category type
 * Both types have the same values, but Category is canonical from @trivial-world/types
 */
function playerColorToCategory(color: PlayerColor): Category {
  return color as Category;
}

/**
 * Get next question for a category, excluding already-asked questions
 * @param category - The category to get a question from
 * @param excludeIds - Array of question IDs to exclude (already asked)
 * @param packIds - Pack IDs to source questions from (fetched on demand and pooled)
 * @returns A random unasked question, or null if none available
 */
export async function getNextQuestion(
  category: PlayerColor,
  excludeIds: string[],
  packIds?: string[],
  difficulty?: Difficulty,
  enabledDifficulties?: Difficulty[] | null
): Promise<Question | null> {
  return getNextQuestionFromBundle(playerColorToCategory(category), excludeIds, packIds, difficulty, enabledDifficulties);
}

/**
 * Get all questions for a category (for category filtering UI)
 * @param category - The category to get questions for
 * @returns Array of all questions in the category
 */
export async function getQuestionsForCategory(
  category: PlayerColor
): Promise<Question[]> {
  return getQuestionsByCategory(playerColorToCategory(category));
}

// --- Implementation ---

/**
 * Get question from selected packs (fetched on demand) or bundled fallback per D-08
 * Pools questions from all packIds when multiple packs are provided (multi-pack combo support)
 */
async function getNextQuestionFromBundle(
  category: Category,
  excludeIds: string[],
  packIds?: string[],
  difficulty?: Difficulty,
  enabledDifficulties?: Difficulty[] | null
): Promise<Question | null> {
  // Use pack-specific questions if available, otherwise fall back to bundled data
  let pool: Question[];
  if (packIds && packIds.length > 0) {
    const poolArrays = await Promise.all(packIds.map(pid => fetchWebPackQuestions(pid)));
    const fetched = poolArrays.flatMap(qs => qs ?? []);
    pool = fetched.length > 0 ? fetched : ALL_QUESTIONS;
  } else {
    pool = ALL_QUESTIONS;
  }

  // D-06: Per-player difficulty takes precedence; fallback to game-level enabledDifficulties
  const effectiveDifficulties: Difficulty[] | null =
    difficulty != null
      ? [difficulty]
      : (enabledDifficulties && enabledDifficulties.length > 0 ? enabledDifficulties : null);

  const available = pool.filter(
    (q) => q.category === category && !excludeIds.includes(q.id)
      && (effectiveDifficulties != null ? effectiveDifficulties.includes(q.difficulty as Difficulty) : true)
  );

  if (available.length === 0) {
    const categoryQuestions = pool.filter(
      (q) => q.category === category
        && (effectiveDifficulties != null ? effectiveDifficulties.includes(q.difficulty as Difficulty) : true)
    );
    if (categoryQuestions.length === 0) return null;

    const selected = categoryQuestions[Math.floor(Math.random() * categoryQuestions.length)];
    logger.debug(`All questions exhausted for category ${category}, re-asking: ${selected.id}`);
    return selected;
  }

  return available[Math.floor(Math.random() * available.length)];
}