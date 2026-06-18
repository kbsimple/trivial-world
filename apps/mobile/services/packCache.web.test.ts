/**
 * Unit tests for packCache.web.ts — idb-keyval IDB implementation.
 *
 * Imports packCache.web.ts directly (not the shim) because vitest's Rollup
 * resolver does not implement Metro platform extension priority, and the
 * react-native mock sets Platform.OS = 'ios' so the shim would return no-ops.
 *
 * idb-keyval is mocked with vi.mock() — no real IDB needed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock idb-keyval BEFORE importing packCache.web so the module-level
// createStore() call uses the mock.
vi.mock('idb-keyval', () => ({
  createStore: vi.fn(() => 'mock-store'),
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
}));

import {
  getCachedPackQuestions,
  setCachedPackQuestions,
  getCachedPackChecksum,
  setCachedPackChecksum,
  getCachedPackIndex,
  setCachedPackIndex,
  getOfflinePackIds,
  deleteCachedPack,
  requestPersistentStorage,
} from './packCache.web';

import { get, set, del, keys, createStore } from 'idb-keyval';

const mockGet = get as ReturnType<typeof vi.fn>;
const mockSet = set as ReturnType<typeof vi.fn>;
const mockDel = del as ReturnType<typeof vi.fn>;
const mockKeys = keys as ReturnType<typeof vi.fn>;
const mockCreateStore = createStore as ReturnType<typeof vi.fn>;

describe('packCache.web — idb-keyval IDB implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to defaults after clearing
    mockGet.mockResolvedValue(undefined);
    mockSet.mockResolvedValue(undefined);
    mockDel.mockResolvedValue(undefined);
    mockKeys.mockResolvedValue([]);
    mockCreateStore.mockReturnValue('mock-store');
  });

  describe('createStore initialization', () => {
    it('uses store name trivial-world-packs / pack-cache', () => {
      // createStore is called at module load time — verify it was called with correct args
      expect(mockCreateStore).toHaveBeenCalledWith('trivial-world-packs', 'pack-cache');
    });
  });

  describe('getCachedPackQuestions', () => {
    it('returns null when IDB has no entry for the given packId', async () => {
      mockGet.mockResolvedValue(undefined);
      const result = await getCachedPackQuestions('pack-x');
      expect(result).toBeNull();
    });

    it('returns Question[] after setCachedPackQuestions was called', async () => {
      const questions = [
        { id: 'q1', category: 'blue', questionText: 'Q?', answerText: 'A' },
      ];
      mockGet.mockResolvedValue(questions);
      const result = await getCachedPackQuestions('pack-x');
      expect(result).toEqual(questions);
    });

    it('calls get with correct key: pack:{packId}', async () => {
      await getCachedPackQuestions('my-pack');
      expect(mockGet).toHaveBeenCalledWith('pack:my-pack', 'mock-store');
    });
  });

  describe('setCachedPackQuestions', () => {
    it('calls set with correct key: pack:{packId}', async () => {
      const questions = [
        { id: 'q1', category: 'blue', questionText: 'Q?', answerText: 'A' },
      ];
      await setCachedPackQuestions('my-pack', questions);
      expect(mockSet).toHaveBeenCalledWith('pack:my-pack', questions, 'mock-store');
    });

    it('returns void (no value)', async () => {
      const result = await setCachedPackQuestions('my-pack', []);
      expect(result).toBeUndefined();
    });
  });

  describe('getCachedPackChecksum', () => {
    it('returns null initially when IDB has no checksum', async () => {
      mockGet.mockResolvedValue(undefined);
      const result = await getCachedPackChecksum('pack-x');
      expect(result).toBeNull();
    });

    it('returns the stored checksum string after setCachedPackChecksum', async () => {
      mockGet.mockResolvedValue('abc123');
      const result = await getCachedPackChecksum('pack-x');
      expect(result).toBe('abc123');
    });

    it('calls get with correct key: pack-checksum:{packId}', async () => {
      await getCachedPackChecksum('my-pack');
      expect(mockGet).toHaveBeenCalledWith('pack-checksum:my-pack', 'mock-store');
    });
  });

  describe('setCachedPackChecksum', () => {
    it('calls set with correct key: pack-checksum:{packId}', async () => {
      await setCachedPackChecksum('my-pack', 'sha256abc');
      expect(mockSet).toHaveBeenCalledWith('pack-checksum:my-pack', 'sha256abc', 'mock-store');
    });
  });

  describe('getCachedPackIndex', () => {
    it('returns null initially when IDB has no pack-index entry', async () => {
      mockGet.mockResolvedValue(undefined);
      const result = await getCachedPackIndex();
      expect(result).toBeNull();
    });

    it('returns PackIndexEntry[] after setCachedPackIndex was called', async () => {
      const index = [{ id: 'p1', name: 'Pack 1', version: '1.0' }];
      mockGet.mockResolvedValue(index);
      const result = await getCachedPackIndex();
      expect(result).toEqual(index);
    });

    it('calls get with the fixed key: pack-index', async () => {
      await getCachedPackIndex();
      expect(mockGet).toHaveBeenCalledWith('pack-index', 'mock-store');
    });
  });

  describe('setCachedPackIndex', () => {
    it('calls set with key: pack-index', async () => {
      const index = [{ id: 'p1', name: 'Pack 1' }];
      await setCachedPackIndex(index as any);
      expect(mockSet).toHaveBeenCalledWith('pack-index', index, 'mock-store');
    });
  });

  describe('getOfflinePackIds', () => {
    it('returns [] when IDB is empty', async () => {
      mockKeys.mockResolvedValue([]);
      const result = await getOfflinePackIds();
      expect(result).toEqual([]);
    });

    it('returns pack IDs after setCachedPackQuestions was called for those packs', async () => {
      mockKeys.mockResolvedValue(['pack:p1', 'pack:p2']);
      const result = await getOfflinePackIds();
      expect(result).toEqual(expect.arrayContaining(['p1', 'p2']));
      expect(result).toHaveLength(2);
    });

    it('does NOT include pack-checksum:{id} entries', async () => {
      mockKeys.mockResolvedValue(['pack:p1', 'pack-checksum:p1']);
      const result = await getOfflinePackIds();
      expect(result).toEqual(['p1']);
      expect(result).not.toContain('pack-checksum:p1');
    });

    it('does NOT include the pack-index key', async () => {
      mockKeys.mockResolvedValue(['pack:p1', 'pack-index']);
      const result = await getOfflinePackIds();
      expect(result).toEqual(['p1']);
    });

    it('strips the pack: prefix returning only the packId', async () => {
      mockKeys.mockResolvedValue(['pack:trivial-world-starter-7f3a9c2e']);
      const result = await getOfflinePackIds();
      expect(result).toEqual(['trivial-world-starter-7f3a9c2e']);
    });
  });

  describe('deleteCachedPack', () => {
    it('deletes both pack:{packId} and pack-checksum:{packId} from IDB', async () => {
      await deleteCachedPack('p1');
      expect(mockDel).toHaveBeenCalledWith('pack:p1', 'mock-store');
      expect(mockDel).toHaveBeenCalledWith('pack-checksum:p1', 'mock-store');
      expect(mockDel).toHaveBeenCalledTimes(2);
    });
  });

  describe('requestPersistentStorage', () => {
    it('returns false when navigator.storage is not available', async () => {
      // In jsdom, navigator.storage may not have persist() — simulate missing
      const originalStorage = (global.navigator as any).storage;
      Object.defineProperty(global.navigator, 'storage', {
        value: undefined,
        configurable: true,
      });

      const result = await requestPersistentStorage();
      expect(result).toBe(false);

      // Restore
      Object.defineProperty(global.navigator, 'storage', {
        value: originalStorage,
        configurable: true,
      });
    });

    it('calls navigator.storage.persist() when available and returns its result', async () => {
      const mockPersist = vi.fn().mockResolvedValue(true);
      Object.defineProperty(global.navigator, 'storage', {
        value: { persist: mockPersist },
        configurable: true,
      });

      const result = await requestPersistentStorage();
      expect(mockPersist).toHaveBeenCalledOnce();
      expect(result).toBe(true);

      // Restore
      Object.defineProperty(global.navigator, 'storage', {
        value: undefined,
        configurable: true,
      });
    });
  });
});
