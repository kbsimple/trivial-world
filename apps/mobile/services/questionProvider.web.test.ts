/**
 * Tests for fetchWebPackQuestions IDB-first cache behavior (Plan 23-03, Task 1)
 *
 * Strategy: mock packCache.ts shim to control getCachedPackQuestions/setCachedPackQuestions,
 * mock packStore and global fetch to simulate network paths.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Platform to return 'web' so getNextQuestion exercises the web path
vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

// Mock the packCache shim — vi.fn() inline to avoid hoisting issues
vi.mock('./packCache', () => ({
  getCachedPackQuestions: vi.fn(),
  setCachedPackQuestions: vi.fn(),
}));

// Mock packStore dynamic import
vi.mock('../stores/packStore', () => ({
  usePackStore: {
    getState: vi.fn(() => ({
      availablePacks: [
        { id: 'pack-1', downloadUrl: 'https://example.com/pack-1.json' },
      ],
    })),
  },
}));

// Mock @trivial-world/types — preserve actual exports, override QuestionPackSchema.safeParse
vi.mock('@trivial-world/types', async () => {
  const actual = await vi.importActual<typeof import('@trivial-world/types')>('@trivial-world/types');
  return {
    ...actual,
    QuestionPackSchema: {
      safeParse: vi.fn(),
    },
  };
});

// Mock data/questions — empty bundled pool so we can observe fetch behavior clearly
vi.mock('../data/questions', () => ({
  ALL_QUESTIONS: [],
  getQuestionsByCategory: vi.fn(() => []),
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { getNextQuestion } from './questionProvider';
import { getCachedPackQuestions, setCachedPackQuestions } from './packCache';
import { QuestionPackSchema } from '@trivial-world/types';
import type { Question } from '@trivial-world/types';

const mockGetCached = vi.mocked(getCachedPackQuestions);
const mockSetCached = vi.mocked(setCachedPackQuestions);
const mockSafeParse = vi.mocked(QuestionPackSchema.safeParse);

const mockQuestions: Question[] = [
  {
    id: 'q1',
    category: 'blue',
    questionText: 'What is the capital of France?',
    answerText: 'Paris',
    difficulty: 'medium',
  },
];

describe('fetchWebPackQuestions (IDB-first cache behavior)', () => {
  beforeEach(() => {
    mockGetCached.mockReset();
    mockSetCached.mockReset();
    mockSafeParse.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('IDB cache hit', () => {
    it('returns cached questions without calling fetch when IDB has data', async () => {
      mockGetCached.mockResolvedValue(mockQuestions);
      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);

      await getNextQuestion('blue', [], ['pack-1']);

      expect(mockGetCached).toHaveBeenCalledWith('pack-1');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('does not call setCachedPackQuestions on IDB cache hit', async () => {
      mockGetCached.mockResolvedValue(mockQuestions);
      vi.stubGlobal('fetch', vi.fn());

      await getNextQuestion('blue', [], ['pack-1']);

      expect(mockSetCached).not.toHaveBeenCalled();
    });
  });

  describe('IDB cache miss — network success', () => {
    it('calls fetch when IDB returns null', async () => {
      mockGetCached.mockResolvedValue(null);
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      });
      vi.stubGlobal('fetch', mockFetch);
      mockSafeParse.mockReturnValue({
        success: true,
        data: { questions: mockQuestions },
      } as ReturnType<typeof QuestionPackSchema.safeParse>);

      await getNextQuestion('blue', [], ['pack-1']);

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/pack-1.json');
    });

    it('calls setCachedPackQuestions with fetched questions after successful network request', async () => {
      mockGetCached.mockResolvedValue(null);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      }));
      mockSafeParse.mockReturnValue({
        success: true,
        data: { questions: mockQuestions },
      } as ReturnType<typeof QuestionPackSchema.safeParse>);

      await getNextQuestion('blue', [], ['pack-1']);

      expect(mockSetCached).toHaveBeenCalledWith('pack-1', mockQuestions);
    });
  });

  describe('IDB cache miss — network failure (offline)', () => {
    it('returns null gracefully when IDB is empty and fetch throws', async () => {
      mockGetCached.mockResolvedValue(null);
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      // ALL_QUESTIONS is empty mock → pool empty → null
      const result = await getNextQuestion('blue', [], ['pack-1']);
      expect(result).toBeNull();
    });

    it('does not call setCachedPackQuestions when fetch fails', async () => {
      mockGetCached.mockResolvedValue(null);
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      await getNextQuestion('blue', [], ['pack-1']);

      expect(mockSetCached).not.toHaveBeenCalled();
    });
  });

  describe('IDB is checked on every call (webPackCache Map removed)', () => {
    it('calls getCachedPackQuestions on every invocation — no in-memory short-circuit', async () => {
      mockGetCached.mockResolvedValue(mockQuestions);
      vi.stubGlobal('fetch', vi.fn());

      await getNextQuestion('blue', [], ['pack-1']);
      await getNextQuestion('blue', [], ['pack-1']);

      // Both calls should hit the IDB cache check (not short-circuited by in-memory Map)
      expect(mockGetCached).toHaveBeenCalledTimes(2);
    });
  });
});
