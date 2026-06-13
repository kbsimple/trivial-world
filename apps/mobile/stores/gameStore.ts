import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { platformStorage } from '../services/platformStorage';
import { GamePhase, GameState, VALID_TRANSITIONS } from '../types/game';
import { PlayerColor, PLAYER_COLORS } from '../constants/categories';
import { Question } from '../types/question';
import { useQuestionStore } from './questionStore';
import { usePlayerStore } from './playerStore';
import { usePackStore } from './packStore';
import { Player } from '../types/player';

const ALL_CATEGORIES: PlayerColor[] = [...PLAYER_COLORS];

function getActiveCategories(): PlayerColor[] {
  const { enabledCategories } = usePackStore.getState();
  return enabledCategories && enabledCategories.length > 0
    ? (enabledCategories as PlayerColor[])
    : ALL_CATEGORIES;
}

interface GameStore extends GameState {
  currentQuestion: Question | null;
  currentCategory: PlayerColor | null;
  activePackId: string | null;
  transitionTo: (newPhase: GamePhase) => void;
  selectCategory: (category: PlayerColor) => Promise<void>;
  startGame: () => Promise<void>;
  nextTurn: () => void;
  resetGame: () => void;
}

function makeCompletedCategories(playerCount: number): PlayerColor[][] {
  return Array.from({ length: playerCount }, () => []);
}

function makeChampionshipMode(playerCount: number): boolean[] {
  return Array.from({ length: playerCount }, () => false);
}

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
      completedCategories: [],
      isChampionshipMode: [],
      winner: null,
      activePackId: null,

      startGame: async () => {
        const { activePackId } = usePackStore.getState();
        if (!activePackId) {
          console.error('No active pack selected');
          return;
        }
        const playerCount = usePlayerStore.getState().players.length;
        if (playerCount === 0) {
          console.error('No players added');
          return;
        }

        try {
          await useQuestionStore.getState().resetAskedQuestions();

          set({
            phase: 'selecting',
            currentQuestion: null,
            currentCategory: null,
            currentPlayerIndex: 0,
            questionNumber: 1,
            answerRevealed: false,
            completedCategories: makeCompletedCategories(playerCount),
            isChampionshipMode: makeChampionshipMode(playerCount),
            winner: null,
            activePackId,
          });
        } catch (error) {
          console.error('Error starting game:', error);
          set({ phase: 'setup' });
        }
      },

      selectCategory: async (category: PlayerColor) => {
        const question = await useQuestionStore.getState().selectQuestion(category);
        set({
          currentCategory: category,
          currentQuestion: question,
          phase: 'answering',
        });
      },

      revealAnswer: () => set({ answerRevealed: true }),

      markAnswer: (correct: boolean) => {
        const { players } = usePlayerStore.getState();
        const {
          currentQuestion,
          currentPlayerIndex,
          completedCategories,
          isChampionshipMode,
          questionNumber,
        } = get();

        if (players.length === 0) return;
        const currentPlayer = players[currentPlayerIndex];
        if (!currentPlayer) return;

        if (currentQuestion) {
          useQuestionStore.getState().markAsked(currentQuestion.id);
        }

        if (correct) {
          const playerIsInChampionship = isChampionshipMode[currentPlayerIndex] ?? false;

          if (playerIsInChampionship) {
            // Championship question answered correctly — player wins
            set({
              phase: 'finished',
              winner: currentPlayer as Player,
              answerRevealed: false,
              activePackId: null,
            });
            return;
          }

          // Regular correct answer — mark category complete
          const category = currentQuestion?.category;
          const existing = completedCategories[currentPlayerIndex] ?? [];
          const alreadyDone = category ? existing.includes(category) : true;
          const newCompleted = category && !alreadyDone
            ? [...existing, category]
            : existing;

          const updatedCompleted = completedCategories.map((arr, i) =>
            i === currentPlayerIndex ? newCompleted : arr
          );

          // Check if all required categories (per pack filter) are now done
          const allDone = getActiveCategories().every(c => newCompleted.includes(c));
          const updatedChampionship = isChampionshipMode.map((val, i) =>
            i === currentPlayerIndex ? (allDone ? true : val) : val
          );

          set({
            completedCategories: updatedCompleted,
            isChampionshipMode: updatedChampionship,
            answerRevealed: false,
            currentQuestion: null,
            currentCategory: null,
            questionNumber: questionNumber + 1,
            phase: 'selecting', // same player continues their streak
          });
        } else {
          // Wrong answer — end turn, pass to next player
          const nextIndex = (currentPlayerIndex + 1) % players.length;
          set({
            currentPlayerIndex: nextIndex,
            answerRevealed: false,
            currentQuestion: null,
            currentCategory: null,
            questionNumber: questionNumber + 1,
            phase: 'selecting',
          });
        }
      },

      nextTurn: () => {
        const { players } = usePlayerStore.getState();
        if (players.length === 0) return;
        const nextIndex = (get().currentPlayerIndex + 1) % players.length;
        set({
          currentPlayerIndex: nextIndex,
          answerRevealed: false,
          currentQuestion: null,
          currentCategory: null,
          phase: 'selecting',
        });
      },

      transitionTo: (newPhase: GamePhase) => {
        const current = get().phase;
        if (!VALID_TRANSITIONS[current]?.includes(newPhase)) {
          console.error(`Invalid transition: ${current} -> ${newPhase}`);
          return;
        }
        set({ phase: newPhase });
      },

      resetGame: () => {
        set({
          phase: 'setup',
          currentPlayerIndex: 0,
          questionNumber: 1,
          answerRevealed: false,
          currentQuestion: null,
          currentCategory: null,
          completedCategories: [],
          isChampionshipMode: [],
          winner: null,
          activePackId: null,
        });
      },
    }),
    {
      name: 'trivial-world-game',
      storage: createJSONStorage(() => platformStorage),
      partialize: (state) => ({
        activePackId: state.activePackId,
        completedCategories: state.completedCategories,
        isChampionshipMode: state.isChampionshipMode,
        currentPlayerIndex: state.currentPlayerIndex,
        phase: state.phase,
        questionNumber: state.questionNumber,
        winner: state.winner,
      }),
    }
  )
);
