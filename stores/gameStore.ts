import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GamePhase, GameState, VALID_TRANSITIONS } from '../types/game';
import { PlayerColor } from '../constants/categories';
import { getRandomQuestion, PlaceholderQuestion } from '../data/questions/placeholder';
import { usePlayerStore } from './playerStore';

interface GameStore extends GameState {
  /** Current question being displayed */
  currentQuestion: PlaceholderQuestion | null;
  /** Current category (derived from question or selected) */
  currentCategory: PlayerColor | null;
  /** Transition to a new phase (validates transition) */
  transitionTo: (newPhase: GamePhase) => void;
  /** Select a category and get a random question from it */
  selectCategory: (category: PlayerColor) => void;
  /** Roll the die and return result (1-6) */
  rollDie: () => number;
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
      dieResult: null,

      // Actions
      startGame: () => {
        const question = getRandomQuestion();
        set({
          phase: 'rolling',
          currentQuestion: question,
          currentCategory: question.category,
          currentPlayerIndex: 0,
          questionNumber: 1,
          answerRevealed: false,
          dieResult: null,
        });
      },

      rollDie: () => {
        const result = Math.floor(Math.random() * 6) + 1;
        set({ dieResult: result });
        return result;
      },

      nextTurn: () => {
        const { players } = usePlayerStore.getState();
        if (players.length === 0) {
          console.error('nextTurn called with no players');
          set({ phase: 'setup' });
          return;
        }
        const nextIndex = (get().currentPlayerIndex + 1) % players.length;
        const question = getRandomQuestion();
        set({
          currentPlayerIndex: nextIndex,
          dieResult: null,
          answerRevealed: false,
          currentQuestion: question,
          currentCategory: question.category,
          phase: 'rolling',
          questionNumber: get().questionNumber + 1,
        });
      },

      revealAnswer: () => set({ answerRevealed: true }),

      markAnswer: (_correct: boolean) => {
        const { players } = usePlayerStore.getState();
        if (players.length === 0) {
          console.error('markAnswer called with no players');
          return;
        }
        // Reset for next question
        set({ answerRevealed: false, questionNumber: get().questionNumber + 1 });
        // Trigger next turn after short delay for visual feedback
        setTimeout(() => {
          get().nextTurn();
        }, 500);
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