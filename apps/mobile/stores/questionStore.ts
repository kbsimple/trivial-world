import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { platformStorage } from '../services/platformStorage';
import { PlayerColor } from '../constants/categories';
import { Category, Difficulty } from '@trivial-world/types';
import { usePackStore } from './packStore';
import { getNextQuestion } from '../services/questionProvider';

// Note: Question type imported from types/question for local use

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
  tidbits?: string;
}

/**
 * Question store state
 * Per CONTEXT.md Pattern 3: Question source is the IDB-backed questionProvider
 * Per D-05: Category filtering applied in selectQuestion
 * Per D-06: Difficulty filtering applied in selectQuestion
 */
interface QuestionState {
  /** Currently displayed question */
  currentQuestion: Question | null;
  /** Current category */
  currentCategory: PlayerColor | null;
  /** IDs of questions already asked this game (web-only; replaces WatermelonDB asked_at) */
  askedQuestionIds: string[];

  // Actions
  /** Select a question from active pack's category pool (supports multi-pack pooling via packIds) */
  selectQuestion: (category: PlayerColor, packIds?: string[], difficulty?: Difficulty) => Promise<Question | null>;
  /** Mark a question as asked (call after answer). Returns true if successful. */
  markAsked: (questionId: string) => Promise<boolean>;
  /** Reset asked questions for new game */
  resetAskedQuestions: () => Promise<void>;
  /** Remove a question from the asked pool (undo support) */
  unmarkAsked: (questionId: string) => Promise<void>;
}

/**
 * Question store — web/PWA-only (Phase 24-02 collapse).
 *
 * Question selection goes through services/questionProvider (IDB-first,
 * bundled-questions fallback). Asked-question tracking is a single in-memory
 * array persisted via platformStorage. The WatermelonDB asked_at path was
 * removed in 24-01; the former web-only branches in each action are inlined
 * as the only path.
 */
export const useQuestionStore = create<QuestionState>()(
  persist(
    (set, get) => ({
      currentQuestion: null,
      currentCategory: null,
      askedQuestionIds: [],

      selectQuestion: async (category: PlayerColor, packIds?: string[], difficulty?: Difficulty) => {
        const { activePackId, enabledDifficulties } = usePackStore.getState();
        const resolvedPackIds = packIds ?? (activePackId ? [activePackId] : undefined);
        const question = await getNextQuestion(category, get().askedQuestionIds, resolvedPackIds, difficulty, enabledDifficulties);
        if (question) {
          set({ currentQuestion: question, currentCategory: category });
        }
        return question;
      },

      markAsked: async (questionId: string): Promise<boolean> => {
        set((state) => ({ askedQuestionIds: [...state.askedQuestionIds, questionId] }));
        return true;
      },

      unmarkAsked: async (questionId: string): Promise<void> => {
        set((state) => ({
          askedQuestionIds: state.askedQuestionIds.filter(id => id !== questionId),
        }));
      },

      resetAskedQuestions: async () => {
        // Web platform limitation: askedQuestionIds is a single flat array shared
        // across all packs — it is not keyed by packId. Resetting it clears all
        // previously-asked IDs regardless of which pack they belonged to. This is
        // an accepted limitation: web always uses the bundled question pool (no
        // downloaded packs), so per-player packId assignments have no effect here.
        // If a second game starts with different packs the slate is wiped cleanly,
        // which is correct behaviour for the single shared pool.
        set({ askedQuestionIds: [] });
      },
    }),
    {
      name: 'trivial-world-questions',
      storage: createJSONStorage(() => platformStorage),
      partialize: (state) => ({
        currentQuestion: state.currentQuestion,
        currentCategory: state.currentCategory,
        askedQuestionIds: state.askedQuestionIds,
      }),
    }
  )
);