/**
 * Tests for gameStore
 * Tests game phase transitions, turn management, scoring, and win conditions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGameStore } from './gameStore';
import { GamePhase, VALID_TRANSITIONS } from '../types/game';
import { PlayerColor } from '../constants/categories';
import { Player } from '../types/player';

// Mock dependencies
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
      awardWedge: vi.fn(),
      resetWedges: vi.fn(),
      hasAllWedges: vi.fn(() => false),
    })),
  },
}));

vi.mock('./packStore', () => ({
  usePackStore: {
    getState: vi.fn(() => ({
      activePackId: 'test-pack-id',
    })),
  },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
  },
}));

// Import mocked modules to get references
import { useQuestionStore } from './questionStore';
import { usePlayerStore } from './playerStore';
import { usePackStore } from './packStore';

// Helper to create mock question
function createMockQuestion(category: PlayerColor = 'blue') {
  return {
    id: `question-${Date.now()}`,
    category,
    questionText: 'Test question?',
    answerText: 'Test answer',
    difficulty: 'medium' as const,
  };
}

// Helper to create mock player
function createMockPlayer(index: number, wedges: PlayerColor[] = []): Player {
  const colors: PlayerColor[] = ['blue', 'pink', 'yellow', 'purple', 'green', 'orange'];
  return {
    id: `player-${index}`,
    name: `Player ${index + 1}`,
    color: colors[index] || 'blue',
    wedges,
  };
}

describe('useGameStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset store to initial state
    useGameStore.setState({
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
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = useGameStore.getState();

      expect(state.phase).toBe('setup');
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.questionNumber).toBe(1);
      expect(state.answerRevealed).toBe(false);
      expect(state.currentQuestion).toBeNull();
      expect(state.currentCategory).toBeNull();
      expect(state.dieResult).toBeNull();
      expect(state.isCenterQuestion).toBe(false);
      expect(state.winner).toBeNull();
      expect(state.activePackId).toBeNull();
    });

    it('has all required action methods', () => {
      const state = useGameStore.getState();

      expect(typeof state.startGame).toBe('function');
      expect(typeof state.nextTurn).toBe('function');
      expect(typeof state.revealAnswer).toBe('function');
      expect(typeof state.markAnswer).toBe('function');
      expect(typeof state.transitionTo).toBe('function');
      expect(typeof state.selectCategory).toBe('function');
      expect(typeof state.rollDie).toBe('function');
      expect(typeof state.startCenterQuestion).toBe('function');
    });
  });

  describe('startGame', () => {
    it('transitions to rolling phase when active pack exists', async () => {
      const mockQuestion = createMockQuestion('blue');
      vi.mocked(useQuestionStore.getState).mockReturnValue({
        selectQuestion: vi.fn().mockResolvedValue(mockQuestion),
        markAsked: vi.fn(),
        resetAskedQuestions: vi.fn().mockResolvedValue(undefined),
      } as any);

      vi.mocked(usePackStore.getState).mockReturnValue({
        activePackId: 'test-pack-id',
      } as any);

      vi.mocked(usePlayerStore.getState).mockReturnValue({
        players: [createMockPlayer(0)],
        awardWedge: vi.fn(),
        resetWedges: vi.fn(),
        hasAllWedges: vi.fn(() => false),
      } as any);

      await useGameStore.getState().startGame();

      const state = useGameStore.getState();
      expect(state.phase).toBe('rolling');
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.questionNumber).toBe(1);
      expect(state.answerRevealed).toBe(false);
      expect(state.dieResult).toBeNull();
      expect(state.isCenterQuestion).toBe(false);
      expect(state.winner).toBeNull();
      expect(state.activePackId).toBe('test-pack-id');
    });

    it('resets asked questions via questionStore', async () => {
      const resetAskedQuestions = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useQuestionStore.getState).mockReturnValue({
        selectQuestion: vi.fn().mockResolvedValue(createMockQuestion()),
        markAsked: vi.fn(),
        resetAskedQuestions,
      } as any);

      vi.mocked(usePackStore.getState).mockReturnValue({
        activePackId: 'test-pack-id',
      } as any);

      vi.mocked(usePlayerStore.getState).mockReturnValue({
        players: [createMockPlayer(0)],
        awardWedge: vi.fn(),
        resetWedges: vi.fn(),
        hasAllWedges: vi.fn(() => false),
      } as any);

      await useGameStore.getState().startGame();

      expect(resetAskedQuestions).toHaveBeenCalled();
    });

    it('resets wedges for all players', async () => {
      const resetWedges = vi.fn();
      vi.mocked(usePlayerStore.getState).mockReturnValue({
        players: [createMockPlayer(0)],
        awardWedge: vi.fn(),
        resetWedges,
        hasAllWedges: vi.fn(() => false),
      } as any);

      vi.mocked(useQuestionStore.getState).mockReturnValue({
        selectQuestion: vi.fn().mockResolvedValue(createMockQuestion()),
        markAsked: vi.fn(),
        resetAskedQuestions: vi.fn().mockResolvedValue(undefined),
      } as any);

      vi.mocked(usePackStore.getState).mockReturnValue({
        activePackId: 'test-pack-id',
      } as any);

      await useGameStore.getState().startGame();

      expect(resetWedges).toHaveBeenCalled();
    });

    it('does not start game without active pack', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(usePackStore.getState).mockReturnValue({
        activePackId: null,
      } as any);

      await useGameStore.getState().startGame();

      expect(consoleSpy).toHaveBeenCalledWith('No active pack selected');
      expect(useGameStore.getState().phase).toBe('setup');

      consoleSpy.mockRestore();
    });

    it('sets current question from selectQuestion result', async () => {
      const mockQuestion = createMockQuestion('pink');
      vi.mocked(useQuestionStore.getState).mockReturnValue({
        selectQuestion: vi.fn().mockResolvedValue(mockQuestion),
        markAsked: vi.fn(),
        resetAskedQuestions: vi.fn().mockResolvedValue(undefined),
      } as any);

      vi.mocked(usePackStore.getState).mockReturnValue({
        activePackId: 'test-pack-id',
      } as any);

      vi.mocked(usePlayerStore.getState).mockReturnValue({
        players: [createMockPlayer(0)],
        awardWedge: vi.fn(),
        resetWedges: vi.fn(),
        hasAllWedges: vi.fn(() => false),
      } as any);

      await useGameStore.getState().startGame();

      const state = useGameStore.getState();
      expect(state.currentQuestion).toEqual(mockQuestion);
      expect(state.currentCategory).toBe('pink');
    });
  });

  describe('rollDie', () => {
    it('returns a number between 1 and 6', () => {
      const store = useGameStore.getState();

      // Test multiple rolls
      for (let i = 0; i < 100; i++) {
        const result = store.rollDie();
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(6);
        expect(Number.isInteger(result)).toBe(true);
      }
    });

    it('updates dieResult in state', () => {
      const store = useGameStore.getState();

      expect(useGameStore.getState().dieResult).toBeNull();

      const result = store.rollDie();

      expect(useGameStore.getState().dieResult).toBe(result);
    });
  });

  describe('nextTurn', () => {
    it('cycles to next player index', async () => {
      const players = [createMockPlayer(0), createMockPlayer(1), createMockPlayer(2)];
      const mockQuestion = createMockQuestion('blue');

      vi.mocked(usePlayerStore.getState).mockReturnValue({
        players,
        awardWedge: vi.fn(),
        resetWedges: vi.fn(),
        hasAllWedges: vi.fn(() => false),
      } as any);

      vi.mocked(useQuestionStore.getState).mockReturnValue({
        selectQuestion: vi.fn().mockResolvedValue(mockQuestion),
        markAsked: vi.fn(),
        resetAskedQuestions: vi.fn().mockResolvedValue(undefined),
      } as any);

      // Set initial state
      useGameStore.setState({ currentPlayerIndex: 0 });

      await useGameStore.getState().nextTurn();

      expect(useGameStore.getState().currentPlayerIndex).toBe(1);
    });

    it('wraps around to first player after last player', async () => {
      const players = [createMockPlayer(0), createMockPlayer(1), createMockPlayer(2)];
      const mockQuestion = createMockQuestion('blue');

      vi.mocked(usePlayerStore.getState).mockReturnValue({
        players,
        awardWedge: vi.fn(),
        resetWedges: vi.fn(),
        hasAllWedges: vi.fn(() => false),
      } as any);

      vi.mocked(useQuestionStore.getState).mockReturnValue({
        selectQuestion: vi.fn().mockResolvedValue(mockQuestion),
        markAsked: vi.fn(),
        resetAskedQuestions: vi.fn().mockResolvedValue(undefined),
      } as any);

      // Start at last player
      useGameStore.setState({ currentPlayerIndex: 2 });

      await useGameStore.getState().nextTurn();

      expect(useGameStore.getState().currentPlayerIndex).toBe(0);
    });

    it('increments question number', async () => {
      const players = [createMockPlayer(0), createMockPlayer(1)];
      const mockQuestion = createMockQuestion('blue');

      vi.mocked(usePlayerStore.getState).mockReturnValue({
        players,
        awardWedge: vi.fn(),
        resetWedges: vi.fn(),
        hasAllWedges: vi.fn(() => false),
      } as any);

      vi.mocked(useQuestionStore.getState).mockReturnValue({
        selectQuestion: vi.fn().mockResolvedValue(mockQuestion),
        markAsked: vi.fn(),
        resetAskedQuestions: vi.fn().mockResolvedValue(undefined),
      } as any);

      useGameStore.setState({ questionNumber: 5 });

      await useGameStore.getState().nextTurn();

      expect(useGameStore.getState().questionNumber).toBe(6);
    });

    it('resets dieResult and answerRevealed', async () => {
      const players = [createMockPlayer(0), createMockPlayer(1)];
      const mockQuestion = createMockQuestion('blue');

      vi.mocked(usePlayerStore.getState).mockReturnValue({
        players,
        awardWedge: vi.fn(),
        resetWedges: vi.fn(),
        hasAllWedges: vi.fn(() => false),
      } as any);

      vi.mocked(useQuestionStore.getState).mockReturnValue({
        selectQuestion: vi.fn().mockResolvedValue(mockQuestion),
        markAsked: vi.fn(),
        resetAskedQuestions: vi.fn().mockResolvedValue(undefined),
      } as any);

      useGameStore.setState({
        dieResult: 5,
        answerRevealed: true,
      });

      await useGameStore.getState().nextTurn();

      expect(useGameStore.getState().dieResult).toBeNull();
      expect(useGameStore.getState().answerRevealed).toBe(false);
    });

    it('sets phase to rolling', async () => {
      const players = [createMockPlayer(0), createMockPlayer(1)];
      const mockQuestion = createMockQuestion('blue');

      vi.mocked(usePlayerStore.getState).mockReturnValue({
        players,
        awardWedge: vi.fn(),
        resetWedges: vi.fn(),
        hasAllWedges: vi.fn(() => false),
      } as any);

      vi.mocked(useQuestionStore.getState).mockReturnValue({
        selectQuestion: vi.fn().mockResolvedValue(mockQuestion),
        markAsked: vi.fn(),
        resetAskedQuestions: vi.fn().mockResolvedValue(undefined),
      } as any);

      useGameStore.setState({ phase: 'scoring' });

      await useGameStore.getState().nextTurn();

      expect(useGameStore.getState().phase).toBe('rolling');
    });

    it('resets isCenterQuestion flag', async () => {
      const players = [createMockPlayer(0), createMockPlayer(1)];
      const mockQuestion = createMockQuestion('blue');

      vi.mocked(usePlayerStore.getState).mockReturnValue({
        players,
        awardWedge: vi.fn(),
        resetWedges: vi.fn(),
        hasAllWedges: vi.fn(() => false),
      } as any);

      vi.mocked(useQuestionStore.getState).mockReturnValue({
        selectQuestion: vi.fn().mockResolvedValue(mockQuestion),
        markAsked: vi.fn(),
        resetAskedQuestions: vi.fn().mockResolvedValue(undefined),
      } as any);

      useGameStore.setState({ isCenterQuestion: true });

      await useGameStore.getState().nextTurn();

      expect(useGameStore.getState().isCenterQuestion).toBe(false);
    });

    it('handles empty players array gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(usePlayerStore.getState).mockReturnValue({
        players: [],
        awardWedge: vi.fn(),
        resetWedges: vi.fn(),
        hasAllWedges: vi.fn(() => false),
      } as any);

      await useGameStore.getState().nextTurn();

      expect(consoleSpy).toHaveBeenCalledWith('nextTurn called with no players');
      expect(useGameStore.getState().phase).toBe('setup');

      consoleSpy.mockRestore();
    });

    it('uses current category or defaults to blue', async () => {
      const players = [createMockPlayer(0), createMockPlayer(1)];
      const mockQuestion = createMockQuestion('pink');

      const selectQuestion = vi.fn().mockResolvedValue(mockQuestion);

      vi.mocked(usePlayerStore.getState).mockReturnValue({
        players,
        awardWedge: vi.fn(),
        resetWedges: vi.fn(),
        hasAllWedges: vi.fn(() => false),
      } as any);

      vi.mocked(useQuestionStore.getState).mockReturnValue({
        selectQuestion,
        markAsked: vi.fn(),
        resetAskedQuestions: vi.fn().mockResolvedValue(undefined),
      } as any);

      // No current category set
      useGameStore.setState({ currentCategory: null });

      await useGameStore.getState().nextTurn();

      // Should default to 'blue'
      expect(selectQuestion).toHaveBeenCalledWith('blue');

      // Now with a category set
      selectQuestion.mockClear();
      useGameStore.setState({ currentCategory: 'pink' });

      await useGameStore.getState().nextTurn();

      expect(selectQuestion).toHaveBeenCalledWith('pink');
    });
  });

  describe('revealAnswer', () => {
    it('sets answerRevealed to true', () => {
      useGameStore.setState({ answerRevealed: false });

      useGameStore.getState().revealAnswer();

      expect(useGameStore.getState().answerRevealed).toBe(true);
    });

    it('does not toggle (idempotent)', () => {
      useGameStore.setState({ answerRevealed: true });

      useGameStore.getState().revealAnswer();

      expect(useGameStore.getState().answerRevealed).toBe(true);
    });
  });

  describe('markAnswer', () => {
    it('marks question as asked', () => {
      const mockQuestion = createMockQuestion('blue');
      const players = [createMockPlayer(0)];

      const markAsked = vi.fn();

      vi.mocked(usePlayerStore.getState).mockReturnValue({
        players,
        awardWedge: vi.fn(),
        resetWedges: vi.fn(),
        hasAllWedges: vi.fn(() => false),
      } as any);

      vi.mocked(useQuestionStore.getState).mockReturnValue({
        selectQuestion: vi.fn(),
        markAsked,
        resetAskedQuestions: vi.fn().mockResolvedValue(undefined),
      } as any);

      useGameStore.setState({
        currentQuestion: mockQuestion,
        currentPlayerIndex: 0,
        isCenterQuestion: false,
      });

      useGameStore.getState().markAnswer(false);

      expect(markAsked).toHaveBeenCalledWith(mockQuestion.id);
    });

    it('awards wedge on correct answer (not center question)', () => {
      const mockQuestion = createMockQuestion('blue');
      const players = [createMockPlayer(0)];

      const awardWedge = vi.fn();

      vi.mocked(usePlayerStore.getState).mockReturnValue({
        players,
        awardWedge,
        resetWedges: vi.fn(),
        hasAllWedges: vi.fn(() => false),
      } as any);

      vi.mocked(useQuestionStore.getState).mockReturnValue({
        selectQuestion: vi.fn(),
        markAsked: vi.fn(),
        resetAskedQuestions: vi.fn().mockResolvedValue(undefined),
      } as any);

      useGameStore.setState({
        currentQuestion: mockQuestion,
        currentPlayerIndex: 0,
        isCenterQuestion: false,
      });

      useGameStore.getState().markAnswer(true);

      expect(awardWedge).toHaveBeenCalledWith(players[0].id, 'blue');
    });

    it('does not award wedge on incorrect answer', () => {
      const mockQuestion = createMockQuestion('blue');
      const players = [createMockPlayer(0)];

      const awardWedge = vi.fn();

      vi.mocked(usePlayerStore.getState).mockReturnValue({
        players,
        awardWedge,
        resetWedges: vi.fn(),
        hasAllWedges: vi.fn(() => false),
      } as any);

      vi.mocked(useQuestionStore.getState).mockReturnValue({
        selectQuestion: vi.fn(),
        markAsked: vi.fn(),
        resetAskedQuestions: vi.fn().mockResolvedValue(undefined),
      } as any);

      useGameStore.setState({
        currentQuestion: mockQuestion,
        currentPlayerIndex: 0,
        isCenterQuestion: false,
      });

      useGameStore.getState().markAnswer(false);

      expect(awardWedge).not.toHaveBeenCalled();
    });

    it('does not award wedge on center question even if correct', () => {
      const mockQuestion = createMockQuestion('blue');
      const players = [createMockPlayer(0)];

      const awardWedge = vi.fn();

      vi.mocked(usePlayerStore.getState).mockReturnValue({
        players,
        awardWedge,
        resetWedges: vi.fn(),
        hasAllWedges: vi.fn(() => false),
      } as any);

      vi.mocked(useQuestionStore.getState).mockReturnValue({
        selectQuestion: vi.fn(),
        markAsked: vi.fn(),
        resetAskedQuestions: vi.fn().mockResolvedValue(undefined),
      } as any);

      useGameStore.setState({
        currentQuestion: mockQuestion,
        currentPlayerIndex: 0,
        isCenterQuestion: true,
      });

      useGameStore.getState().markAnswer(true);

      // Center questions don't award wedges
      expect(awardWedge).not.toHaveBeenCalled();
    });

    it('triggers nextTurn after delay', async () => {
      const mockQuestion = createMockQuestion('blue');
      const players = [createMockPlayer(0), createMockPlayer(1)];

      vi.mocked(usePlayerStore.getState).mockReturnValue({
        players,
        awardWedge: vi.fn(),
        resetWedges: vi.fn(),
        hasAllWedges: vi.fn(() => false),
      } as any);

      vi.mocked(useQuestionStore.getState).mockReturnValue({
        selectQuestion: vi.fn().mockResolvedValue(createMockQuestion()),
        markAsked: vi.fn(),
        resetAskedQuestions: vi.fn().mockResolvedValue(undefined),
      } as any);

      useGameStore.setState({
        currentQuestion: mockQuestion,
        currentPlayerIndex: 0,
        isCenterQuestion: false,
        phase: 'scoring',
      });

      useGameStore.getState().markAnswer(false);

      // Before timeout
      expect(useGameStore.getState().currentPlayerIndex).toBe(0);

      // Advance timers by 500ms
      vi.advanceTimersByTime(500);
      await Promise.resolve();

      expect(useGameStore.getState().currentPlayerIndex).toBe(1);
    });

    it('handles empty players array gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(usePlayerStore.getState).mockReturnValue({
        players: [],
        awardWedge: vi.fn(),
        resetWedges: vi.fn(),
        hasAllWedges: vi.fn(() => false),
      } as any);

      useGameStore.getState().markAnswer(true);

      expect(consoleSpy).toHaveBeenCalledWith('markAnswer called with no players');

      consoleSpy.mockRestore();
    });
  });

  describe('win condition (center question)', () => {
    it('sets winner and finished phase on correct center question with all wedges', () => {
      const mockQuestion = createMockQuestion('blue');
      const allWedges: PlayerColor[] = ['blue', 'pink', 'yellow', 'purple', 'green', 'orange'];
      const players = [createMockPlayer(0, allWedges)];

      vi.mocked(usePlayerStore.getState).mockReturnValue({
        players,
        awardWedge: vi.fn(),
        resetWedges: vi.fn(),
        hasAllWedges: vi.fn(() => true),
      } as any);

      vi.mocked(useQuestionStore.getState).mockReturnValue({
        selectQuestion: vi.fn(),
        markAsked: vi.fn(),
        resetAskedQuestions: vi.fn().mockResolvedValue(undefined),
      } as any);

      useGameStore.setState({
        currentQuestion: mockQuestion,
        currentPlayerIndex: 0,
        isCenterQuestion: true,
        phase: 'answering',
      });

      useGameStore.getState().markAnswer(true);

      const state = useGameStore.getState();
      expect(state.phase).toBe('finished');
      expect(state.winner).toEqual(players[0]);
      expect(state.activePackId).toBeNull();
    });

    it('continues game on correct center question without all wedges', async () => {
      const mockQuestion = createMockQuestion('blue');
      const players = [createMockPlayer(0, ['blue', 'pink'])]; // Only 2 wedges

      vi.mocked(usePlayerStore.getState).mockReturnValue({
        players,
        awardWedge: vi.fn(),
        resetWedges: vi.fn(),
        hasAllWedges: vi.fn(() => false),
      } as any);

      vi.mocked(useQuestionStore.getState).mockReturnValue({
        selectQuestion: vi.fn().mockResolvedValue(createMockQuestion()),
        markAsked: vi.fn(),
        resetAskedQuestions: vi.fn().mockResolvedValue(undefined),
      } as any);

      useGameStore.setState({
        currentQuestion: mockQuestion,
        currentPlayerIndex: 0,
        isCenterQuestion: true,
        phase: 'answering',
      });

      useGameStore.getState().markAnswer(true);

      // Should not be finished
      expect(useGameStore.getState().phase).not.toBe('finished');
      expect(useGameStore.getState().winner).toBeNull();

      // After timeout, should advance to next turn
      vi.advanceTimersByTime(500);
      await Promise.resolve();

      expect(useGameStore.getState().phase).toBe('rolling');
    });

    it('continues game on incorrect center question', async () => {
      const mockQuestion = createMockQuestion('blue');
      const allWedges: PlayerColor[] = ['blue', 'pink', 'yellow', 'purple', 'green', 'orange'];
      const players = [createMockPlayer(0, allWedges)];

      vi.mocked(usePlayerStore.getState).mockReturnValue({
        players,
        awardWedge: vi.fn(),
        resetWedges: vi.fn(),
        hasAllWedges: vi.fn(() => true),
      } as any);

      vi.mocked(useQuestionStore.getState).mockReturnValue({
        selectQuestion: vi.fn().mockResolvedValue(createMockQuestion()),
        markAsked: vi.fn(),
        resetAskedQuestions: vi.fn().mockResolvedValue(undefined),
      } as any);

      useGameStore.setState({
        currentQuestion: mockQuestion,
        currentPlayerIndex: 0,
        isCenterQuestion: true,
        phase: 'answering',
      });

      useGameStore.getState().markAnswer(false);

      // Should not be finished
      expect(useGameStore.getState().phase).not.toBe('finished');
      expect(useGameStore.getState().winner).toBeNull();
    });
  });

  describe('transitionTo', () => {
    it('transitions to valid next phase', () => {
      useGameStore.setState({ phase: 'setup' });

      useGameStore.getState().transitionTo('rolling');

      expect(useGameStore.getState().phase).toBe('rolling');
    });

    it('rejects invalid transition', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      useGameStore.setState({ phase: 'setup' });

      // setup -> answering is invalid
      useGameStore.getState().transitionTo('answering');

      expect(consoleSpy).toHaveBeenCalled();
      expect(useGameStore.getState().phase).toBe('setup'); // Unchanged

      consoleSpy.mockRestore();
    });

    it('rejects transition from finished phase (no outgoing transitions)', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      useGameStore.setState({ phase: 'finished' });

      useGameStore.getState().transitionTo('setup');

      expect(consoleSpy).toHaveBeenCalled();
      expect(useGameStore.getState().phase).toBe('finished'); // Unchanged

      consoleSpy.mockRestore();
    });
  });

  describe('VALID_TRANSITIONS', () => {
    it('allows setup -> rolling', () => {
      expect(VALID_TRANSITIONS['setup']).toContain('rolling');
    });

    it('allows rolling -> moving', () => {
      expect(VALID_TRANSITIONS['rolling']).toContain('moving');
    });

    it('allows moving -> answering', () => {
      expect(VALID_TRANSITIONS['moving']).toContain('answering');
    });

    it('allows answering -> scoring', () => {
      expect(VALID_TRANSITIONS['answering']).toContain('scoring');
    });

    it('allows scoring -> rolling (continue game)', () => {
      expect(VALID_TRANSITIONS['scoring']).toContain('rolling');
    });

    it('allows scoring -> finished (win condition)', () => {
      expect(VALID_TRANSITIONS['scoring']).toContain('finished');
    });

    it('has no transitions from finished', () => {
      expect(VALID_TRANSITIONS['finished']).toEqual([]);
    });
  });

  describe('selectCategory', () => {
    it('selects question for given category', async () => {
      const mockQuestion = createMockQuestion('pink');

      const selectQuestion = vi.fn().mockResolvedValue(mockQuestion);

      vi.mocked(useQuestionStore.getState).mockReturnValue({
        selectQuestion,
        markAsked: vi.fn(),
        resetAskedQuestions: vi.fn().mockResolvedValue(undefined),
      } as any);

      await useGameStore.getState().selectCategory('pink');

      expect(selectQuestion).toHaveBeenCalledWith('pink');
      expect(useGameStore.getState().currentCategory).toBe('pink');
      expect(useGameStore.getState().currentQuestion).toEqual(mockQuestion);
    });

    it('handles null question result', async () => {
      vi.mocked(useQuestionStore.getState).mockReturnValue({
        selectQuestion: vi.fn().mockResolvedValue(null),
        markAsked: vi.fn(),
        resetAskedQuestions: vi.fn().mockResolvedValue(undefined),
      } as any);

      await useGameStore.getState().selectCategory('green');

      expect(useGameStore.getState().currentCategory).toBe('green');
      expect(useGameStore.getState().currentQuestion).toBeNull();
    });
  });

  describe('startCenterQuestion', () => {
    it('sets isCenterQuestion to true', async () => {
      const mockQuestion = createMockQuestion('blue');

      vi.mocked(useQuestionStore.getState).mockReturnValue({
        selectQuestion: vi.fn().mockResolvedValue(mockQuestion),
        markAsked: vi.fn(),
        resetAskedQuestions: vi.fn().mockResolvedValue(undefined),
      } as any);

      await useGameStore.getState().startCenterQuestion();

      expect(useGameStore.getState().isCenterQuestion).toBe(true);
    });

    it('sets phase to answering', async () => {
      const mockQuestion = createMockQuestion('blue');

      vi.mocked(useQuestionStore.getState).mockReturnValue({
        selectQuestion: vi.fn().mockResolvedValue(mockQuestion),
        markAsked: vi.fn(),
        resetAskedQuestions: vi.fn().mockResolvedValue(undefined),
      } as any);

      await useGameStore.getState().startCenterQuestion();

      expect(useGameStore.getState().phase).toBe('answering');
    });

    it('selects question from a valid category', async () => {
      const mockQuestion = createMockQuestion('purple');
      const selectQuestion = vi.fn().mockResolvedValue(mockQuestion);

      vi.mocked(useQuestionStore.getState).mockReturnValue({
        selectQuestion,
        markAsked: vi.fn(),
        resetAskedQuestions: vi.fn().mockResolvedValue(undefined),
      } as any);

      await useGameStore.getState().startCenterQuestion();

      // Should be called with one of the valid categories
      const validCategories: PlayerColor[] = ['blue', 'pink', 'yellow', 'purple', 'green', 'orange'];
      expect(validCategories).toContain(selectQuestion.mock.calls[0][0]);
    });
  });

  describe('edge cases', () => {
    it('handles currentQuestion being null in markAnswer', () => {
      const players = [createMockPlayer(0)];
      const markAsked = vi.fn();

      vi.mocked(usePlayerStore.getState).mockReturnValue({
        players,
        awardWedge: vi.fn(),
        resetWedges: vi.fn(),
        hasAllWedges: vi.fn(() => false),
      } as any);

      vi.mocked(useQuestionStore.getState).mockReturnValue({
        selectQuestion: vi.fn(),
        markAsked,
        resetAskedQuestions: vi.fn().mockResolvedValue(undefined),
      } as any);

      useGameStore.setState({
        currentQuestion: null,
        currentPlayerIndex: 0,
        isCenterQuestion: false,
      });

      // Should not throw
      useGameStore.getState().markAnswer(true);

      // Should not try to mark a null question
      expect(markAsked).not.toHaveBeenCalled();
    });

    it('handles player not found in markAnswer', () => {
      const mockQuestion = createMockQuestion('blue');
      const awardWedge = vi.fn();

      // Empty players but valid playerIndex
      vi.mocked(usePlayerStore.getState).mockReturnValue({
        players: [],
        awardWedge: awardWedge,
        resetWedges: vi.fn(),
        hasAllWedges: vi.fn(() => false),
      } as any);

      vi.mocked(useQuestionStore.getState).mockReturnValue({
        selectQuestion: vi.fn(),
        markAsked: vi.fn(),
        resetAskedQuestions: vi.fn().mockResolvedValue(undefined),
      } as any);

      useGameStore.setState({
        currentQuestion: mockQuestion,
        currentPlayerIndex: 0,
        isCenterQuestion: false,
      });

      // Should handle gracefully (console.error called)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      useGameStore.getState().markAnswer(true);

      // Due to empty players, awardWedge should not be called for the player
      // (the player lookup returns undefined)
      expect(consoleSpy).toHaveBeenCalledWith('markAnswer called with no players');

      consoleSpy.mockRestore();
    });
  });
});