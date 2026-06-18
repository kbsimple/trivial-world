/**
 * Tests for questionProvider.ts — IDB cache hit path on web.
 *
 * Imports packCache via the shim path so the mock is applied as in production.
 * Full coverage of the web IDB path lives in questionProvider.web.test.ts;
 * this file satisfies the Phase 23 artifact requirement for questionProvider.test.ts.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

vi.mock('./packCache', () => ({
  getCachedPackQuestions: vi.fn().mockResolvedValue([
    { id: 'q-cached', category: 'blue', questionText: 'Cached?', answerText: 'Yes' },
  ]),
  setCachedPackQuestions: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../stores/packStore', () => ({
  usePackStore: {
    getState: vi.fn().mockReturnValue({
      availablePacks: [
        { id: 'pack-1', downloadUrl: 'https://example.com/pack-1.json', checksum: 'abc', size: 500 },
      ],
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

describe('getNextQuestion (web — IDB cache hit)', () => {
  it('returns cached question without calling fetch when IDB has data', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');

    const question = await getNextQuestion('blue' as any, [], ['pack-1']);

    expect(getCachedPackQuestions).toHaveBeenCalledWith('pack-1');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(question).not.toBeNull();
    expect(question?.id).toBe('q-cached');
  });
});
