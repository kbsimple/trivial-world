/**
 * Tests for pack export utility
 * Per D-03: UUID-based pack identifiers
 * Per D-05: Schema version '1.0.0' enforced
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateChecksum, generatePackId, exportPack } from './export';
import type { ApprovedQuestion } from '../storage/local';

// Mock getApprovedQuestions and getApprovedCountByCategory
vi.mock('../storage/local', () => ({
  getApprovedQuestions: vi.fn(),
  getApprovedCountByCategory: vi.fn(),
}));

import { getApprovedQuestions, getApprovedCountByCategory } from '../storage/local';

// Create mock questions for testing
function createMockQuestion(id: string, category: string = 'blue'): ApprovedQuestion['question'] {
  return {
    id,
    category: category as 'blue' | 'pink' | 'yellow' | 'purple' | 'green' | 'orange',
    questionText: `Test question ${id}`,
    answerText: `Test answer ${id}`,
    difficulty: 'medium',
  };
}

describe('calculateChecksum', () => {
  it('returns SHA-256 hex string (64 characters)', async () => {
    const content = 'test content';
    const checksum = await calculateChecksum(content);

    // SHA-256 produces 64 character hex string
    expect(checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns consistent checksum for same input', async () => {
    const content = 'test content';
    const checksum1 = await calculateChecksum(content);
    const checksum2 = await calculateChecksum(content);

    expect(checksum1).toBe(checksum2);
  });

  it('returns different checksum for different input', async () => {
    const checksum1 = await calculateChecksum('content one');
    const checksum2 = await calculateChecksum('content two');

    expect(checksum1).not.toBe(checksum2);
  });
});

describe('generatePackId', () => {
  it('returns valid UUID v4 format', () => {
    const id = generatePackId();

    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // where y is 8, 9, a, or b
    expect(id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  });

  it('returns unique IDs on each call', () => {
    const id1 = generatePackId();
    const id2 = generatePackId();

    expect(id1).not.toBe(id2);
  });
});

describe('exportPack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws error when fewer than 20 approved questions', async () => {
    // Mock 10 approved questions (less than 20 minimum)
    const mockQuestions: ApprovedQuestion[] = Array.from({ length: 10 }, (_, i) => ({
      question: createMockQuestion(`q-${i}`),
      approvedAt: new Date().toISOString(),
    }));

    vi.mocked(getApprovedQuestions).mockReturnValue(mockQuestions);

    await expect(exportPack('Test Pack', undefined, 'Author')).rejects.toThrow(/at least 20 questions/i);
  });

  it('generates valid QuestionPackSchema for 20+ questions', async () => {
    // Mock 20 approved questions
    const mockQuestions: ApprovedQuestion[] = Array.from({ length: 20 }, (_, i) => ({
      question: createMockQuestion(`q-${i}`, ['blue', 'pink', 'yellow', 'purple', 'green', 'orange'][i % 6]),
      approvedAt: new Date().toISOString(),
    }));

    vi.mocked(getApprovedQuestions).mockReturnValue(mockQuestions);
    vi.mocked(getApprovedCountByCategory).mockReturnValue({
      blue: 4,
      pink: 4,
      yellow: 3,
      purple: 3,
      green: 3,
      orange: 3,
    });

    const { pack } = await exportPack('Test Pack', 'A test description', 'Test Author');

    // Verify pack structure
    expect(pack.metadata.name).toBe('Test Pack');
    expect(pack.metadata.description).toBe('A test description');
    expect(pack.metadata.author).toBe('Test Author');
    expect(pack.metadata.schemaVersion).toBe('1.0.0');
    expect(pack.questions).toHaveLength(20);
    expect(pack.metadata.totalQuestions).toBe(20);
    expect(pack.metadata.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(pack.metadata.id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  });

  it('includes correct metadata fields', async () => {
    // Mock 20 approved questions
    const mockQuestions: ApprovedQuestion[] = Array.from({ length: 20 }, (_, i) => ({
      question: createMockQuestion(`q-${i}`),
      approvedAt: new Date().toISOString(),
    }));

    vi.mocked(getApprovedQuestions).mockReturnValue(mockQuestions);
    vi.mocked(getApprovedCountByCategory).mockReturnValue({
      blue: 20,
      pink: 0,
      yellow: 0,
      purple: 0,
      green: 0,
      orange: 0,
    });

    const { pack, blob, filename } = await exportPack('My Pack', 'Description', 'John Doe');

    // Verify metadata
    expect(pack.metadata.name).toBe('My Pack');
    expect(pack.metadata.author).toBe('John Doe');
    expect(pack.metadata.version).toBe('1.0.0');
    expect(pack.metadata.schemaVersion).toBe('1.0.0');
    expect(pack.metadata.contentEncoding).toBe('identity');
    expect(pack.metadata.size).toBeGreaterThan(0);

    // Verify blob is valid JSON
    expect(blob.type).toBe('application/json');

    // Verify filename contains pack name
    expect(filename).toMatch(/^my-pack-/);
    expect(filename).toMatch(/\.json$/);
  });

  it('returns blob that can be parsed as valid JSON', async () => {
    // Mock 20 approved questions
    const mockQuestions: ApprovedQuestion[] = Array.from({ length: 20 }, (_, i) => ({
      question: createMockQuestion(`q-${i}`),
      approvedAt: new Date().toISOString(),
    }));

    vi.mocked(getApprovedQuestions).mockReturnValue(mockQuestions);
    vi.mocked(getApprovedCountByCategory).mockReturnValue({
      blue: 20,
      pink: 0,
      yellow: 0,
      purple: 0,
      green: 0,
      orange: 0,
    });

    const { blob } = await exportPack('Test Pack', undefined, 'Author');

    // Verify blob is valid JSON by reading from FileReader
    // In jsdom, we can use FileReader to read the blob
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read blob'));
      reader.readAsText(blob);
    });

    const parsed = JSON.parse(text);

    // Verify structure
    expect(parsed).toHaveProperty('metadata');
    expect(parsed).toHaveProperty('questions');
    expect(parsed.questions).toHaveLength(20);
  });
});