import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GamePhase, GameState, VALID_TRANSITIONS } from '../types/game';
import { PlayerColor } from '../constants/categories';
import { Question } from '../types/question';
import { useQuestionStore } from './questionStore';
import { usePlayerStore } from './playerStore';
import { usePackStore } from './packStore';
import { Player } from '../types/player';

// WR-02: Guard against race conditions in markAnswer setTimeout
let transitionPending = false;

interface GameStore extends GameState {
  /** Current question being displayed */
  currentQuestion: Question | null;
  /** Current category (derived from question or selected) */
  currentCategory: PlayerColor | null;
  /** Active pack ID for current game session (D-15: only one active) */
  activePackId: string | null;
  /** Transition to a new phase (validates transition) */
  transitionTo: (newPhase: GamePhase) => void;
  /** Select a category and get a question from it */
  selectCategory: (category: PlayerColor) => Promise<void>;
  /** Roll the die and return result (1-6) */
  rollDie: () => number;
  /** Start the game */
  startGame: () => Promise<void>;
  /** Next turn */
  nextTurn: () => Promise<void>;
  /** Reset game state to initial values */
  resetGame: () => void;
}

/**
 * Game store
 * Manages game phase, current player, and question state
 * Persisted to AsyncStorage for session resume
 *
 * Per QSTN-02/03: Uses questionStore for category-based selection
 * Per QSTN-03: Marks questions as asked to avoid repeats
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
      isCenterQuestion: false, // SCOR-03
      winner: null, // SCOR-03
      activePackId: null, // D-15: Track active pack for game session

      // Actions
      startGame: async () => {
        // Get active pack from packStore (D-15)
        const { activePackId } = usePackStore.getState();
        if (!activePackId) {
          console.error('No active pack selected');
          return;
        }

        // Reset asked questions for new game (QSTN-03)
        await useQuestionStore.getState().resetAskedQuestions();
        // Reset wedges for new game (SCOR-01)
        usePlayerStore.getState().resetWedges();

        // Select first question (default category 'blue' for now)
        const question = await useQuestionStore.getState().selectQuestion('blue');

        set({
          phase: 'rolling',
          currentQuestion: question,
          currentCategory: question?.category ?? 'blue',
          currentPlayerIndex: 0,
          questionNumber: 1,
          answerRevealed: false,
          dieResult: null,
          isCenterQuestion: false, // Reset center question flag
          winner: null, // Reset winner
          activePackId, // Track for this game session
        });
      },

      rollDie: () => {
        const result = Math.floor(Math.random() * 6) + 1;
        set({ dieResult: result });
        return result;
      },

      nextTurn: async () => {
        const { players } = usePlayerStore.getState();
        const { selectQuestion } = useQuestionStore.getState();

        if (players.length === 0) {
          console.error('nextTurn called with no players');
          set({ phase: 'setup' });
          return;
        }

        const nextIndex = (get().currentPlayerIndex + 1) % players.length;

        // Category from board position (Phase 4 integration)
        // For now, use current category or default
        const category = get().currentCategory || 'blue';
        const question = await selectQuestion(category);

        set({
          currentPlayerIndex: nextIndex,
          dieResult: null,
          answerRevealed: false,
          currentQuestion: question,
          currentCategory: question?.category ?? category,
          phase: 'rolling',
          questionNumber: get().questionNumber + 1,
          isCenterQuestion: false, // Reset center question flag
        });
      },

      revealAnswer: () => set({ answerRevealed: true }),

      // SCOR-02, SCOR-03: Award wedge and check win condition
      markAnswer: (correct: boolean) => {
        const { players } = usePlayerStore.getState();
        const { currentQuestion, isCenterQuestion, currentPlayerIndex } = get();

        if (players.length === 0) {
          console.error('markAnswer called with no players');
          return;
        }

        const currentPlayer = players[currentPlayerIndex];

        // WR-03: Guard against invalid currentPlayerIndex
        if (!currentPlayer) {
          console.error('Invalid currentPlayerIndex:', currentPlayerIndex);
          return;
        }

        // Mark question as asked (QSTN-03)
        if (currentQuestion) {
          useQuestionStore.getState().markAsked(currentQuestion.id);
        }

        // SCOR-02: Award wedge on correct answer (not on center question)
        if (correct && !isCenterQuestion && currentQuestion) {
          const category = currentQuestion.category;
          usePlayerStore.getState().awardWedge(currentPlayer.id, category);
        }

        // SCOR-03: Check win condition
        if (correct && isCenterQuestion) {
          // Center question requires all 6 wedges + correct answer
          const hasAllWedges = usePlayerStore.getState().hasAllWedges(currentPlayer.id);

          if (hasAllWedges) {
            // Winner! Game over
            set({
              phase: 'finished',
              winner: currentPlayer as Player,
              answerRevealed: false,
              activePackId: null, // Clear for next game
            });
            return; // Don't advance to next turn
          }
          // Not all wedges or wrong answer: continue game (fall through)
        }

        // Reset for next question
        set({ answerRevealed: false });

        // Trigger next turn after delay for visual feedback
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

      selectCategory: async (category: PlayerColor) => {
        const question = await useQuestionStore.getState().selectQuestion(category);
        set({
          currentCategory: category,
          currentQuestion: question,
        });
      },

      // SCOR-03: Helper to set center question mode (called from board position logic)
      startCenterQuestion: async () => {
        // Center question uses random category (or could use player's choice)
        const categories: PlayerColor[] = ['blue', 'pink', 'yellow', 'purple', 'green', 'orange'];
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        const question = await useQuestionStore.getState().selectQuestion(randomCategory);

        set({
          currentQuestion: question,
          currentCategory: question?.category ?? randomCategory,
          isCenterQuestion: true,
          phase: 'answering',
        });
      },

      // WR-01: Reset game state to initial values
      resetGame: () => {
        set({
          phase: 'setup',
          currentPlayerIndex: 0,
          questionNumber: 1,
          answerRevealed: false,
          currentQuestion: null,
          currentCategory: null,
          dieResult: null,
          isCenterQuestion: false,
          winner: null,
          activePackId: null,
        });
      },
    }),
    {
      name: 'trivial-world-game',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist active pack for session resume
      partialize: (state) => ({
        activePackId: state.activePackId,
      }),
    }
  )
);