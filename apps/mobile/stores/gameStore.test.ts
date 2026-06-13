/**
 * Tests for gameStore — v4.0 Simplified Gameplay
 *
 * Covers: startGame, selectCategory, revealAnswer, markAnswer (streak mechanic,
 * championship activation, championship win), nextTurn, transitionTo,
 * VALID_TRANSITIONS, and resetGame.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';
import { GamePhase, VALID_TRANSITIONS } from '../types/game';
import { PlayerColor } from '../constants/categories';
import { Player } from '../types/player';

vi.mock('./questionStore', () => ({
  useQuestionStore: {
    getState: vi.fn(() => ({
      selectQuestion: vi.fn(),
      markAsked: vi.fn(),
      resetAskedQuestions: vi.fn(),
    })),
  },
}));

vi.mock('./playerStore', () => ({
  usePlayerStore: {
    getState: vi.fn(() => ({
      players: [],
    })),
  },
}));

vi.mock('./packStore', () => ({
  usePackStore: {
    getState: vi.fn(() => ({
      activePackId: 'test-pack-id',
      availablePacks: [],
      enabledCategories: null,
      enabledDifficulties: null,
    })),
    setState: vi.fn(),
  },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
  },
}));

import { useQuestionStore } from './questionStore';
import { usePlayerStore } from './playerStore';
import { usePackStore } from './packStore';

const ALL_CATEGORIES: PlayerColor[] = ['blue', 'pink', 'yellow', 'purple', 'green', 'orange'];

function createMockQuestion(category: PlayerColor = 'blue') {
  return {
    id: `q-${category}-${Math.random()}`,
    category,
    questionText: 'Test question?',
    answerText: 'Test answer',
    difficulty: 'medium' as const,
  };
}

function createMockPlayer(index: number): Player {
  const colors: PlayerColor[] = ['blue', 'pink', 'yellow', 'purple', 'green', 'orange'];
  return {
    id: `player-${index}`,
    name: `Player ${index + 1}`,
    color: colors[index] || 'blue',
    wedges: [],
  };
}

function mockQuestionStore(overrides: Record<string, unknown> = {}) {
  vi.mocked(useQuestionStore.getState).mockReturnValue({
    selectQuestion: vi.fn(),
    markAsked: vi.fn(),
    resetAskedQuestions: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as any);
}

function mockPlayerStore(players: Player[]) {
  vi.mocked(usePlayerStore.getState).mockReturnValue({ players } as any);
}

describe('useGameStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.setState({
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
      playerPackIds: [],
      playerCategories: [],
      playerDifficulties: [],
    });
  });

  // ─────────────────────────────────────────────────────────
  describe('initial state', () => {
    it('has correct default values', () => {
      const state = useGameStore.getState();
      expect(state.phase).toBe('setup');
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.questionNumber).toBe(1);
      expect(state.answerRevealed).toBe(false);
      expect(state.currentQuestion).toBeNull();
      expect(state.currentCategory).toBeNull();
      expect(state.completedCategories).toEqual([]);
      expect(state.isChampionshipMode).toEqual([]);
      expect(state.winner).toBeNull();
      expect(state.activePackId).toBeNull();
      expect(state.playerPackIds).toEqual([]);
      expect(state.playerCategories).toEqual([]);
      expect(state.playerDifficulties).toEqual([]);
    });

    it('has all required action methods', () => {
      const state = useGameStore.getState();
      expect(typeof state.startGame).toBe('function');
      expect(typeof state.nextTurn).toBe('function');
      expect(typeof state.revealAnswer).toBe('function');
      expect(typeof state.markAnswer).toBe('function');
      expect(typeof state.transitionTo).toBe('function');
      expect(typeof state.selectCategory).toBe('function');
      expect(typeof state.resetGame).toBe('function');
    });
  });

  // ─────────────────────────────────────────────────────────
  describe('startGame', () => {
    it('transitions to selecting phase when pack and players exist', async () => {
      vi.mocked(usePackStore.getState).mockReturnValue({ activePackId: 'test-pack-id', availablePacks: [], enabledCategories: null } as any);
      mockPlayerStore([createMockPlayer(0)]);
      mockQuestionStore();

      await useGameStore.getState().startGame();

      const state = useGameStore.getState();
      expect(state.phase).toBe('selecting');
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.questionNumber).toBe(1);
      expect(state.answerRevealed).toBe(false);
      expect(state.winner).toBeNull();
      expect(state.activePackId).toBe('test-pack-id');
    });

    it('initializes one completedCategories array per player', async () => {
      vi.mocked(usePackStore.getState).mockReturnValue({ activePackId: 'test-pack-id', availablePacks: [], enabledCategories: null } as any);
      mockPlayerStore([createMockPlayer(0), createMockPlayer(1), createMockPlayer(2)]);
      mockQuestionStore();

      await useGameStore.getState().startGame();

      const { completedCategories } = useGameStore.getState();
      expect(completedCategories).toHaveLength(3);
      completedCategories.forEach(arr => expect(arr).toEqual([]));
    });

    it('initializes isChampionshipMode as all-false per player', async () => {
      vi.mocked(usePackStore.getState).mockReturnValue({ activePackId: 'test-pack-id', availablePacks: [], enabledCategories: null } as any);
      mockPlayerStore([createMockPlayer(0), createMockPlayer(1)]);
      mockQuestionStore();

      await useGameStore.getState().startGame();

      const { isChampionshipMode } = useGameStore.getState();
      expect(isChampionshipMode).toHaveLength(2);
      isChampionshipMode.forEach(val => expect(val).toBe(false));
    });

    it('resets asked questions', async () => {
      const resetAskedQuestions = vi.fn().mockResolvedValue(undefined);
      vi.mocked(usePackStore.getState).mockReturnValue({ activePackId: 'test-pack-id', availablePacks: [], enabledCategories: null } as any);
      mockPlayerStore([createMockPlayer(0)]);
      mockQuestionStore({ resetAskedQuestions });

      await useGameStore.getState().startGame();

      expect(resetAskedQuestions).toHaveBeenCalled();
    });

    it('does not pre-load a question (question loaded when category is chosen)', async () => {
      vi.mocked(usePackStore.getState).mockReturnValue({ activePackId: 'test-pack-id', availablePacks: [], enabledCategories: null } as any);
      mockPlayerStore([createMockPlayer(0)]);
      mockQuestionStore();

      await useGameStore.getState().startGame();

      expect(useGameStore.getState().currentQuestion).toBeNull();
      expect(useGameStore.getState().currentCategory).toBeNull();
    });

    it('does not start without an active pack', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(usePackStore.getState).mockReturnValue({ activePackId: null, availablePacks: [], enabledCategories: null } as any);

      await useGameStore.getState().startGame();

      expect(consoleSpy).toHaveBeenCalledWith('No active pack selected');
      expect(useGameStore.getState().phase).toBe('setup');
      consoleSpy.mockRestore();
    });

    it('does not start with no players', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(usePackStore.getState).mockReturnValue({ activePackId: 'test-pack-id', availablePacks: [], enabledCategories: null } as any);
      mockPlayerStore([]);

      await useGameStore.getState().startGame();

      expect(consoleSpy).toHaveBeenCalledWith('No players added');
      expect(useGameStore.getState().phase).toBe('setup');
      consoleSpy.mockRestore();
    });
  });

  // ─────────────────────────────────────────────────────────
  describe('selectCategory', () => {
    it('calls selectQuestion with the chosen category', async () => {
      const mockQuestion = createMockQuestion('pink');
      const selectQuestion = vi.fn().mockResolvedValue(mockQuestion);
      mockQuestionStore({ selectQuestion });

      await useGameStore.getState().selectCategory('pink');

      // playerPackIds and playerDifficulties are [] in this test's state, so [0] is undefined
      expect(selectQuestion).toHaveBeenCalledWith('pink', undefined, undefined);
    });

    it('sets currentCategory, currentQuestion, and phase to answering', async () => {
      const mockQuestion = createMockQuestion('yellow');
      mockQuestionStore({ selectQuestion: vi.fn().mockResolvedValue(mockQuestion) });

      await useGameStore.getState().selectCategory('yellow');

      const state = useGameStore.getState();
      expect(state.currentCategory).toBe('yellow');
      expect(state.currentQuestion).toEqual(mockQuestion);
      expect(state.phase).toBe('answering');
    });

    it('handles null question result gracefully', async () => {
      mockQuestionStore({ selectQuestion: vi.fn().mockResolvedValue(null) });

      await useGameStore.getState().selectCategory('green');

      const state = useGameStore.getState();
      expect(state.currentCategory).toBe('green');
      expect(state.currentQuestion).toBeNull();
      expect(state.phase).toBe('answering');
    });
  });

  // ─────────────────────────────────────────────────────────
  describe('revealAnswer', () => {
    it('sets answerRevealed to true', () => {
      useGameStore.setState({ answerRevealed: false });
      useGameStore.getState().revealAnswer();
      expect(useGameStore.getState().answerRevealed).toBe(true);
    });

    it('is idempotent when already revealed', () => {
      useGameStore.setState({ answerRevealed: true });
      useGameStore.getState().revealAnswer();
      expect(useGameStore.getState().answerRevealed).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────
  describe('markAnswer', () => {
    it('calls markAsked for the current question', () => {
      const markAsked = vi.fn();
      const mockQuestion = createMockQuestion('blue');
      mockPlayerStore([createMockPlayer(0)]);
      mockQuestionStore({ markAsked });

      useGameStore.setState({
        currentQuestion: mockQuestion,
        currentPlayerIndex: 0,
        completedCategories: [[]],
        isChampionshipMode: [false],
        questionNumber: 1,
      });

      useGameStore.getState().markAnswer(false);
      expect(markAsked).toHaveBeenCalledWith(mockQuestion.id);
    });

    it('does not call markAsked when currentQuestion is null', () => {
      const markAsked = vi.fn();
      mockPlayerStore([createMockPlayer(0)]);
      mockQuestionStore({ markAsked });

      useGameStore.setState({
        currentQuestion: null,
        currentPlayerIndex: 0,
        completedCategories: [[]],
        isChampionshipMode: [false],
        questionNumber: 1,
      });

      useGameStore.getState().markAnswer(true);
      expect(markAsked).not.toHaveBeenCalled();
    });

    it('returns early and leaves phase unchanged when players array is empty', () => {
      mockPlayerStore([]);
      useGameStore.setState({ phase: 'answering' });
      useGameStore.getState().markAnswer(true);
      expect(useGameStore.getState().phase).toBe('answering');
    });

    describe('correct answer — regular mode', () => {
      it('adds the answered category to completedCategories', () => {
        mockPlayerStore([createMockPlayer(0)]);
        mockQuestionStore();
        useGameStore.setState({
          currentQuestion: createMockQuestion('blue'),
          currentPlayerIndex: 0,
          completedCategories: [[]],
          isChampionshipMode: [false],
          questionNumber: 1,
        });

        useGameStore.getState().markAnswer(true);

        expect(useGameStore.getState().completedCategories[0]).toContain('blue');
      });

      it('keeps the same player active (streak continues)', () => {
        mockPlayerStore([createMockPlayer(0), createMockPlayer(1)]);
        mockQuestionStore();
        useGameStore.setState({
          currentQuestion: createMockQuestion('blue'),
          currentPlayerIndex: 0,
          completedCategories: [[], []],
          isChampionshipMode: [false, false],
          questionNumber: 1,
        });

        useGameStore.getState().markAnswer(true);

        const state = useGameStore.getState();
        expect(state.currentPlayerIndex).toBe(0);
        expect(state.phase).toBe('selecting');
      });

      it('clears currentQuestion, currentCategory, and answerRevealed', () => {
        mockPlayerStore([createMockPlayer(0)]);
        mockQuestionStore();
        useGameStore.setState({
          currentQuestion: createMockQuestion('yellow'),
          currentCategory: 'yellow',
          answerRevealed: true,
          currentPlayerIndex: 0,
          completedCategories: [[]],
          isChampionshipMode: [false],
          questionNumber: 1,
        });

        useGameStore.getState().markAnswer(true);

        const state = useGameStore.getState();
        expect(state.currentQuestion).toBeNull();
        expect(state.currentCategory).toBeNull();
        expect(state.answerRevealed).toBe(false);
      });

      it('increments questionNumber', () => {
        mockPlayerStore([createMockPlayer(0)]);
        mockQuestionStore();
        useGameStore.setState({
          currentQuestion: createMockQuestion('blue'),
          currentPlayerIndex: 0,
          completedCategories: [[]],
          isChampionshipMode: [false],
          questionNumber: 5,
        });

        useGameStore.getState().markAnswer(true);

        expect(useGameStore.getState().questionNumber).toBe(6);
      });

      it('does not add the same category twice', () => {
        mockPlayerStore([createMockPlayer(0)]);
        mockQuestionStore();
        useGameStore.setState({
          currentQuestion: createMockQuestion('blue'),
          currentPlayerIndex: 0,
          completedCategories: [['blue']],
          isChampionshipMode: [false],
          questionNumber: 2,
        });

        useGameStore.getState().markAnswer(true);

        const count = useGameStore.getState().completedCategories[0].filter(c => c === 'blue').length;
        expect(count).toBe(1);
      });

      it('does not affect other players completedCategories', () => {
        mockPlayerStore([createMockPlayer(0), createMockPlayer(1)]);
        mockQuestionStore();
        useGameStore.setState({
          currentQuestion: createMockQuestion('blue'),
          currentPlayerIndex: 0,
          completedCategories: [[], ['pink']],
          isChampionshipMode: [false, false],
          questionNumber: 1,
        });

        useGameStore.getState().markAnswer(true);

        expect(useGameStore.getState().completedCategories[1]).toEqual(['pink']);
      });

      it('sets isChampionshipMode when answering the 6th category', () => {
        mockPlayerStore([createMockPlayer(0)]);
        mockQuestionStore();
        useGameStore.setState({
          currentQuestion: createMockQuestion('orange'),
          currentPlayerIndex: 0,
          completedCategories: [['blue', 'pink', 'yellow', 'purple', 'green']],
          isChampionshipMode: [false],
          questionNumber: 6,
          playerCategories: [ALL_CATEGORIES],
          playerPackIds: [null],
        });

        useGameStore.getState().markAnswer(true);

        const state = useGameStore.getState();
        expect(state.isChampionshipMode[0]).toBe(true);
        expect(state.completedCategories[0]).toHaveLength(6);
        expect(state.phase).toBe('selecting');
      });

      it('does not set isChampionshipMode for other players', () => {
        mockPlayerStore([createMockPlayer(0), createMockPlayer(1)]);
        mockQuestionStore();
        useGameStore.setState({
          currentQuestion: createMockQuestion('orange'),
          currentPlayerIndex: 0,
          completedCategories: [['blue', 'pink', 'yellow', 'purple', 'green'], ['blue']],
          isChampionshipMode: [false, false],
          questionNumber: 6,
        });

        useGameStore.getState().markAnswer(true);

        expect(useGameStore.getState().isChampionshipMode[1]).toBe(false);
      });
    });

    describe('correct answer — championship mode', () => {
      it('sets phase to finished and records winner', () => {
        const player0 = createMockPlayer(0);
        mockPlayerStore([player0, createMockPlayer(1)]);
        mockQuestionStore();
        useGameStore.setState({
          currentQuestion: createMockQuestion('purple'),
          currentPlayerIndex: 0,
          completedCategories: [ALL_CATEGORIES, []],
          isChampionshipMode: [true, false],
          questionNumber: 8,
        });

        useGameStore.getState().markAnswer(true);

        const state = useGameStore.getState();
        expect(state.phase).toBe('finished');
        expect(state.winner).toEqual(player0);
      });

      it('clears activePackId on win', () => {
        mockPlayerStore([createMockPlayer(0)]);
        mockQuestionStore();
        useGameStore.setState({
          currentQuestion: createMockQuestion('blue'),
          currentPlayerIndex: 0,
          completedCategories: [ALL_CATEGORIES],
          isChampionshipMode: [true],
          questionNumber: 8,
          activePackId: 'some-pack',
        });

        useGameStore.getState().markAnswer(true);

        expect(useGameStore.getState().activePackId).toBeNull();
      });

      it('does not win when player is not in championship mode', () => {
        mockPlayerStore([createMockPlayer(0)]);
        mockQuestionStore();
        useGameStore.setState({
          currentQuestion: createMockQuestion('blue'),
          currentPlayerIndex: 0,
          completedCategories: [['blue', 'pink']],
          isChampionshipMode: [false],
          questionNumber: 3,
        });

        useGameStore.getState().markAnswer(true);

        const state = useGameStore.getState();
        expect(state.phase).toBe('selecting');
        expect(state.winner).toBeNull();
      });
    });

    describe('incorrect answer', () => {
      it('advances to the next player', () => {
        mockPlayerStore([createMockPlayer(0), createMockPlayer(1), createMockPlayer(2)]);
        mockQuestionStore();
        useGameStore.setState({
          currentQuestion: createMockQuestion('blue'),
          currentPlayerIndex: 0,
          completedCategories: [[], [], []],
          isChampionshipMode: [false, false, false],
          questionNumber: 1,
        });

        useGameStore.getState().markAnswer(false);

        const state = useGameStore.getState();
        expect(state.currentPlayerIndex).toBe(1);
        expect(state.phase).toBe('selecting');
      });

      it('wraps around from last player to first', () => {
        mockPlayerStore([createMockPlayer(0), createMockPlayer(1), createMockPlayer(2)]);
        mockQuestionStore();
        useGameStore.setState({
          currentQuestion: createMockQuestion('blue'),
          currentPlayerIndex: 2,
          completedCategories: [[], [], []],
          isChampionshipMode: [false, false, false],
          questionNumber: 5,
        });

        useGameStore.getState().markAnswer(false);

        expect(useGameStore.getState().currentPlayerIndex).toBe(0);
      });

      it('does not add category to completedCategories', () => {
        mockPlayerStore([createMockPlayer(0), createMockPlayer(1)]);
        mockQuestionStore();
        useGameStore.setState({
          currentQuestion: createMockQuestion('blue'),
          currentPlayerIndex: 0,
          completedCategories: [[], []],
          isChampionshipMode: [false, false],
          questionNumber: 1,
        });

        useGameStore.getState().markAnswer(false);

        expect(useGameStore.getState().completedCategories[0]).toEqual([]);
      });

      it('clears currentQuestion, currentCategory, and answerRevealed', () => {
        mockPlayerStore([createMockPlayer(0), createMockPlayer(1)]);
        mockQuestionStore();
        useGameStore.setState({
          currentQuestion: createMockQuestion('pink'),
          currentCategory: 'pink',
          answerRevealed: true,
          currentPlayerIndex: 0,
          completedCategories: [[], []],
          isChampionshipMode: [false, false],
          questionNumber: 2,
        });

        useGameStore.getState().markAnswer(false);

        const state = useGameStore.getState();
        expect(state.currentQuestion).toBeNull();
        expect(state.currentCategory).toBeNull();
        expect(state.answerRevealed).toBe(false);
      });

      it('does not trigger a win in championship mode on wrong answer', () => {
        mockPlayerStore([createMockPlayer(0), createMockPlayer(1)]);
        mockQuestionStore();
        useGameStore.setState({
          currentQuestion: createMockQuestion('blue'),
          currentPlayerIndex: 0,
          completedCategories: [ALL_CATEGORIES, []],
          isChampionshipMode: [true, false],
          questionNumber: 8,
        });

        useGameStore.getState().markAnswer(false);

        const state = useGameStore.getState();
        expect(state.phase).toBe('selecting');
        expect(state.winner).toBeNull();
        expect(state.currentPlayerIndex).toBe(1);
      });

      it('increments questionNumber', () => {
        mockPlayerStore([createMockPlayer(0), createMockPlayer(1)]);
        mockQuestionStore();
        useGameStore.setState({
          currentQuestion: createMockQuestion('blue'),
          currentPlayerIndex: 0,
          completedCategories: [[], []],
          isChampionshipMode: [false, false],
          questionNumber: 3,
        });

        useGameStore.getState().markAnswer(false);

        expect(useGameStore.getState().questionNumber).toBe(4);
      });
    });
  });

  // ─────────────────────────────────────────────────────────
  describe('nextTurn', () => {
    it('advances to next player', () => {
      mockPlayerStore([createMockPlayer(0), createMockPlayer(1), createMockPlayer(2)]);
      useGameStore.setState({ currentPlayerIndex: 0 });

      useGameStore.getState().nextTurn();

      expect(useGameStore.getState().currentPlayerIndex).toBe(1);
    });

    it('wraps around from last player to first', () => {
      mockPlayerStore([createMockPlayer(0), createMockPlayer(1), createMockPlayer(2)]);
      useGameStore.setState({ currentPlayerIndex: 2 });

      useGameStore.getState().nextTurn();

      expect(useGameStore.getState().currentPlayerIndex).toBe(0);
    });

    it('sets phase to selecting', () => {
      mockPlayerStore([createMockPlayer(0), createMockPlayer(1)]);
      useGameStore.setState({ phase: 'answering', currentPlayerIndex: 0 });

      useGameStore.getState().nextTurn();

      expect(useGameStore.getState().phase).toBe('selecting');
    });

    it('clears currentQuestion, currentCategory, and answerRevealed', () => {
      mockPlayerStore([createMockPlayer(0), createMockPlayer(1)]);
      useGameStore.setState({
        currentQuestion: createMockQuestion('blue'),
        currentCategory: 'blue',
        answerRevealed: true,
        currentPlayerIndex: 0,
      });

      useGameStore.getState().nextTurn();

      const state = useGameStore.getState();
      expect(state.currentQuestion).toBeNull();
      expect(state.currentCategory).toBeNull();
      expect(state.answerRevealed).toBe(false);
    });

    it('handles empty players without throwing', () => {
      mockPlayerStore([]);
      const phaseBefore = useGameStore.getState().phase;

      expect(() => useGameStore.getState().nextTurn()).not.toThrow();
      expect(useGameStore.getState().phase).toBe(phaseBefore);
    });
  });

  // ─────────────────────────────────────────────────────────
  describe('transitionTo', () => {
    it('transitions to a valid next phase', () => {
      useGameStore.setState({ phase: 'setup' });
      useGameStore.getState().transitionTo('selecting');
      expect(useGameStore.getState().phase).toBe('selecting');
    });

    it('rejects an invalid transition and logs an error', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      useGameStore.setState({ phase: 'setup' });

      useGameStore.getState().transitionTo('answering'); // setup → answering is invalid

      expect(consoleSpy).toHaveBeenCalled();
      expect(useGameStore.getState().phase).toBe('setup');
      consoleSpy.mockRestore();
    });

    it('rejects any transition from finished', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      useGameStore.setState({ phase: 'finished' });

      useGameStore.getState().transitionTo('setup');

      expect(consoleSpy).toHaveBeenCalled();
      expect(useGameStore.getState().phase).toBe('finished');
      consoleSpy.mockRestore();
    });
  });

  // ─────────────────────────────────────────────────────────
  describe('VALID_TRANSITIONS', () => {
    it('allows setup → selecting', () => {
      expect(VALID_TRANSITIONS['setup']).toContain('selecting');
    });

    it('allows selecting → answering', () => {
      expect(VALID_TRANSITIONS['selecting']).toContain('answering');
    });

    it('allows answering → selecting (player continues or turn passes)', () => {
      expect(VALID_TRANSITIONS['answering']).toContain('selecting');
    });

    it('allows answering → finished (championship win)', () => {
      expect(VALID_TRANSITIONS['answering']).toContain('finished');
    });

    it('has no outgoing transitions from finished', () => {
      expect(VALID_TRANSITIONS['finished']).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────
  describe('resetGame', () => {
    it('resets all state to initial values', () => {
      const player = createMockPlayer(0);
      useGameStore.setState({
        phase: 'answering',
        currentPlayerIndex: 2,
        questionNumber: 10,
        answerRevealed: true,
        currentQuestion: createMockQuestion('blue'),
        currentCategory: 'blue',
        completedCategories: [ALL_CATEGORIES],
        isChampionshipMode: [true],
        winner: player,
        activePackId: 'some-pack',
        playerPackIds: ['some-pack-id'],
        playerCategories: [ALL_CATEGORIES],
        playerDifficulties: [null],
      });

      useGameStore.getState().resetGame();

      const state = useGameStore.getState();
      expect(state.phase).toBe('setup');
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.questionNumber).toBe(1);
      expect(state.answerRevealed).toBe(false);
      expect(state.currentQuestion).toBeNull();
      expect(state.currentCategory).toBeNull();
      expect(state.completedCategories).toEqual([]);
      expect(state.isChampionshipMode).toEqual([]);
      expect(state.winner).toBeNull();
      expect(state.activePackId).toBeNull();
      expect(state.playerPackIds).toEqual([]);
      expect(state.playerCategories).toEqual([]);
      expect(state.playerDifficulties).toEqual([]);
    });
  });
});
