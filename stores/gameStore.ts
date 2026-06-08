import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GamePhase, GameState, VALID_TRANSITIONS } from '../types/game';
import { PlayerColor } from '../constants/categories';
import { getRandomQuestion, PlaceholderQuestion } from '../data/questions/placeholder';

interface GameStore extends GameState {
  /** Current question being displayed */
  currentQuestion: PlaceholderQuestion | null;
  /** Current category (derived from question or selected) */
  currentCategory: PlayerColor | null;
  /** Transition to a new phase (validates transition) */
  transitionTo: (newPhase: GamePhase) => void;
  /** Select a category and get a random question from it */
  selectCategory: (category: PlayerColor) => void;
}

/**
 * Game store
 * Manages game phase, current player, and question state
 * Persisted to AsyncStorage for session resume
 */
export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // Initial state
      phase: 'setup',
      currentPlayerIndex: 0,
      questionNumber: 1,
      answerRevealed: false,
      currentQuestion: null,
      currentCategory: null,

      // Actions
      startGame: () => {
        // For Phase 1 testing: Set a random question
        const question = getRandomQuestion();
        set({
          phase: 'rolling',
          currentQuestion: question,
          currentCategory: question.category,
        });
      },

      nextTurn: () => set((state) => ({
        questionNumber: state.questionNumber + 1,
        answerRevealed: false,
      })),

      revealAnswer: () => set({ answerRevealed: true }),

      markAnswer: (_correct: boolean) => {
        // Score update handled by playerStore
        // Reset answer visibility for next question
        // Increment question number
        set((state) => ({
          answerRevealed: false,
          questionNumber: state.questionNumber + 1,
        }));
      },

      transitionTo: (newPhase: GamePhase) => {
        const current = get().phase;
        if (!VALID_TRANSITIONS[current].includes(newPhase)) {
          console.error(`Invalid transition: ${current} -> ${newPhase}`);
          return;
        }
        set({ phase: newPhase });
      },

      selectCategory: (category: PlayerColor) => {
        const question = getRandomQuestion(category);
        set({
          currentCategory: category,
          currentQuestion: question,
        });
      },
    }),
    {
      name: 'trivial-world-game',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);