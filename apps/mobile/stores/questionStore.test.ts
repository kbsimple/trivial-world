/**
 * Tests for questionStore
 * Tests question selection, asked tracking, and category filtering
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';

// Mock dependencies before importing the store
const mockQuestions: Array<{
  id: string;
  questionPackId: string;
  questionId: string;
  category: string;
  questionText: string;
  answerText: string;
  difficulty?: string;
  askedAt: number | null;
  markAsAsked: () => Promise<void>;
  update: (fn: (q: any) => void) => Promise<void>;
}> = [];

const mockPacks: Array<{ id: string; packId: string }> = [];

let mockDatabaseQueryShouldReturn: any[] = [];
let mockPackQueryShouldReturn: any[] = [];

// Mock database module
vi.mock('../database', () => ({
  getDatabase: vi.fn(() => ({
    get: vi.fn((tableName: string) => ({
      query: vi.fn(() => ({
        fetch: vi.fn(async () => {
          if (tableName === 'questions') {
            return mockDatabaseQueryShouldReturn;
          }
          if (tableName === 'question_packs') {
            return mockPackQueryShouldReturn;
          }
          return [];
        }),
      })),
    })),
    write: vi.fn(async (fn) => {
      await fn();
    }),
  })),
}));

// Mock packStore
vi.mock('./packStore', () => ({
  usePackStore: {
    getState: vi.fn(() => ({
      activePackId: 'test-pack-uuid',
      enabledCategories: null,
      enabledDifficulties: null,
    })),
  },
}));

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
  },
}));

// Import after mocks are set up
import { useQuestionStore } from './questionStore';

/**
 * Helper to create a mock question model
 */
function createMockQuestion(
  id: string,
  category: string = 'blue',
  difficulty: string = 'medium',
  askedAt: number | null = null
) {
  return {
    id: `db-${id}`,
    questionPackId: 'pack-db-id',
    questionId: id,
    category,
    questionText: `Test question ${id}`,
    answerText: `Test answer ${id}`,
    difficulty,
    askedAt,
    markAsAsked: vi.fn(async () => {
      const q = mockQuestions.find(q => q.questionId === id);
      if (q) {
        q.askedAt = Date.now();
      }
    }),
    update: vi.fn(async (fn: (q: any) => void) => {
      const q = mockQuestions.find(q => q.questionId === id);
      if (q) {
        fn(q);
      }
    }),
  };
}

/**
 * Helper to create a mock pack model
 */
function createMockPack(packId: string, dbId: string = 'pack-db-id') {
  return {
    id: dbId,
    packId,
  };
}

