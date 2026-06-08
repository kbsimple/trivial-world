import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GamePhase, GameState, VALID_TRANSITIONS } from '../types/game';

interface GameStore extends GameState {
  /** Transition to a new phase (validates transition) */
  transitionTo: (newPhase: GamePhase) => void;
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

      // Actions
      startGame: () => set({ phase: 'rolling' }),

      nextTurn: () => set((state) => ({
        questionNumber: state.questionNumber + 1,
        answerRevealed: false,
      })),

      revealAnswer: () => set({ answerRevealed: true }),

      markAnswer: (_correct: boolean) => {
        // Score update handled by playerStore
        // Reset answer visibility for next question
        set({ answerRevealed: false });
      },

      transitionTo: (newPhase: GamePhase) => {
        const current = get().phase;
        if (!VALID_TRANSITIONS[current].includes(newPhase)) {
          console.error(`Invalid transition: ${current} -> ${newPhase}`);
          return;
        }
        set({ phase: newPhase });
      },
    }),
    {
      name: 'trivial-world-game',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);