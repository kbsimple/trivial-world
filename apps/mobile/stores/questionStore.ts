import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlayerColor } from '../constants/categories';
import { Category, Difficulty } from '@trivial-world/types';
import { usePackStore } from './packStore';

// Note: Question type imported from types/question for local use
// WatermelonDB queries return QuestionModel objects that are converted to Question type

/**
 * Question type for UI consumption
 * Matches the structure from packages/types/src/question.ts
 */
interface Question {
  id: string;
  category: Category;
  questionText: string;
  answerText: string;
  difficulty?: Difficulty;
}

/**
 * Question store state
 * Per CONTEXT.md Pattern 3: Query WatermelonDB for questions
 * Per D-05: Category filtering applied in selectQuestion
 * Per D-06: Difficulty filtering applied in selectQuestion
 */
interface QuestionState {
  /** Currently displayed question */
  currentQuestion: Question | null;
  /** Current category */
  currentCategory: PlayerColor | null;

  // Actions
  /** Select a question from active pack's category pool */
  selectQuestion: (category: PlayerColor) => Promise<Question | null>;
  /** Mark a question as asked (call after answer) */
  markAsked: (questionId: string) => Promise<void>;
  /** Reset asked questions for new game */
  resetAskedQuestions: () => Promise<void>;
}

/**
 * Question store
 * Manages question selection from WatermelonDB
 *
 * Per RESEARCH.md Pattern 3:
 * - Queries WatermelonDB for questions from active pack
 * - Category and difficulty filters from packStore
 * - Asked questions tracked via QuestionModel.askedAt field
 */
export const useQuestionStore = create<QuestionState>()(
  persist(
    (set, get) => ({
      currentQuestion: null,
      currentCategory: null,

      selectQuestion: async (category: PlayerColor) => {
        // Dynamic import to avoid circular dependency
        const { database } = await import('../database');
        const { QuestionModel } = await import('../database/models/Question');
        const { Q } = await import('@nozbe/watermelondb');

        const { activePackId, enabledCategories, enabledDifficulties } = usePackStore.getState();

        if (!activePackId) {
          console.error('No active pack selected');
          return null;
        }

        // D-05: Check if category is enabled
        if (enabledCategories && !enabledCategories.includes(category as Category)) {
          console.warn(`Category ${category} is disabled`);
          return null;
        }

        try {
          // Get active pack from WatermelonDB
          const packs = await database.get('question_packs')
            .query(Q.where('pack_id', activePackId))
            .fetch();

          if (packs.length === 0) {
            console.error('Active pack not found in database');
            return null;
          }

          // Build query for available questions
          // D-06: Apply category and difficulty filters
          let questions: any[] = [];

          // Query questions for this pack and category, not yet asked
          const query = database.get('questions')
            .query(
              Q.where('question_pack_id', packs[0].id),
              Q.where('category', category),
              Q.where('asked_at', null)
            );

          questions = await query.fetch();

          // D-06: Apply difficulty filter if set
          if (enabledDifficulties && enabledDifficulties.length > 0) {
            questions = questions.filter(q => {
              const qDifficulty = (q as any).difficulty;
              return qDifficulty && enabledDifficulties.includes(qDifficulty as Difficulty);
            });
          }

          // If all questions exhausted, warn and return null
          if (questions.length === 0) {
            console.warn(`All questions exhausted for category ${category}`);
            return null;
          }

          // Random selection from available questions
          const randomIndex = Math.floor(Math.random() * questions.length);
          const selected = questions[randomIndex] as QuestionModel;

          // Convert to Question type for UI
          const question: Question = {
            id: selected.questionId,
            category: selected.category as Category,
            questionText: selected.questionText,
            answerText: selected.answerText,
            difficulty: selected.difficulty as Difficulty | undefined,
          };

          set({
            currentQuestion: question,
            currentCategory: category,
          });

          return question;
        } catch (error) {
          console.error('Error selecting question:', error);
          return null;
        }
      },

      markAsked: async (questionId: string) => {
        // Dynamic import to avoid circular dependency
        const { database } = await import('../database');
        const { QuestionModel } = await import('../database/models/Question');
        const { Q } = await import('@nozbe/watermelondb');

        try {
          // Find and mark question as asked in WatermelonDB
          const questions = await database.get('questions')
            .query(Q.where('question_id', questionId))
            .fetch();

          if (questions.length > 0) {
            await database.write(async () => {
              await (questions[0] as QuestionModel).markAsAsked();
            });
          }
        } catch (error) {
          console.error('Error marking question as asked:', error);
        }
      },

      resetAskedQuestions: async () => {
        // Dynamic import to avoid circular dependency
        const { database } = await import('../database');
        const { QuestionModel } = await import('../database/models/Question');
        const { Q } = await import('@nozbe/watermelondb');

        const { activePackId } = usePackStore.getState();
        if (!activePackId) return;

        try {
          // Get pack record ID
          const packs = await database.get('question_packs')
            .query(Q.where('pack_id', activePackId))
            .fetch();

          if (packs.length === 0) return;

          // Reset all asked_at for questions in this pack
          const allQuestions = await database.get('questions')
            .query(Q.where('question_pack_id', packs[0].id))
            .fetch();

          await database.write(async () => {
            for (const q of allQuestions) {
              await (q as QuestionModel).update((question: any) => {
                question.askedAt = null;
              });
            }
          });
        } catch (error) {
          console.error('Error resetting asked questions:', error);
        }
      },
    }),
    {
      name: 'trivial-world-questions',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist currentQuestion and currentCategory
      // askedQuestions now tracked in WatermelonDB
      partialize: (state) => ({
        currentQuestion: state.currentQuestion,
        currentCategory: state.currentCategory,
      }),
    }
  )
);