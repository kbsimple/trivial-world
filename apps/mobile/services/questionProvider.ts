import { Platform } from 'react-native';
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
 * Question provider abstraction per D-07
 * - Mobile: WatermelonDB with pack downloads
 * - Web: Bundled default pack questions per D-08
 *
 * This module provides a platform-aware question retrieval interface:
 * - Mobile queries WatermelonDB for questions from active pack
 * - Web uses bundled questions from default pack
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
 * @param packIds - Pack IDs to source questions from (web: fetches pack JSONs and pools; native: handled by caller)
 * @returns A random unasked question, or null if none available
 */
export async function getNextQuestion(
  category: PlayerColor,
  excludeIds: string[],
  packIds?: string[],
  difficulty?: Difficulty
): Promise<Question | null> {
  if (Platform.OS === 'web') {
    return getNextQuestionFromBundle(playerColorToCategory(category), excludeIds, packIds, difficulty);
  }
  return getNextQuestionFromDatabase(category, excludeIds, difficulty);
}

/**
 * Get all questions for a category (for category filtering UI)
 * @param category - The category to get questions for
 * @returns Array of all questions in the category
 */
export async function getQuestionsForCategory(
  category: PlayerColor
): Promise<Question[]> {
  if (Platform.OS === 'web') {
    return getQuestionsByCategory(playerColorToCategory(category));
  }
  return getQuestionsFromDatabase(category);
}

// --- Platform-specific implementations ---

/**
 * Web: Get question from selected packs (fetched on demand) or bundled fallback per D-08
 * Pools questions from all packIds when multiple packs are provided (multi-pack combo support)
 */
async function getNextQuestionFromBundle(
  category: Category,
  excludeIds: string[],
  packIds?: string[],
  difficulty?: Difficulty
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

  // Per-player difficulty filter: if difficulty != null, restrict to that difficulty
  const available = pool.filter(
    (q) => q.category === category && !excludeIds.includes(q.id)
      && (difficulty != null ? q.difficulty === difficulty : true)
  );

  if (available.length === 0) {
    const categoryQuestions = pool.filter(
      (q) => q.category === category
        && (difficulty != null ? q.difficulty === difficulty : true)
    );
    if (categoryQuestions.length === 0) return null;

    const selected = categoryQuestions[Math.floor(Math.random() * categoryQuestions.length)];
    logger.debug(`All questions exhausted for category ${category}, re-asking: ${selected.id}`);
    return selected;
  }

  return available[Math.floor(Math.random() * available.length)];
}

/**
 * Mobile: Get question from WatermelonDB per D-07
 * This imports database dynamically to avoid web bundling issues
 */
async function getNextQuestionFromDatabase(
  category: PlayerColor,
  excludeIds: string[],
  difficulty?: Difficulty
): Promise<Question | null> {
  // Dynamic import to avoid bundling database on web
  const { getDatabase } = await import('../database');
  const { Q } = await import('@nozbe/watermelondb');
  const { usePackStore } = await import('../stores/packStore');

  const database = getDatabase();
  const { activePackId, enabledCategories, enabledDifficulties } = usePackStore.getState();

  if (!activePackId) {
    logger.error('No active pack selected');
    return null;
  }

  // D-05: Check if category is enabled
  if (enabledCategories && !enabledCategories.includes(category as Category)) {
    logger.warn(`Category ${category} is disabled`);
    return null;
  }

  try {
    // Get active pack from WatermelonDB
    const packs = await database.get('question_packs')
      .query(Q.where('pack_id', activePackId))
      .fetch();

    if (packs.length === 0) {
      logger.error('Active pack not found in database');
      return null;
    }

    // Build query for available questions
    // D-06: Apply category and difficulty filters, exclude asked questions
    const query = database.get('questions')
      .query(
        Q.where('question_pack_id', packs[0].id),
        Q.where('category', category),
        Q.where('asked_at', null)
      );

    interface QuestionRecord {
      id: string;
      questionId: string;
      category: Category;
      questionText: string;
      answerText: string;
      difficulty?: Difficulty;
      askedAt: string | null;
    }

    const rawQuestions = await query.fetch();
    const questions = rawQuestions.map(q => ({
      id: (q as unknown as QuestionRecord).questionId,
      category: (q as unknown as QuestionRecord).category,
      questionText: (q as unknown as QuestionRecord).questionText,
      answerText: (q as unknown as QuestionRecord).answerText,
      difficulty: (q as unknown as QuestionRecord).difficulty,
      askedAt: (q as unknown as QuestionRecord).askedAt,
    }));

    // D-06: Per-player difficulty takes precedence; fallback to game-level enabledDifficulties
    const effectiveDifficulties: Difficulty[] | null =
      difficulty != null
        ? [difficulty]
        : (enabledDifficulties && enabledDifficulties.length > 0 ? enabledDifficulties : null);

    const filteredQuestions = effectiveDifficulties
      ? questions.filter(q => {
          const qDifficulty = q.difficulty;
          return qDifficulty && effectiveDifficulties.includes(qDifficulty as Difficulty);
        })
      : questions;

    // Exclude already asked questions (passed as excludeIds)
    const availableQuestions = filteredQuestions.filter(q => !excludeIds.includes(q.id));

    // If all questions exhausted, warn and return null
    if (availableQuestions.length === 0) {
      logger.warn(`All questions exhausted for category ${category}`);
      return null;
    }

    // Random selection from available questions
    const selected = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];

    // Convert to Question type for UI
    const question: Question = {
      id: selected.id,
      category: selected.category,
      questionText: selected.questionText,
      answerText: selected.answerText,
      difficulty: selected.difficulty,
    };

    return question;
  } catch (error) {
    logger.error('Error selecting question from database:', error);
    return null;
  }
}

/**
 * Mobile: Get all questions for category from database
 */
async function getQuestionsFromDatabase(category: PlayerColor): Promise<Question[]> {
  const { getDatabase } = await import('../database');
  const { Q } = await import('@nozbe/watermelondb');
  const { usePackStore } = await import('../stores/packStore');

  const database = getDatabase();
  const { activePackId } = usePackStore.getState();

  if (!activePackId) {
    logger.error('No active pack selected');
    return [];
  }

  try {
    const packs = await database.get('question_packs')
      .query(Q.where('pack_id', activePackId))
      .fetch();

    if (packs.length === 0) {
      logger.error('Active pack not found in database');
      return [];
    }

    interface QuestionRecord {
      id: string;
      questionId: string;
      category: Category;
      questionText: string;
      answerText: string;
      difficulty?: Difficulty;
    }

    const rawQuestions = await database.get('questions')
      .query(
        Q.where('question_pack_id', packs[0].id),
        Q.where('category', category)
      )
      .fetch();

    return rawQuestions.map((q) => {
      const record = q as unknown as QuestionRecord;
      return {
        id: record.questionId,
        category: record.category,
        questionText: record.questionText,
        answerText: record.answerText,
        difficulty: record.difficulty,
      };
    });
  } catch (error) {
    logger.error('Error fetching questions from database:', error);
    return [];
  }
}