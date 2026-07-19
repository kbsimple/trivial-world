/**
 * Tests for questionStore — web/PWA-only path (Phase 24-03 rewrite).
 *
 * Tests question selection (via the IDB-backed questionProvider), asked-question
 * tracking (in-memory array persisted via platformStorage), and category
 * filtering. The WatermelonDB asked_at path was removed in 24-01; the web
 * branch is the sole implementation (24-02).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock packStore (questionStore reads activePackId / enabledDifficulties from it)
vi.mock('./packStore', () => ({
  usePackStore: {
    getState: vi.fn(() => ({
      activePackId: 'test-pack-uuid',
      enabledCategories: null,
      enabledDifficulties: null,
    })),
  },
}));

// Mock questionProvider — the IDB-first web path. The store delegates
// question selection to getNextQuestion; we control its return value.
vi.mock('../services/questionProvider', () => ({
  getNextQuestion: vi.fn(),
}));

import { useQuestionStore } from './questionStore';
import { usePackStore } from './packStore';
import { getNextQuestion } from '../services/questionProvider';
import type { Question } from '@trivial-world/types';

function createMockQuestion(id: string, category: string = 'blue'): Question {
  return {
    id,
    category: category as any,
    questionText: `Test question ${id}`,
    answerText: `Test answer ${id}`,
    difficulty: 'medium',
  };
}

describe('questionStore (web/PWA-only path)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getNextQuestion).mockResolvedValue(null);
    // Reset store state
    useQuestionStore.setState({
      currentQuestion: null,
      currentCategory: null,
      askedQuestionIds: [],
    });
    // Reset packStore mock to default
    vi.mocked(usePackStore.getState).mockReturnValue({
      activePackId: 'test-pack-uuid',
      enabledCategories: null,
      enabledDifficulties: null,
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('selectQuestion', () => {
    it('returns null and does not set currentQuestion when provider returns null', async () => {
      vi.mocked(getNextQuestion).mockResolvedValue(null);

      const result = await useQuestionStore.getState().selectQuestion('blue');

      expect(result).toBeNull();
      expect(useQuestionStore.getState().currentQuestion).toBeNull();
      expect(useQuestionStore.getState().currentCategory).toBeNull();
    });

    it('returns the question and sets currentQuestion/currentCategory when provider returns one', async () => {
      const q = createMockQuestion('q-1', 'blue');
      vi.mocked(getNextQuestion).mockResolvedValue(q);

      const result = await useQuestionStore.getState().selectQuestion('blue');

      expect(result).toBe(q);
      expect(useQuestionStore.getState().currentQuestion).toBe(q);
      expect(useQuestionStore.getState().currentCategory).toBe('blue');
    });

    it('forwards category, askedQuestionIds, packIds, and difficulty to getNextQuestion', async () => {
      const q = createMockQuestion('q-1', 'green');
      vi.mocked(getNextQuestion).mockResolvedValue(q);
      useQuestionStore.setState({ askedQuestionIds: ['q-prev'] });

      await useQuestionStore.getState().selectQuestion('green', ['pack-A'], 'hard');

      expect(getNextQuestion).toHaveBeenCalledWith(
        'green',
        ['q-prev'],
        ['pack-A'],
        'hard',
        null // enabledDifficulties from packStore mock
      );
    });

    it('resolves packIds from activePackId when none are passed explicitly', async () => {
      vi.mocked(getNextQuestion).mockResolvedValue(null);

      await useQuestionStore.getState().selectQuestion('blue');

      // packIds defaults to [activePackId] from packStore
      expect(getNextQuestion).toHaveBeenCalledWith('blue', [], ['test-pack-uuid'], undefined, null);
    });

    it('forwards enabledDifficulties from packStore when no per-call difficulty is given', async () => {
      vi.mocked(usePackStore.getState).mockReturnValue({
        activePackId: 'test-pack-uuid',
        enabledCategories: null,
        enabledDifficulties: ['hard'],
      } as any);
      vi.mocked(getNextQuestion).mockResolvedValue(null);

      await useQuestionStore.getState().selectQuestion('blue');

      expect(getNextQuestion).toHaveBeenCalledWith('blue', [], ['test-pack-uuid'], undefined, ['hard']);
    });

    it('handles all six categories', async () => {
      const categories = ['blue', 'pink', 'yellow', 'purple', 'green', 'orange'] as const;
      for (const category of categories) {
        const q = createMockQuestion(`q-${category}`, category);
        vi.mocked(getNextQuestion).mockResolvedValue(q);

        const result = await useQuestionStore.getState().selectQuestion(category);

        expect(result).not.toBeNull();
        expect(result?.category).toBe(category);
        expect(useQuestionStore.getState().currentCategory).toBe(category);
      }
    });

    it('returns null when no active pack is selected (provider gets undefined packIds)', async () => {
      vi.mocked(usePackStore.getState).mockReturnValue({
        activePackId: null,
        enabledCategories: null,
        enabledDifficulties: null,
      } as any);
      vi.mocked(getNextQuestion).mockResolvedValue(null);

      const result = await useQuestionStore.getState().selectQuestion('blue');

      expect(result).toBeNull();
      // packIds is undefined when activePackId is null
      expect(getNextQuestion).toHaveBeenCalledWith('blue', [], undefined, undefined, null);
    });
  });

  describe('markAsked (web path — in-memory askedQuestionIds array)', () => {
    it('appends the question id to askedQuestionIds and returns true', async () => {
      const result = await useQuestionStore.getState().markAsked('q-1');

      expect(result).toBe(true);
      expect(useQuestionStore.getState().askedQuestionIds).toEqual(['q-1']);
    });

    it('appends to an existing asked list', async () => {
      useQuestionStore.setState({ askedQuestionIds: ['q-prev'] });

      await useQuestionStore.getState().markAsked('q-new');

      expect(useQuestionStore.getState().askedQuestionIds).toEqual(['q-prev', 'q-new']);
    });

    it('is idempotent across multiple calls — appends each call', async () => {
      await useQuestionStore.getState().markAsked('q-1');
      await useQuestionStore.getState().markAsked('q-2');
      await useQuestionStore.getState().markAsked('q-3');

      expect(useQuestionStore.getState().askedQuestionIds).toEqual(['q-1', 'q-2', 'q-3']);
    });
  });

  describe('unmarkAsked', () => {
    it('removes the question id from askedQuestionIds', async () => {
      useQuestionStore.setState({ askedQuestionIds: ['q-1', 'q-2', 'q-3'] });

      await useQuestionStore.getState().unmarkAsked('q-2');

      expect(useQuestionStore.getState().askedQuestionIds).toEqual(['q-1', 'q-3']);
    });

    it('is a no-op when the id is not present', async () => {
      useQuestionStore.setState({ askedQuestionIds: ['q-1', 'q-2'] });

      await useQuestionStore.getState().unmarkAsked('not-present');

      expect(useQuestionStore.getState().askedQuestionIds).toEqual(['q-1', 'q-2']);
    });

    it('handles an empty askedQuestionIds array gracefully', async () => {
      useQuestionStore.setState({ askedQuestionIds: [] });

      await expect(useQuestionStore.getState().unmarkAsked('q-1')).resolves.not.toThrow();

      expect(useQuestionStore.getState().askedQuestionIds).toEqual([]);
    });
  });

  describe('resetAskedQuestions', () => {
    it('clears askedQuestionIds to an empty array', async () => {
      useQuestionStore.setState({ askedQuestionIds: ['q-1', 'q-2', 'q-3'] });

      await useQuestionStore.getState().resetAskedQuestions();

      expect(useQuestionStore.getState().askedQuestionIds).toEqual([]);
    });

    it('is safe to call when askedQuestionIds is already empty', async () => {
      useQuestionStore.setState({ askedQuestionIds: [] });

      await useQuestionStore.getState().resetAskedQuestions();

      expect(useQuestionStore.getState().askedQuestionIds).toEqual([]);
    });

    it('does not affect currentQuestion / currentCategory', async () => {
      const q = createMockQuestion('q-keep', 'blue');
      useQuestionStore.setState({
        currentQuestion: q,
        currentCategory: 'blue',
        askedQuestionIds: ['q-keep'],
      });

      await useQuestionStore.getState().resetAskedQuestions();

      expect(useQuestionStore.getState().currentQuestion).toBe(q);
      expect(useQuestionStore.getState().currentCategory).toBe('blue');
    });
  });

  describe('question exhaustion + recovery', () => {
    it('returns null when provider returns null (exhausted)', async () => {
      vi.mocked(getNextQuestion).mockResolvedValue(null);

      const result = await useQuestionStore.getState().selectQuestion('purple');

      expect(result).toBeNull();
    });

    it('allows selection again after resetAskedQuestions clears the asked list', async () => {
      // First call: exhausted (provider returns null)
      useQuestionStore.setState({ askedQuestionIds: ['q-used'] });
      vi.mocked(getNextQuestion).mockResolvedValue(null);

      let result = await useQuestionStore.getState().selectQuestion('green');
      expect(result).toBeNull();

      // Reset asked list
      await useQuestionStore.getState().resetAskedQuestions();
      expect(useQuestionStore.getState().askedQuestionIds).toEqual([]);

      // Second call: provider now returns a question
      const recovered = createMockQuestion('q-recovered', 'green');
      vi.mocked(getNextQuestion).mockResolvedValue(recovered);

      result = await useQuestionStore.getState().selectQuestion('green');
      expect(result).toBe(recovered);
      expect(useQuestionStore.getState().currentQuestion).toBe(recovered);
    });
  });

  describe('store persistence (web platformStorage / sessionStorage)', () => {
    it('partializes currentQuestion, currentCategory, and askedQuestionIds', () => {
      const q = createMockQuestion('q-persist', 'orange');
      useQuestionStore.setState({
        currentQuestion: q,
        currentCategory: 'orange',
        askedQuestionIds: ['q-persist'],
      });

      const raw = sessionStorage.getItem('trivial-world-questions');
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.state.currentQuestion).toEqual(q);
      expect(parsed.state.currentCategory).toBe('orange');
      expect(parsed.state.askedQuestionIds).toEqual(['q-persist']);
    });

    it('initial state has null currentQuestion and currentCategory and empty askedQuestionIds', () => {
      const fresh = useQuestionStore.getState();
      expect(fresh.currentQuestion).toBeNull();
      expect(fresh.currentCategory).toBeNull();
      expect(fresh.askedQuestionIds).toEqual([]);
    });
  });
});