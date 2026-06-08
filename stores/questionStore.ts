import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlayerColor } from '../constants/categories';
import { Question } from '../types/question';
import { getQuestionsByCategory } from '../data/questions';

/**
 * Question store state
 * Manages question selection, asked tracking, and category filtering
 */
interface QuestionState {
  /** IDs of questions asked in current game session */
  askedQuestions: Set<string>;
  /** Currently displayed question */
  currentQuestion: Question | null;
  /** Current category */
  currentCategory: PlayerColor | null;
  /** Categories enabled for custom games (null = all enabled) */
  enabledCategories: PlayerColor[] | null;

  // Actions
  /** Select a question from category pool, excluding asked questions */
  selectQuestion: (category: PlayerColor) => Question | null;
  /** Mark a question as asked (call after answer) */
  markAsked: (questionId: string) => void;
  /** Reset asked questions for new game */
  resetAskedQuestions: () => void;
  /** Set enabled categories for custom game (null = all) */
  setEnabledCategories: (categories: PlayerColor[] | null) => void;
}

/**
 * Question store
 * Manages question selection with no-repeat tracking
 * Uses Set for O(1) lookup of asked questions
 *
 * Per RESEARCH.md Pattern 1:
 * - Set.has() is O(1) vs Array.includes() O(n)
 * - Pool resets when exhausted with console warning
 * - Category filter checked before selection
 */
export const useQuestionStore = create<QuestionState>()(
  persist(
    (set, get) => ({
      askedQuestions: new Set<string>(),
      currentQuestion: null,
      currentCategory: null,
      enabledCategories: null,

      selectQuestion: (category: PlayerColor) => {
        const { askedQuestions, enabledCategories } = get();

        // Check if category is enabled (QSTN-04)
        if (enabledCategories && !enabledCategories.includes(category)) {
          console.warn(`Category ${category} is disabled in custom game`);
          return null;
        }

        // Get all questions for this category
        const pool = getQuestionsByCategory(category);

        // Filter out already-asked questions (QSTN-03)
        const available = pool.filter(q => !askedQuestions.has(q.id));

        // If all questions exhausted, reset category (allow repeats)
        if (available.length === 0) {
          console.warn(`All questions exhausted for category ${category}, resetting pool`);
          // Fisher-Yates shuffle for random selection
          const shuffled = [...pool].sort(() => Math.random() - 0.5);
          const selected = shuffled[0];
          set({
            currentQuestion: selected,
            currentCategory: category,
          });
          return selected;
        }

        // Fisher-Yates shuffle for random selection
        const shuffled = [...available].sort(() => Math.random() - 0.5);
        const selected = shuffled[0];

        set({
          currentQuestion: selected,
          currentCategory: category,
        });

        return selected;
      },

      markAsked: (questionId: string) => {
        set((state) => ({
          askedQuestions: new Set([...state.askedQuestions, questionId]),
        }));
      },

      resetAskedQuestions: () => {
        set({ askedQuestions: new Set<string>() });
      },

      setEnabledCategories: (categories: PlayerColor[] | null) => {
        set({ enabledCategories: categories });
      },
    }),
    {
      name: 'trivial-world-questions',
      storage: createJSONStorage(() => AsyncStorage),
      // Custom serialization for Set (convert to array for JSON)
      partialize: (state) => ({
        askedQuestions: [...state.askedQuestions],
        enabledCategories: state.enabledCategories,
      }),
      // Custom deserialization (convert array back to Set)
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.askedQuestions = new Set(state.askedQuestions as unknown as string[]);
        }
      },
    }
  )
);