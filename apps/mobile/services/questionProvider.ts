import { Platform } from 'react-native';
import { Category, Difficulty, Question } from '@trivial-world/types';
import { ALL_QUESTIONS, getQuestionsByCategory } from '../data/questions';
import { PlayerColor } from '../constants/categories';
import { logger } from '../utils/logger';

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
 * @returns A random unasked question, or null if none available
 */
export async function getNextQuestion(
  category: PlayerColor,
  excludeIds: string[]
): Promise<Question | null> {
  if (Platform.OS === 'web') {
    return getNextQuestionFromBundle(playerColorToCategory(category), excludeIds);
  }
  return getNextQuestionFromDatabase(category, excludeIds);
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
 * Web: Get question from bundled default pack per D-08
 */
async function getNextQuestionFromBundle(
  category: Category,
  excludeIds: string[]
): Promise<Question | null> {
  const available = ALL_QUESTIONS.filter(
    (q) => q.category === category && !excludeIds.includes(q.id)
  );

  if (available.length === 0) {
    // Reset if all questions exhausted (allow re-asking)
    const categoryQuestions = ALL_QUESTIONS.filter((q) => q.category === category);
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
  excludeIds: string[]
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

    // D-06: Apply difficulty filter if set
    const filteredQuestions = enabledDifficulties && enabledDifficulties.length > 0
      ? questions.filter(q => {
          const qDifficulty = q.difficulty;
          return qDifficulty && enabledDifficulties.includes(qDifficulty as Difficulty);
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