describe('questionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuestions.length = 0;
    mockPacks.length = 0;
    mockDatabaseQueryShouldReturn = [];
    mockPackQueryShouldReturn = [];

    // Reset store state
    useQuestionStore.setState({
      currentQuestion: null,
      currentCategory: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('selectQuestion', () => {
    it('returns null when no active pack is selected', async () => {
      const { usePackStore } = await import('./packStore');
      vi.mocked(usePackStore.getState).mockReturnValue({
        activePackId: null,
        enabledCategories: null,
        enabledDifficulties: null,
      });

      const result = await useQuestionStore.getState().selectQuestion('blue');

      expect(result).toBeNull();
    });

    it('returns null when category is disabled', async () => {
      const { usePackStore } = await import('./packStore');
      vi.mocked(usePackStore.getState).mockReturnValue({
        activePackId: 'test-pack-uuid',
        enabledCategories: ['pink', 'yellow'], // blue is disabled
        enabledDifficulties: null,
      });

      const result = await useQuestionStore.getState().selectQuestion('blue');

      expect(result).toBeNull();
    });

    it('returns null when pack is not found in database', async () => {
      mockPackQueryShouldReturn = []; // No packs found

      const result = await useQuestionStore.getState().selectQuestion('blue');

      expect(result).toBeNull();
    });

    it('returns null when no questions available for category', async () => {
      mockPackQueryShouldReturn = [createMockPack('test-pack-uuid')];
      mockDatabaseQueryShouldReturn = []; // No questions

      const result = await useQuestionStore.getState().selectQuestion('blue');

      expect(result).toBeNull();
    });

    it('returns null when all questions in category have been asked', async () => {
      mockPackQueryShouldReturn = [createMockPack('test-pack-uuid')];
      mockDatabaseQueryShouldReturn = []; // Query filters asked_at: null, so asked questions not returned

      const result = await useQuestionStore.getState().selectQuestion('blue');

      expect(result).toBeNull();
    });

    it('selects a question from available pool', async () => {
      mockPackQueryShouldReturn = [createMockPack('test-pack-uuid')];
      mockDatabaseQueryShouldReturn = [
        createMockQuestion('q-1', 'blue', 'medium', null),
        createMockQuestion('q-2', 'blue', 'medium', null),
      ];

      const result = await useQuestionStore.getState().selectQuestion('blue');

      expect(result).not.toBeNull();
      expect(result?.category).toBe('blue');
      expect(['q-1', 'q-2']).toContain(result?.id);
    });

    it('updates currentQuestion and currentCategory state', async () => {
      mockPackQueryShouldReturn = [createMockPack('test-pack-uuid')];
      mockDatabaseQueryShouldReturn = [
        createMockQuestion('q-1', 'pink', 'easy', null),
      ];

      await useQuestionStore.getState().selectQuestion('pink');

      const state = useQuestionStore.getState();
      expect(state.currentQuestion).not.toBeNull();
      expect(state.currentQuestion?.id).toBe('q-1');
      expect(state.currentCategory).toBe('pink');
    });

    it('filters by difficulty when enabledDifficulties is set', async () => {
      const { usePackStore } = await import('./packStore');
      vi.mocked(usePackStore.getState).mockReturnValue({
        activePackId: 'test-pack-uuid',
        enabledCategories: null,
        enabledDifficulties: ['hard'], // Only hard questions
      });

      mockPackQueryShouldReturn = [createMockPack('test-pack-uuid')];
      mockDatabaseQueryShouldReturn = [
        createMockQuestion('q-1', 'green', 'easy', null),
        createMockQuestion('q-2', 'green', 'medium', null),
        createMockQuestion('q-3', 'green', 'hard', null),
      ];

      const result = await useQuestionStore.getState().selectQuestion('green');

      // Only q-3 is hard difficulty
      expect(result).not.toBeNull();
      expect(result?.id).toBe('q-3');
    });

    it('returns null when no questions match difficulty filter', async () => {
      const { usePackStore } = await import('./packStore');
      vi.mocked(usePackStore.getState).mockReturnValue({
        activePackId: 'test-pack-uuid',
        enabledCategories: null,
        enabledDifficulties: ['hard'], // Only hard questions
      });

      mockPackQueryShouldReturn = [createMockPack('test-pack-uuid')];
      mockDatabaseQueryShouldReturn = [
        createMockQuestion('q-1', 'orange', 'easy', null),
        createMockQuestion('q-2', 'orange', 'medium', null),
      ];

      const result = await useQuestionStore.getState().selectQuestion('orange');

      expect(result).toBeNull();
    });

    it('selects question for each category independently', async () => {
      mockPackQueryShouldReturn = [createMockPack('test-pack-uuid')];

      // Test blue category
      mockDatabaseQueryShouldReturn = [
        createMockQuestion('q-blue', 'blue', 'medium', null),
      ];
      let result = await useQuestionStore.getState().selectQuestion('blue');
      expect(result?.category).toBe('blue');

      // Test yellow category
      mockDatabaseQueryShouldReturn = [
        createMockQuestion('q-yellow', 'yellow', 'medium', null),
      ];
      result = await useQuestionStore.getState().selectQuestion('yellow');
      expect(result?.category).toBe('yellow');
    });

    it('handles all six categories', async () => {
      const categories = ['blue', 'pink', 'yellow', 'purple', 'green', 'orange'] as const;
      mockPackQueryShouldReturn = [createMockPack('test-pack-uuid')];

      for (const category of categories) {
        mockDatabaseQueryShouldReturn = [
          createMockQuestion(`q-${category}`, category, 'medium', null),
        ];
        const result = await useQuestionStore.getState().selectQuestion(category);
        expect(result?.category).toBe(category);
      }
    });
  });

  describe('markAsked', () => {
    it('marks a question as asked in database', async () => {
      const mockQ = createMockQuestion('q-to-mark', 'blue', 'medium', null);
      mockDatabaseQueryShouldReturn = [mockQ];

      await useQuestionStore.getState().markAsked('q-to-mark');

      expect(mockQ.markAsAsked).toHaveBeenCalled();
    });

    it('handles question not found gracefully', async () => {
      mockDatabaseQueryShouldReturn = []; // Question not in database

      // Should not throw
      await expect(
        useQuestionStore.getState().markAsked('non-existent')
      ).resolves.not.toThrow();
    });
  });

  describe('resetAskedQuestions', () => {
    it('does nothing when no active pack', async () => {
      const { usePackStore } = await import('./packStore');
      vi.mocked(usePackStore.getState).mockReturnValue({
        activePackId: null,
        enabledCategories: null,
        enabledDifficulties: null,
      });

      // Should not throw
      await expect(
        useQuestionStore.getState().resetAskedQuestions()
      ).resolves.not.toThrow();
    });

    it('resets asked_at for all questions in active pack', async () => {
      const mockQ1 = createMockQuestion('q-1', 'blue', 'medium', Date.now());
      const mockQ2 = createMockQuestion('q-2', 'pink', 'easy', Date.now());
      const mockQ3 = createMockQuestion('q-3', 'yellow', 'hard', null);

      mockPackQueryShouldReturn = [createMockPack('test-pack-uuid')];
      mockDatabaseQueryShouldReturn = [mockQ1, mockQ2, mockQ3];

      await useQuestionStore.getState().resetAskedQuestions();

      // All questions should have their update method called
      expect(mockQ1.update).toHaveBeenCalled();
      expect(mockQ2.update).toHaveBeenCalled();
      expect(mockQ3.update).toHaveBeenCalled();
    });

    it('handles empty pack gracefully', async () => {
      mockPackQueryShouldReturn = [createMockPack('test-pack-uuid')];
      mockDatabaseQueryShouldReturn = []; // No questions

      // Should not throw
      await expect(
        useQuestionStore.getState().resetAskedQuestions()
      ).resolves.not.toThrow();
    });
  });

  describe('question exhaustion handling', () => {
    it('returns null when all questions in category are exhausted', async () => {
      mockPackQueryShouldReturn = [createMockPack('test-pack-uuid')];
      // All questions have been asked (askedAt is set)
      // The query filters for asked_at: null, so this returns empty
      mockDatabaseQueryShouldReturn = [];

      const result = await useQuestionStore.getState().selectQuestion('purple');

      expect(result).toBeNull();
    });

    it('allows selection after resetAskedQuestions', async () => {
      mockPackQueryShouldReturn = [createMockPack('test-pack-uuid')];

      // First, simulate exhausted category
      mockDatabaseQueryShouldReturn = [];
      let result = await useQuestionStore.getState().selectQuestion('green');
      expect(result).toBeNull();

      // Reset the questions
      mockDatabaseQueryShouldReturn = [
        createMockQuestion('q-recovered', 'green', 'medium', null),
      ];
      await useQuestionStore.getState().resetAskedQuestions();

      // Now should be able to select again
      result = await useQuestionStore.getState().selectQuestion('green');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('q-recovered');
    });
  });

  describe('store persistence', () => {
    it('persists currentQuestion and currentCategory', async () => {
      mockPackQueryShouldReturn = [createMockPack('test-pack-uuid')];
      mockDatabaseQueryShouldReturn = [
        createMockQuestion('q-persist', 'orange', 'hard', null),
      ];

      await useQuestionStore.getState().selectQuestion('orange');

      const state = useQuestionStore.getState();
      expect(state.currentQuestion).not.toBeNull();
      expect(state.currentCategory).toBe('orange');
    });

    it('initial state has null currentQuestion and currentCategory', () => {
      const freshStore = useQuestionStore.getState();
      expect(freshStore.currentQuestion).toBeNull();
      expect(freshStore.currentCategory).toBeNull();
    });
  });
});