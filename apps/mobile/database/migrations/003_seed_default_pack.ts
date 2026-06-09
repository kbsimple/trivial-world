import { database } from '../index';
import { QuestionPackModel } from '../models/QuestionPack';
import { QuestionModel } from '../models/Question';
import { DEFAULT_PACK_ID } from '../../constants/packConfig';
import { Category, Question } from '@trivial-world/types';
import { getQuestionsByCategory, ALL_QUESTIONS } from '../../data/questions';
import { PlayerColor } from '../../constants/categories';

/**
 * Seed default pack on first launch
 * Per D-02: Built-in default pack with 120 questions
 *
 * This migration runs when database is initialized and no packs exist.
 * It seeds the default pack from the bundled question data.
 */
export async function seedDefaultPack(): Promise<void> {
  // Check if any packs exist
  const existingPacks = await database.get('question_packs').query().fetch();

  if (existingPacks.length > 0) {
    // Packs already seeded, skip
    return;
  }

  // Import existing questions from bundled data
  // The existing data structure is in apps/mobile/data/questions/
  const categories: Category[] = ['blue', 'pink', 'yellow', 'purple', 'green', 'orange'];

  // Collect all questions
  const allQuestions: Question[] = [];
  const categoryCounts: Record<Category, number> = {
    blue: 0,
    pink: 0,
    yellow: 0,
    purple: 0,
    green: 0,
    orange: 0,
  };

  for (const category of categories) {
    const questions = getQuestionsByCategory(category);
    for (const q of questions) {
      allQuestions.push({
        id: q.id,
        category: q.category,
        questionText: q.questionText,
        answerText: q.answerText,
        difficulty: q.difficulty,
      });
      categoryCounts[category]++;
    }
  }

  // Create default pack in WatermelonDB
  await database.write(async () => {
    const pack = await database.get('question_packs').create((p: QuestionPackModel) => {
      p.packId = DEFAULT_PACK_ID;
      p.name = 'Trivial World Classic';
      p.description = 'The classic Trivial World question pack with 120 questions across all 6 categories.';
      p.version = '1.0.0';
      p.author = 'Trivial World';
      p.downloadedAt = Date.now();
      p.checksum = 'default-pack-bundled'; // Not downloaded, so no checksum
      p.isActive = true; // Default pack starts active (D-15)
      p.categoryCounts = JSON.stringify(categoryCounts);
      p.totalQuestions = allQuestions.length;
      p.schemaVersion = '1.0.0';
    });

    // Insert all questions
    for (const q of allQuestions) {
      await database.get('questions').create((question: QuestionModel) => {
        question.questionPackId = pack.id;
        question.questionId = q.id;
        question.category = q.category;
        question.questionText = q.questionText;
        question.answerText = q.answerText;
        question.difficulty = q.difficulty || 'medium';
        question.askedAt = null;
      });
    }
  });

  console.log(`Seeded default pack with ${allQuestions.length} questions`);
}

/**
 * Check if default pack needs seeding and run it
 * Call this on app initialization
 */
export async function ensureDefaultPack(): Promise<void> {
  try {
    await seedDefaultPack();
  } catch (error) {
    console.error('Failed to seed default pack:', error);
    throw error;
  }
}