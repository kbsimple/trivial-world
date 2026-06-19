/**
 * Tests for questionProvider.ts — web path.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const cachedQs = vi.hoisted(() => ({ current: [] as any[] }));

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

vi.mock('./packCache', () => ({
  getCachedPackQuestions: vi.fn((_packId: string) => Promise.resolve(cachedQs.current)),
  setCachedPackQuestions: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../stores/packStore', () => ({
  usePackStore: {
    getState: vi.fn().mockReturnValue({
      availablePacks: [{ id: 'pack-1', downloadUrl: 'https://example.com/pack-1.json' }],
      enabledDifficulties: null,
    }),
  },
}));

vi.mock('../data/questions', () => ({
  ALL_QUESTIONS: [],
  getQuestionsByCategory: vi.fn(() => []),
}));

vi.mock('../utils/logger', () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { getNextQuestion } from './questionProvider';
import { getCachedPackQuestions } from './packCache';

const MIXED = [
  { id: 'q-easy',   category: 'blue', questionText: 'Easy?',   answerText: 'E', difficulty: 'easy'   },
  { id: 'q-medium', category: 'blue', questionText: 'Medium?', answerText: 'M', difficulty: 'medium' },
  { id: 'q-hard',   category: 'blue', questionText: 'Hard?',   answerText: 'H', difficulty: 'hard'   },
];

beforeEach(() => {
  vi.clearAllMocks();
  cachedQs.current = [];
});

describe('getNextQuestion (web — IDB cache hit)', () => {
  it('returns cached question without calling fetch when IDB has data', async () => {
    cachedQs.current = [{ id: 'q-cached', category: 'blue', questionText: 'Cached?', answerText: 'Yes' }];

    const fetchSpy = vi.spyOn(global, 'fetch');
    const question = await getNextQuestion('blue' as any, [], ['pack-1']);

    expect(getCachedPackQuestions).toHaveBeenCalledWith('pack-1');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(question?.id).toBe('q-cached');
  });
});

describe('getNextQuestion (web — game-level difficulty filter)', () => {
  it('suppresses easy and medium questions when only hard is enabled', async () => {
    cachedQs.current = MIXED;

    // Pass enabledDifficulties directly — regression for the web path ignoring this filter
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        getNextQuestion('blue' as any, [], ['pack-1'], undefined, ['hard'])
      )
    );

    expect(results.every((q) => q?.difficulty === 'hard')).toBe(true);
  });

  it('returns all difficulties when enabledDifficulties is null', async () => {
    cachedQs.current = MIXED;

    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const q = await getNextQuestion('blue' as any, [], ['pack-1'], undefined, null);
      if (q?.difficulty) seen.add(q.difficulty);
      if (seen.size === 3) break;
    }

    expect(seen).toContain('easy');
    expect(seen).toContain('medium');
    expect(seen).toContain('hard');
  });
});
