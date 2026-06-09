/**
 * Tests for LocalStorage persistence layer
 * Per D-18: Manual JSON download for approved packs
 * Per T-07-10: QuotaExceededError handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  saveApprovedQuestion,
  getApprovedQuestions,
  clearApprovedQuestions,
  removeApprovedQuestion,
  getApprovedCountByCategory,
  getApprovedCount,
  type ApprovedQuestion,
} from './local';
import type { Question } from '@trivial-world/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get store() {
      return store;
    },
  };
})();

// Stub localStorage globally
vi.stubGlobal('localStorage', localStorageMock);

// Helper to create valid questions
function createMockQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'test-question-1',
    category: 'blue',
    questionText: 'What is the test question?',
    answerText: 'This is the test answer.',
    difficulty: 'medium',
    ...overrides,
  };
}

describe('saveApprovedQuestion', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saves a valid question to localStorage', () => {
    const question = createMockQuestion();

    saveApprovedQuestion(question);

    expect(localStorageMock.setItem).toHaveBeenCalledOnce();
    const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    expect(savedData).toHaveLength(1);
    expect(savedData[0].question.id).toBe('test-question-1');
    expect(savedData[0].approvedAt).toBeDefined();
  });

  it('appends new question to existing approved questions', () => {
    const question1 = createMockQuestion({ id: 'q-1' });
    const question2 = createMockQuestion({ id: 'q-2' });

    saveApprovedQuestion(question1);
    saveApprovedQuestion(question2);

    const savedData = JSON.parse(localStorageMock.store['trivial-world-approved-questions']);
    expect(savedData).toHaveLength(2);
    expect(savedData.map((aq: ApprovedQuestion) => aq.question.id)).toEqual(['q-1', 'q-2']);
  });

  it('skips duplicate questions by ID', () => {
    const question = createMockQuestion({ id: 'q-1' });

    saveApprovedQuestion(question);
    saveApprovedQuestion(question); // Try to save again

    const savedData = JSON.parse(localStorageMock.store['trivial-world-approved-questions']);
    expect(savedData).toHaveLength(1);
  });

  it('throws error for invalid question (missing required fields)', () => {
    const invalidQuestion = {
      id: 'invalid',
      // Missing category, questionText, answerText
    } as unknown as Question;

    expect(() => saveApprovedQuestion(invalidQuestion)).toThrow(/Invalid question/);
  });

  it('throws error for invalid question ID format', () => {
    const invalidQuestion = createMockQuestion({
      id: 'INVALID_ID_WITH_CAPS', // Invalid - must be lowercase letters, numbers, hyphens
    });

    expect(() => saveApprovedQuestion(invalidQuestion)).toThrow(/Invalid question/);
  });

  it('throws error for question text too short', () => {
    const invalidQuestion = createMockQuestion({
      questionText: 'Too short', // Less than 10 chars
    });

    expect(() => saveApprovedQuestion(invalidQuestion)).toThrow(/Invalid question/);
  });

  it('throws QuotaExceededError with user-friendly message', () => {
    const question = createMockQuestion();
    const quotaError = new Error('Quota exceeded');
    quotaError.name = 'QuotaExceededError';

    localStorageMock.setItem.mockImplementationOnce(() => {
      throw quotaError;
    });

    expect(() => saveApprovedQuestion(question)).toThrow(/Storage quota exceeded/);
  });

  it('returns early in SSR environment (no window)', () => {
    const originalWindow = global.window;
    // @ts-expect-error - intentionally deleting window for test
    delete global.window;

    const question = createMockQuestion();

    // Should not throw in SSR
    expect(() => saveApprovedQuestion(question)).not.toThrow();

    global.window = originalWindow;
  });
});

describe('getApprovedQuestions', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty array when no questions stored', () => {
    const result = getApprovedQuestions();
    expect(result).toEqual([]);
  });

  it('returns all approved questions with timestamps', () => {
    const storedData = [
      {
        question: createMockQuestion({ id: 'q-1' }),
        approvedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        question: createMockQuestion({ id: 'q-2', category: 'pink' }),
        approvedAt: '2024-01-02T00:00:00.000Z',
      },
    ];
    localStorageMock.store['trivial-world-approved-questions'] = JSON.stringify(storedData);

    const result = getApprovedQuestions();

    expect(result).toHaveLength(2);
    expect(result[0].question.id).toBe('q-1');
    expect(result[1].question.category).toBe('pink');
  });

  it('returns empty array and clears storage for corrupted non-array data', () => {
    localStorageMock.store['trivial-world-approved-questions'] = JSON.stringify({ invalid: 'data' });

    const result = getApprovedQuestions();

    expect(result).toEqual([]);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('trivial-world-approved-questions');
  });

  it('filters out invalid questions (missing approvedAt)', () => {
    const storedData = [
      {
        question: createMockQuestion({ id: 'q-1' }),
        approvedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        question: createMockQuestion({ id: 'q-2' }),
        // Missing approvedAt
      },
    ];
    localStorageMock.store['trivial-world-approved-questions'] = JSON.stringify(storedData);

    const result = getApprovedQuestions();

    expect(result).toHaveLength(1);
    expect(result[0].question.id).toBe('q-1');
  });

  it('filters out questions that fail schema validation', () => {
    const storedData = [
      {
        question: createMockQuestion({ id: 'q-1' }),
        approvedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        question: { id: 'INVALID_CAPS', category: 'blue' }, // Invalid ID format
        approvedAt: '2024-01-02T00:00:00.000Z',
      },
    ];
    localStorageMock.store['trivial-world-approved-questions'] = JSON.stringify(storedData);

    const result = getApprovedQuestions();

    expect(result).toHaveLength(1);
    expect(result[0].question.id).toBe('q-1');
  });

  it('returns empty array for malformed JSON', () => {
    localStorageMock.store['trivial-world-approved-questions'] = 'not valid json{{{';

    const result = getApprovedQuestions();

    expect(result).toEqual([]);
  });

  it('filters out null items in array', () => {
    const storedData = [
      {
        question: createMockQuestion({ id: 'q-1' }),
        approvedAt: '2024-01-01T00:00:00.000Z',
      },
      null,
      {
        question: createMockQuestion({ id: 'q-2' }),
        approvedAt: '2024-01-02T00:00:00.000Z',
      },
    ];
    localStorageMock.store['trivial-world-approved-questions'] = JSON.stringify(storedData);

    const result = getApprovedQuestions();

    expect(result).toHaveLength(2);
  });

  it('returns empty array in SSR environment', () => {
    const originalWindow = global.window;
    // @ts-expect-error - intentionally deleting window for test
    delete global.window;

    const result = getApprovedQuestions();

    expect(result).toEqual([]);

    global.window = originalWindow;
  });
});

describe('clearApprovedQuestions', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('removes approved questions from localStorage', () => {
    localStorageMock.store['trivial-world-approved-questions'] = JSON.stringify([
      { question: createMockQuestion(), approvedAt: '2024-01-01T00:00:00.000Z' },
    ]);

    clearApprovedQuestions();

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('trivial-world-approved-questions');
  });

  it('handles already empty storage gracefully', () => {
    clearApprovedQuestions();

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('trivial-world-approved-questions');
  });

  it('returns early in SSR environment', () => {
    const originalWindow = global.window;
    // @ts-expect-error - intentionally deleting window for test
    delete global.window;

    clearApprovedQuestions();

    // Should not throw
    expect(localStorageMock.removeItem).not.toHaveBeenCalled();

    global.window = originalWindow;
  });
});

describe('removeApprovedQuestion', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('removes question by ID', () => {
    const storedData = [
      { question: createMockQuestion({ id: 'q-1' }), approvedAt: '2024-01-01T00:00:00.000Z' },
      { question: createMockQuestion({ id: 'q-2' }), approvedAt: '2024-01-02T00:00:00.000Z' },
      { question: createMockQuestion({ id: 'q-3' }), approvedAt: '2024-01-03T00:00:00.000Z' },
    ];
    localStorageMock.store['trivial-world-approved-questions'] = JSON.stringify(storedData);

    removeApprovedQuestion('q-2');

    const savedData = JSON.parse(localStorageMock.store['trivial-world-approved-questions']);
    expect(savedData).toHaveLength(2);
    expect(savedData.map((aq: ApprovedQuestion) => aq.question.id)).toEqual(['q-1', 'q-3']);
  });

  it('handles non-existent ID gracefully', () => {
    const storedData = [
      { question: createMockQuestion({ id: 'q-1' }), approvedAt: '2024-01-01T00:00:00.000Z' },
    ];
    localStorageMock.store['trivial-world-approved-questions'] = JSON.stringify(storedData);

    removeApprovedQuestion('non-existent-id');

    const savedData = JSON.parse(localStorageMock.store['trivial-world-approved-questions']);
    expect(savedData).toHaveLength(1);
  });

  it('returns early in SSR environment', () => {
    const originalWindow = global.window;
    // @ts-expect-error - intentionally deleting window for test
    delete global.window;

    removeApprovedQuestion('q-1');

    // Should not throw
    expect(localStorageMock.removeItem).not.toHaveBeenCalled();

    global.window = originalWindow;
  });
});

describe('getApprovedCountByCategory', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns zero counts for empty storage', () => {
    const counts = getApprovedCountByCategory();

    expect(counts).toEqual({
      blue: 0,
      pink: 0,
      yellow: 0,
      purple: 0,
      green: 0,
      orange: 0,
    });
  });

  it('counts questions by category correctly', () => {
    const storedData = [
      { question: createMockQuestion({ id: 'q-1', category: 'blue' }), approvedAt: '2024-01-01T00:00:00.000Z' },
      { question: createMockQuestion({ id: 'q-2', category: 'blue' }), approvedAt: '2024-01-02T00:00:00.000Z' },
      { question: createMockQuestion({ id: 'q-3', category: 'pink' }), approvedAt: '2024-01-03T00:00:00.000Z' },
      { question: createMockQuestion({ id: 'q-4', category: 'yellow' }), approvedAt: '2024-01-04T00:00:00.000Z' },
      { question: createMockQuestion({ id: 'q-5', category: 'purple' }), approvedAt: '2024-01-05T00:00:00.000Z' },
      { question: createMockQuestion({ id: 'q-6', category: 'green' }), approvedAt: '2024-01-06T00:00:00.000Z' },
      { question: createMockQuestion({ id: 'q-7', category: 'orange' }), approvedAt: '2024-01-07T00:00:00.000Z' },
    ];
    localStorageMock.store['trivial-world-approved-questions'] = JSON.stringify(storedData);

    const counts = getApprovedCountByCategory();

    expect(counts).toEqual({
      blue: 2,
      pink: 1,
      yellow: 1,
      purple: 1,
      green: 1,
      orange: 1,
    });
  });

  it('returns zero counts in SSR environment', () => {
    const originalWindow = global.window;
    // @ts-expect-error - intentionally deleting window for test
    delete global.window;

    const counts = getApprovedCountByCategory();

    expect(counts).toEqual({
      blue: 0,
      pink: 0,
      yellow: 0,
      purple: 0,
      green: 0,
      orange: 0,
    });

    global.window = originalWindow;
  });
});

describe('getApprovedCount', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 0 for empty storage', () => {
    expect(getApprovedCount()).toBe(0);
  });

  it('returns correct count of approved questions', () => {
    const storedData = [
      { question: createMockQuestion({ id: 'q-1' }), approvedAt: '2024-01-01T00:00:00.000Z' },
      { question: createMockQuestion({ id: 'q-2' }), approvedAt: '2024-01-02T00:00:00.000Z' },
      { question: createMockQuestion({ id: 'q-3' }), approvedAt: '2024-01-03T00:00:00.000Z' },
    ];
    localStorageMock.store['trivial-world-approved-questions'] = JSON.stringify(storedData);

    expect(getApprovedCount()).toBe(3);
  });

  it('returns 0 in SSR environment', () => {
    const originalWindow = global.window;
    // @ts-expect-error - intentionally deleting window for test
    delete global.window;

    expect(getApprovedCount()).toBe(0);

    global.window = originalWindow;
  });
});

describe('Edge cases', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles max storage scenario (many questions)', () => {
    // Create 100 questions
    const storedData = Array.from({ length: 100 }, (_, i) => ({
      question: createMockQuestion({ id: `q-${i}`, category: (['blue', 'pink', 'yellow', 'purple', 'green', 'orange'] as const)[i % 6] }),
      approvedAt: new Date(2024, 0, i + 1).toISOString(),
    }));
    localStorageMock.store['trivial-world-approved-questions'] = JSON.stringify(storedData);

    const result = getApprovedQuestions();
    expect(result).toHaveLength(100);

    const counts = getApprovedCountByCategory();
    expect(counts.blue).toBe(17); // 100 / 6 rounded
    expect(getApprovedCount()).toBe(100);
  });

  it('handles question with all optional fields', () => {
    const fullQuestion = createMockQuestion({
      id: 'full-question',
      difficulty: 'hard',
      choices: ['Option A', 'Option B', 'Option C'],
      correctChoiceIndex: 1,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      author: 'Test Author',
      source: 'https://example.com/source',
    });

    saveApprovedQuestion(fullQuestion);

    const savedData = JSON.parse(localStorageMock.store['trivial-world-approved-questions']);
    expect(savedData[0].question.author).toBe('Test Author');
    expect(savedData[0].question.source).toBe('https://example.com/source');
  });

  it('handles concurrent save operations (last write wins)', () => {
    // Simulate race condition where two saves happen in quick succession
    const question1 = createMockQuestion({ id: 'q-1' });
    const question2 = createMockQuestion({ id: 'q-2' });

    saveApprovedQuestion(question1);
    // In a real race, question2 might not see question1
    // But our implementation reads fresh data each time
    saveApprovedQuestion(question2);

    const result = getApprovedQuestions();
    expect(result).toHaveLength(2);
  });
});