/**
 * Tests for fetchPackIndex IDB write-through and offline fallback (Plan 23-03, Task 2)
 *
 * Strategy: mock fetch, packCache.web (dynamic import), Platform.OS to exercise:
 *   1. On success: setCachedPackIndex is called with validated packs
 *   2. On failure + web + IDB cache: returns cached packs without throwing
 *   3. On failure + web + no IDB cache: rethrows original error
 *   4. On failure + native: rethrows original error (native path unchanged)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted to declare variables accessible in vi.mock factories (hoisted to top of file)
const { mockPlatform } = vi.hoisted(() => ({
  mockPlatform: { OS: 'web' as string },
}));

// Mock Platform — factory references mockPlatform which is hoisted
vi.mock('react-native', () => ({
  Platform: mockPlatform,
}));

// Mock PackIndexEntrySchema from @trivial-world/types — vi.fn() inline to avoid hoisting
vi.mock('@trivial-world/types', async () => {
  const actual = await vi.importActual<typeof import('@trivial-world/types')>('@trivial-world/types');
  return {
    ...actual,
    PackIndexEntrySchema: {
      safeParse: vi.fn(),
    },
  };
});

// Mock packCache.web — used via dynamic import('./packCache.web') inside Platform guard
vi.mock('./packCache.web', () => ({
  setCachedPackIndex: vi.fn(),
  getCachedPackIndex: vi.fn(),
}));

// Mock packConfig constants
vi.mock('../constants/packConfig', () => ({
  GENERATOR_PACK_INDEX_URL: 'https://example.com/api/v1/packs.json',
}));

import { fetchPackIndex } from './packIndex';
import { PackIndexEntrySchema } from '@trivial-world/types';
import { setCachedPackIndex, getCachedPackIndex } from './packCache.web';
import type { PackIndexEntry } from '@trivial-world/types';

const mockSafeParse = vi.mocked(PackIndexEntrySchema.safeParse);
const mockSetCachedPackIndex = vi.mocked(setCachedPackIndex);
const mockGetCachedPackIndex = vi.mocked(getCachedPackIndex);

const mockPackEntry: PackIndexEntry = {
  id: 'pack-uuid-1',
  name: 'Test Pack',
  description: 'A test pack',
  version: '1.0.0',
  questionCount: 100,
  categories: ['blue', 'green'],
  difficulty: 'medium',
  downloadUrl: 'https://example.com/packs/pack-uuid-1.json',
  checksum: 'abc123',
  tags: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('fetchPackIndex (IDB write-through and offline fallback)', () => {
  beforeEach(() => {
    mockSafeParse.mockReset();
    mockSetCachedPackIndex.mockReset();
    mockGetCachedPackIndex.mockReset();
    mockPlatform.OS = 'web';
    // Default: safeParse succeeds
    mockSafeParse.mockReturnValue({ success: true, data: mockPackEntry } as ReturnType<typeof PackIndexEntrySchema.safeParse>);
    // Default: setCachedPackIndex resolves
    mockSetCachedPackIndex.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('success path — IDB write-through', () => {
    it('calls setCachedPackIndex with validated packs after a successful fetch', async () => {
      const responseData = { packs: [mockPackEntry] };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(responseData),
      }));

      await fetchPackIndex();

      expect(mockSetCachedPackIndex).toHaveBeenCalledWith([mockPackEntry]);
    });

    it('returns validated packs', async () => {
      const responseData = { packs: [mockPackEntry] };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(responseData),
      }));

      const result = await fetchPackIndex();

      expect(result).toEqual([mockPackEntry]);
    });

    it('does not call setCachedPackIndex on native platform', async () => {
      mockPlatform.OS = 'ios';
      const responseData = { packs: [mockPackEntry] };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(responseData),
      }));

      await fetchPackIndex();

      expect(mockSetCachedPackIndex).not.toHaveBeenCalled();
    });
  });

  describe('failure path — offline fallback (web)', () => {
    it('returns IDB cached packs without throwing when fetch fails and IDB has data', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      mockGetCachedPackIndex.mockResolvedValue([mockPackEntry]);

      const result = await fetchPackIndex();

      expect(result).toEqual([mockPackEntry]);
    });

    it('calls getCachedPackIndex in catch block on web platform', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      mockGetCachedPackIndex.mockResolvedValue([mockPackEntry]);

      await fetchPackIndex();

      expect(mockGetCachedPackIndex).toHaveBeenCalled();
    });

    it('throws original error when fetch fails and IDB is empty (no cache)', async () => {
      const networkError = new Error('Network error');
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(networkError));
      mockGetCachedPackIndex.mockResolvedValue(null);

      await expect(fetchPackIndex()).rejects.toThrow('Network error');
    });

    it('throws original error on native platform when fetch fails', async () => {
      mockPlatform.OS = 'ios';
      const networkError = new Error('Network error');
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(networkError));

      await expect(fetchPackIndex()).rejects.toThrow('Network error');
    });

    it('does not call getCachedPackIndex on native platform', async () => {
      mockPlatform.OS = 'ios';
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      await expect(fetchPackIndex()).rejects.toThrow();

      expect(mockGetCachedPackIndex).not.toHaveBeenCalled();
    });
  });
});
