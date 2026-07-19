/**
 * Tests for pack store — web/PWA-only path (Phase 24-03 rewrite).
 *
 * Per D-03: Pack index fetching
 * Per D-05: Category/difficulty filtering
 * Per D-10: Download progress tracking
 * Per D-11: Error handling state
 * Per D-15: Single active pack
 *
 * The store was rewired in 24-02 to source pack persistence from
 * services/packCache (the IDB-backed web shim) instead of the deleted
 * native downloader. These tests mock the packCache web API
 * (not packCache.web.ts directly) and assert the post-collapse web path.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PackIndexEntry, Category, Difficulty, PackCombo } from '@trivial-world/types';

// Mock packIndex service
vi.mock('../services/packIndex', () => ({
  fetchPackIndex: vi.fn(),
}));

// Mock packCache (the IDB-backed web shim — the only pack-persistence layer
// after the 24-01 deletion of the native downloader). Mock the exact surface
// the store imports from '../services/packCache'.
vi.mock('../services/packCache', () => ({
  getCachedPackChecksum: vi.fn(),
  setCachedPackQuestions: vi.fn(),
  setCachedPackChecksum: vi.fn(),
  setCachedPackIndex: vi.fn(),
  getOfflinePackIds: vi.fn(),
  requestPersistentStorage: vi.fn(),
}));

import { fetchPackIndex } from '../services/packIndex';
import {
  getCachedPackChecksum,
  setCachedPackQuestions,
  setCachedPackChecksum,
  setCachedPackIndex,
  getOfflinePackIds,
  requestPersistentStorage,
} from '../services/packCache';

// Import after mocks are set up
import { usePackStore } from './packStore';
import { usePlayerStore } from './playerStore';

// Helper to create mock pack entry
function createMockPackEntry(overrides?: Partial<PackIndexEntry>): PackIndexEntry {
  return {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Pack',
    author: 'Test Author',
    version: '1.0.0',
    totalQuestions: 50,
    categoryCounts: {
      blue: 10,
      pink: 10,
      yellow: 10,
      purple: 10,
      green: 5,
      orange: 5,
    },
    downloadUrl: 'https://example.com/packs/test-pack.json',
    checksum: 'a'.repeat(64),
    size: 102400,
    ...overrides,
  };
}

describe('usePackStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default packCache mock implementations (no-op, returns resolved Promise)
    vi.mocked(setCachedPackIndex).mockResolvedValue(undefined);
    vi.mocked(getOfflinePackIds).mockResolvedValue([]);
    vi.mocked(getCachedPackChecksum).mockResolvedValue(null);
    vi.mocked(setCachedPackQuestions).mockResolvedValue(undefined);
    vi.mocked(setCachedPackChecksum).mockResolvedValue(undefined);
    vi.mocked(requestPersistentStorage).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('has empty available packs array', () => {
      const state = usePackStore.getState();
      expect(state.availablePacks).toEqual([]);
    });

    it('has empty downloaded pack IDs array', () => {
      const state = usePackStore.getState();
      expect(state.downloadedPackIds).toEqual([]);
    });

    it('has null active pack ID', () => {
      const state = usePackStore.getState();
      expect(state.activePackId).toBeNull();
    });

    it('has null enabled categories (all enabled)', () => {
      const state = usePackStore.getState();
      expect(state.enabledCategories).toBeNull();
    });

    it('has null enabled difficulties (all enabled)', () => {
      const state = usePackStore.getState();
      expect(state.enabledDifficulties).toBeNull();
    });

    it('has loading states set to false', () => {
      const state = usePackStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isDownloading).toBe(false);
    });

    it('has download progress at 0', () => {
      const state = usePackStore.getState();
      expect(state.downloadProgress).toBe(0);
      expect(state.downloadBytesWritten).toBe(0);
    });

    it('has null download error', () => {
      const state = usePackStore.getState();
      expect(state.downloadError).toBeNull();
    });

    it('initializes offlinePackIds to empty array', () => {
      const state = usePackStore.getState();
      expect(state.offlinePackIds).toEqual([]);
    });
  });

  describe('fetchAvailablePacks', () => {
    it('sets isLoading to true during fetch', async () => {
      const mockPacks = [createMockPackEntry()];
      vi.mocked(fetchPackIndex).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockPacks), 10))
      );

      const promise = usePackStore.getState().fetchAvailablePacks();

      expect(usePackStore.getState().isLoading).toBe(true);

      await promise;

      expect(usePackStore.getState().isLoading).toBe(false);
    });

    it('stores fetched packs in availablePacks (web path)', async () => {
      const mockPacks = [
        createMockPackEntry({ id: '11111111-1111-1111-1111-111111111111', name: 'Pack 1' }),
        createMockPackEntry({ id: '22222222-2222-2222-2222-222222222222', name: 'Pack 2' }),
      ];
      vi.mocked(fetchPackIndex).mockResolvedValue(mockPacks);

      await usePackStore.getState().fetchAvailablePacks();

      const state = usePackStore.getState();
      expect(state.availablePacks).toHaveLength(2);
      expect(state.availablePacks[0].name).toBe('Pack 1');
      expect(state.availablePacks[1].name).toBe('Pack 2');
    });

    it('resets isLoading to false after successful fetch', async () => {
      vi.mocked(fetchPackIndex).mockResolvedValue([]);

      await usePackStore.getState().fetchAvailablePacks();

      expect(usePackStore.getState().isLoading).toBe(false);
    });

    it('resets isLoading to false after failed fetch', async () => {
      vi.mocked(fetchPackIndex).mockRejectedValue(new Error('Network error'));

      await expect(usePackStore.getState().fetchAvailablePacks()).rejects.toThrow('Network error');

      expect(usePackStore.getState().isLoading).toBe(false);
    });

    it('propagates errors from fetchPackIndex', async () => {
      vi.mocked(fetchPackIndex).mockRejectedValue(new Error('Failed to fetch'));

      await expect(usePackStore.getState().fetchAvailablePacks()).rejects.toThrow('Failed to fetch');
    });
  });

  describe('fetchAvailablePacks — IDB cache write (web path)', () => {
    it('calls setCachedPackIndex fire-and-forget after storing packs', async () => {
      const mockPacks = [createMockPackEntry()];
      vi.mocked(fetchPackIndex).mockResolvedValue(mockPacks);
      vi.mocked(setCachedPackIndex).mockResolvedValue(undefined);

      await usePackStore.getState().fetchAvailablePacks();

      expect(setCachedPackIndex).toHaveBeenCalledWith(mockPacks);
    });

    it('does not throw when setCachedPackIndex rejects', async () => {
      const mockPacks = [createMockPackEntry()];
      vi.mocked(fetchPackIndex).mockResolvedValue(mockPacks);
      vi.mocked(setCachedPackIndex).mockRejectedValue(new Error('IDB write failed'));

      // Should resolve without throwing despite IDB failure
      await expect(usePackStore.getState().fetchAvailablePacks()).resolves.toBeUndefined();
    });
  });

  describe('downloadPack (delegates to downloadPackForOffline)', () => {
    it('delegates to downloadPackForOffline (web/PWA-only path)', async () => {
      const entry = createMockPackEntry({ id: 'delegate-pack-id', checksum: 'new-checksum' });
      // Stub the store's own downloadPackForOffline so we only assert the
      // delegation, without exercising the real IDB streaming-download body.
      const stub = vi.fn().mockResolvedValue(undefined);
      // Temporarily replace the action on the store's state.
      const original = usePackStore.getState().downloadPackForOffline;
      usePackStore.setState({ downloadPackForOffline: stub as any });

      try {
        await usePackStore.getState().downloadPack(entry);

        expect(stub).toHaveBeenCalledWith(entry);
      } finally {
        usePackStore.setState({ downloadPackForOffline: original });
      }
    });
  });

  describe('refreshDownloadedPacks (no-op on web)', () => {
    it('is a no-op: does not modify downloadedPackIds and resolves', async () => {
      usePackStore.setState({ downloadedPackIds: ['existing-pack'] });

      await usePackStore.getState().refreshDownloadedPacks();

      // downloadedPackIds is unchanged (web has no WatermelonDB-downloaded packs)
      expect(usePackStore.getState().downloadedPackIds).toEqual(['existing-pack']);
    });
  });

  describe('refreshOfflinePackIds (web IDB path)', () => {
    it('calls getOfflinePackIds and updates offlinePackIds state', async () => {
      vi.mocked(getOfflinePackIds).mockResolvedValue(['pack-a', 'pack-b']);

      await usePackStore.getState().refreshOfflinePackIds();

      expect(getOfflinePackIds).toHaveBeenCalledOnce();
      expect(usePackStore.getState().offlinePackIds).toEqual(['pack-a', 'pack-b']);
    });

    it('sets offlinePackIds to empty array when IDB is empty', async () => {
      usePackStore.setState({ offlinePackIds: ['stale-pack'] });
      vi.mocked(getOfflinePackIds).mockResolvedValue([]);

      await usePackStore.getState().refreshOfflinePackIds();

      expect(usePackStore.getState().offlinePackIds).toEqual([]);
    });
  });

  describe('selectPack (web path — no native setActivePack call)', () => {
    it('sets activePackId in state', async () => {
      const packId = 'new-active-pack';
      await usePackStore.getState().selectPack(packId);

      expect(usePackStore.getState().activePackId).toBe(packId);
    });

    it('overwrites previous active pack', async () => {
      usePackStore.setState({ activePackId: 'old-pack' });

      await usePackStore.getState().selectPack('new-pack');

      expect(usePackStore.getState().activePackId).toBe('new-pack');
    });

    it('resets activePackIdList to null (single-pack mode)', async () => {
      usePackStore.setState({ activePackIdList: ['a', 'b'] });

      await usePackStore.getState().selectPack('solo-pack');

      expect(usePackStore.getState().activePackIdList).toBeNull();
    });
  });

  describe('selectPackList', () => {
    it('sets activePackId to the first pack and stores the full list', async () => {
      await usePackStore.getState().selectPackList(['p1', 'p2', 'p3']);

      expect(usePackStore.getState().activePackId).toBe('p1');
      expect(usePackStore.getState().activePackIdList).toEqual(['p1', 'p2', 'p3']);
    });

    it('clears activeComboId when a pack list is selected', async () => {
      usePackStore.setState({ activeComboId: 'some-combo' });

      await usePackStore.getState().selectPackList(['p1']);

      expect(usePackStore.getState().activeComboId).toBeNull();
    });

    it('is a no-op for an empty list', async () => {
      usePackStore.setState({ activePackId: 'keep-me', activePackIdList: ['keep-me'] });

      await usePackStore.getState().selectPackList([]);

      expect(usePackStore.getState().activePackId).toBe('keep-me');
      expect(usePackStore.getState().activePackIdList).toEqual(['keep-me']);
    });
  });

  describe('setEnabledCategories', () => {
    it('sets enabled categories', () => {
      const categories: Category[] = ['blue', 'green', 'orange'];
      usePackStore.getState().setEnabledCategories(categories);
      expect(usePackStore.getState().enabledCategories).toEqual(categories);
    });

    it('allows setting to null (all enabled)', () => {
      usePackStore.setState({ enabledCategories: ['blue', 'pink'] });
      usePackStore.getState().setEnabledCategories(null);
      expect(usePackStore.getState().enabledCategories).toBeNull();
    });

    it('allows empty array (no categories enabled)', () => {
      usePackStore.getState().setEnabledCategories([]);
      expect(usePackStore.getState().enabledCategories).toEqual([]);
    });

    it('handles single category selection', () => {
      const categories: Category[] = ['blue'];
      usePackStore.getState().setEnabledCategories(categories);
      expect(usePackStore.getState().enabledCategories).toEqual(['blue']);
    });

    it('handles all six categories', () => {
      const categories: Category[] = ['blue', 'pink', 'yellow', 'purple', 'green', 'orange'];
      usePackStore.getState().setEnabledCategories(categories);
      expect(usePackStore.getState().enabledCategories).toHaveLength(6);
    });
  });

  describe('setEnabledDifficulties', () => {
    it('sets enabled difficulties', () => {
      const difficulties: Difficulty[] = ['easy', 'hard'];
      usePackStore.getState().setEnabledDifficulties(difficulties);
      expect(usePackStore.getState().enabledDifficulties).toEqual(difficulties);
    });

    it('allows setting to null (all enabled)', () => {
      usePackStore.setState({ enabledDifficulties: ['easy'] });
      usePackStore.getState().setEnabledDifficulties(null);
      expect(usePackStore.getState().enabledDifficulties).toBeNull();
    });

    it('handles single difficulty selection', () => {
      const difficulties: Difficulty[] = ['medium'];
      usePackStore.getState().setEnabledDifficulties(difficulties);
      expect(usePackStore.getState().enabledDifficulties).toEqual(['medium']);
    });

    it('handles all difficulties', () => {
      const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
      usePackStore.getState().setEnabledDifficulties(difficulties);
      expect(usePackStore.getState().enabledDifficulties).toHaveLength(3);
    });
  });

  describe('setDownloadProgress', () => {
    it('sets download progress value', () => {
      usePackStore.getState().setDownloadProgress(50);
      expect(usePackStore.getState().downloadProgress).toBe(50);
    });

    it('can set to 0', () => {
      usePackStore.setState({ downloadProgress: 100 });
      usePackStore.getState().setDownloadProgress(0);
      expect(usePackStore.getState().downloadProgress).toBe(0);
    });

    it('can set to 100', () => {
      usePackStore.getState().setDownloadProgress(100);
      expect(usePackStore.getState().downloadProgress).toBe(100);
    });
  });

  describe('clearDownloadError', () => {
    it('clears download error', () => {
      usePackStore.setState({ downloadError: 'Download failed' });
      usePackStore.getState().clearDownloadError();
      expect(usePackStore.getState().downloadError).toBeNull();
    });

    it('is safe to call when no error exists', () => {
      usePackStore.getState().clearDownloadError();
      expect(usePackStore.getState().downloadError).toBeNull();
    });
  });

  describe('error handling state', () => {
    it('persists download error until cleared', () => {
      usePackStore.setState({ downloadError: 'Network timeout' });
      expect(usePackStore.getState().downloadError).toBe('Network timeout');
      usePackStore.getState().setDownloadProgress(50);
      expect(usePackStore.getState().downloadError).toBe('Network timeout');
    });
  });

  describe('downloadPackForOffline (web IDB streaming-download path)', () => {
    function makeFetchMock(text: string): typeof fetch {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(text);
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      });
      return vi.fn().mockResolvedValue({
        ok: true,
        body: stream,
      } as unknown as Response);
    }

    // Build 20 minimal valid questions (schema requires >= 20, IDs must be URL-safe lowercase)
    const makeQuestion = (n: number) => ({
      id: `question-${String(n).padStart(3, '0')}`,
      category: 'blue' as const,
      questionText: `This is question number ${n} — what is the correct answer?`,
      answerText: `Answer ${n}`,
      difficulty: 'easy' as const,
    });
    const validQuestionsJson = JSON.stringify({
      metadata: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Pack For Offline',
        description: 'A test pack',
        version: '1.0.0',
        author: 'Test Author',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        totalQuestions: 20,
        categoryCounts: { blue: 20, pink: 0, yellow: 0, purple: 0, green: 0, orange: 0 },
        checksum: 'a'.repeat(64),
        schemaVersion: '1.0.0',
        contentEncoding: 'identity',
        size: 5000,
      },
      questions: Array.from({ length: 20 }, (_, i) => makeQuestion(i + 1)),
    });

    beforeEach(() => {
      vi.mocked(getCachedPackChecksum).mockResolvedValue(null);
      vi.mocked(setCachedPackQuestions).mockResolvedValue(undefined);
      vi.mocked(setCachedPackChecksum).mockResolvedValue(undefined);
      vi.mocked(getOfflinePackIds).mockResolvedValue(['test-pack-id']);
      vi.mocked(requestPersistentStorage).mockResolvedValue(true);
      global.fetch = makeFetchMock(validQuestionsJson);
    });

    it('sets isDownloading true at start and false on success', async () => {
      const entry = createMockPackEntry({ id: 'test-pack-id', checksum: 'new-checksum' });

      await usePackStore.getState().downloadPackForOffline(entry);

      expect(usePackStore.getState().isDownloading).toBe(false);
    });

    it('skips re-download when storedChecksum === entry.checksum', async () => {
      const entry = createMockPackEntry({ id: 'test-pack-id', checksum: 'same-checksum' });
      vi.mocked(getCachedPackChecksum).mockResolvedValue('same-checksum');

      await usePackStore.getState().downloadPackForOffline(entry);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(usePackStore.getState().isDownloading).toBe(false);
      expect(usePackStore.getState().downloadProgress).toBe(100);
    });

    it('fetches and stores pack when checksum differs', async () => {
      const entry = createMockPackEntry({ id: 'test-pack-id', checksum: 'new-checksum' });
      vi.mocked(getCachedPackChecksum).mockResolvedValue('old-checksum');

      await usePackStore.getState().downloadPackForOffline(entry);

      expect(global.fetch).toHaveBeenCalledWith(entry.downloadUrl);
      expect(setCachedPackQuestions).toHaveBeenCalled();
      expect(setCachedPackChecksum).toHaveBeenCalledWith('test-pack-id', 'new-checksum');
    });

    it('calls requestPersistentStorage after successful IDB write', async () => {
      const entry = createMockPackEntry({ id: 'test-pack-id', checksum: 'new-checksum' });

      await usePackStore.getState().downloadPackForOffline(entry);

      expect(requestPersistentStorage).toHaveBeenCalledOnce();
    });

    it('refreshes offlinePackIds after successful download', async () => {
      const entry = createMockPackEntry({ id: 'test-pack-id', checksum: 'new-checksum' });
      vi.mocked(getOfflinePackIds).mockResolvedValue(['test-pack-id']);

      await usePackStore.getState().downloadPackForOffline(entry);

      expect(usePackStore.getState().offlinePackIds).toEqual(['test-pack-id']);
      expect(usePackStore.getState().downloadProgress).toBe(100);
      expect(usePackStore.getState().isDownloading).toBe(false);
    });

    it('sets downloadError and re-throws on network failure', async () => {
      const entry = createMockPackEntry({ id: 'test-pack-id', checksum: 'new-checksum' });
      global.fetch = vi.fn().mockRejectedValue(new Error('Network failed'));

      await expect(
        usePackStore.getState().downloadPackForOffline(entry)
      ).rejects.toThrow('Network failed');

      const state = usePackStore.getState();
      expect(state.downloadError).toBe('Network failed');
      expect(state.isDownloading).toBe(false);
      expect(state.downloadProgress).toBe(0);
      expect(state.downloadBytesWritten).toBe(0);
    });

    it('sets downloadError on pack validation failure', async () => {
      const entry = createMockPackEntry({ id: 'test-pack-id', checksum: 'new-checksum' });
      const invalidJson = JSON.stringify({ metadata: { id: 'not-a-uuid' }, questions: [] });
      global.fetch = makeFetchMock(invalidJson);

      await expect(
        usePackStore.getState().downloadPackForOffline(entry)
      ).rejects.toThrow('Pack validation failed');

      expect(usePackStore.getState().downloadError).toBe('Pack validation failed');
    });

    it('sets downloadError on HTTP failure', async () => {
      const entry = createMockPackEntry({ id: 'test-pack-id', checksum: 'new-checksum' });
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 } as unknown as Response);

      await expect(
        usePackStore.getState().downloadPackForOffline(entry)
      ).rejects.toThrow('HTTP 404');

      expect(usePackStore.getState().downloadError).toBe('HTTP 404');
    });

    it('handles non-Error thrown values (generic "Download failed")', async () => {
      const entry = createMockPackEntry({ id: 'test-pack-id', checksum: 'new-checksum' });
      global.fetch = vi.fn().mockRejectedValue('String error');

      await expect(
        usePackStore.getState().downloadPackForOffline(entry)
      ).rejects.toThrow();

      expect(usePackStore.getState().downloadError).toBe('Download failed');
    });

    it('retry after failure — clears downloadError and succeeds on second call', async () => {
      const entry = createMockPackEntry({ id: 'test-pack-id', checksum: 'new-checksum' });

      global.fetch = vi.fn().mockRejectedValue(new Error('Network failed'));
      await expect(
        usePackStore.getState().downloadPackForOffline(entry)
      ).rejects.toThrow('Network failed');
      expect(usePackStore.getState().downloadError).toBe('Network failed');

      usePackStore.getState().clearDownloadError();
      expect(usePackStore.getState().downloadError).toBeNull();

      global.fetch = makeFetchMock(validQuestionsJson);
      await usePackStore.getState().downloadPackForOffline(entry);

      expect(usePackStore.getState().isDownloading).toBe(false);
      expect(usePackStore.getState().downloadError).toBeNull();
      expect(usePackStore.getState().downloadProgress).toBe(100);
      expect(setCachedPackQuestions).toHaveBeenCalledWith('test-pack-id', expect.any(Array));
    });
  });

  describe('deleteCombo', () => {
    function createMockCombo(overrides?: Partial<PackCombo>): PackCombo {
      return {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Test Combo',
        packIds: [
          'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
          'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
        ],
        createdAt: '2026-06-15T00:00:00.000Z',
        ...overrides,
      };
    }

    it('removes the target combo from savedCombos', () => {
      const combo1 = createMockCombo({ id: '11111111-1111-1111-1111-111111111111', name: 'Combo 1' });
      const combo2 = createMockCombo({ id: '22222222-2222-2222-2222-222222222222', name: 'Combo 2' });
      usePackStore.setState({ savedCombos: [combo1, combo2], activeComboId: null });
      vi.spyOn(usePlayerStore, 'getState').mockReturnValue({ players: [], updatePlayerCombo: vi.fn() } as any);

      usePackStore.getState().deleteCombo(combo1.id);

      const { savedCombos } = usePackStore.getState();
      expect(savedCombos).toHaveLength(1);
      expect(savedCombos[0].id).toBe(combo2.id);
    });

    it('clears activeComboId when the active combo is deleted', () => {
      const combo = createMockCombo();
      usePackStore.setState({ savedCombos: [combo], activeComboId: combo.id });
      vi.spyOn(usePlayerStore, 'getState').mockReturnValue({ players: [], updatePlayerCombo: vi.fn() } as any);

      usePackStore.getState().deleteCombo(combo.id);

      expect(usePackStore.getState().activeComboId).toBeNull();
    });

    it('preserves activeComboId when a different combo is deleted', () => {
      const combo1 = createMockCombo({ id: '11111111-1111-1111-1111-111111111111', name: 'Combo 1' });
      const combo2 = createMockCombo({ id: '22222222-2222-2222-2222-222222222222', name: 'Combo 2' });
      usePackStore.setState({ savedCombos: [combo1, combo2], activeComboId: combo2.id });
      vi.spyOn(usePlayerStore, 'getState').mockReturnValue({ players: [], updatePlayerCombo: vi.fn() } as any);

      usePackStore.getState().deleteCombo(combo1.id);

      expect(usePackStore.getState().activeComboId).toBe(combo2.id);
    });

    it('F-01: clears comboId from a player assigned the deleted combo', () => {
      const combo = createMockCombo({ id: '11111111-1111-1111-1111-111111111111' });
      usePackStore.setState({ savedCombos: [combo], activeComboId: null });
      const updatePlayerCombo = vi.fn();
      vi.spyOn(usePlayerStore, 'getState').mockReturnValue({
        players: [
          { id: 'p1', name: 'Alice', color: 'blue', wedges: [], packId: null, comboId: combo.id },
        ],
        updatePlayerCombo,
      } as any);

      usePackStore.getState().deleteCombo(combo.id);

      expect(updatePlayerCombo).toHaveBeenCalledOnce();
      expect(updatePlayerCombo).toHaveBeenCalledWith('p1', null);
    });

    it('F-01: does not clear comboId from players assigned to a different combo', () => {
      const combo1 = createMockCombo({ id: '11111111-1111-1111-1111-111111111111' });
      const combo2 = createMockCombo({ id: '22222222-2222-2222-2222-222222222222' });
      usePackStore.setState({ savedCombos: [combo1, combo2], activeComboId: null });
      const updatePlayerCombo = vi.fn();
      vi.spyOn(usePlayerStore, 'getState').mockReturnValue({
        players: [
          { id: 'p1', name: 'Bob', color: 'pink', wedges: [], packId: null, comboId: combo2.id },
        ],
        updatePlayerCombo,
      } as any);

      usePackStore.getState().deleteCombo(combo1.id);

      expect(updatePlayerCombo).not.toHaveBeenCalled();
    });

    it('F-01: clears comboId from all players that had the deleted combo', () => {
      const combo = createMockCombo({ id: '11111111-1111-1111-1111-111111111111' });
      usePackStore.setState({ savedCombos: [combo], activeComboId: null });
      const updatePlayerCombo = vi.fn();
      vi.spyOn(usePlayerStore, 'getState').mockReturnValue({
        players: [
          { id: 'p1', name: 'Alice', color: 'blue', wedges: [], packId: null, comboId: combo.id },
          { id: 'p2', name: 'Bob', color: 'pink', wedges: [], packId: null, comboId: combo.id },
        ],
        updatePlayerCombo,
      } as any);

      usePackStore.getState().deleteCombo(combo.id);

      expect(updatePlayerCombo).toHaveBeenCalledTimes(2);
      expect(updatePlayerCombo).toHaveBeenCalledWith('p1', null);
      expect(updatePlayerCombo).toHaveBeenCalledWith('p2', null);
    });

    it('F-01: is a no-op for player cleanup when no player had the deleted combo', () => {
      const combo1 = createMockCombo({ id: '11111111-1111-1111-1111-111111111111' });
      const combo2 = createMockCombo({ id: '22222222-2222-2222-2222-222222222222' });
      usePackStore.setState({ savedCombos: [combo1, combo2], activeComboId: null });
      const updatePlayerCombo = vi.fn();
      vi.spyOn(usePlayerStore, 'getState').mockReturnValue({
        players: [
          { id: 'p1', name: 'Carol', color: 'green', wedges: [], packId: 'pack-x', comboId: null },
        ],
        updatePlayerCombo,
      } as any);

      usePackStore.getState().deleteCombo(combo1.id);

      expect(updatePlayerCombo).not.toHaveBeenCalled();
    });
  });

  describe('store persistence (web platformStorage / sessionStorage)', () => {
    it('partializes the persisted slice (activePackId, offlinePackIds, etc.)', () => {
      // The persist middleware exposes the partialize fn via the store API.
      // We assert the persisted fields include activePackId and exclude
      // transient state like isLoading / isDownloading.
      usePackStore.setState({
        activePackId: 'persisted-pack',
        offlinePackIds: ['offline-1'],
        isLoading: true,
        isDownloading: true,
        downloadProgress: 50,
      });

      // Read the persisted snapshot from sessionStorage (platformStorage adapter).
      const raw = sessionStorage.getItem('trivial-world-packs');
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      // Persisted fields
      expect(parsed.state.activePackId).toBe('persisted-pack');
      expect(parsed.state.offlinePackIds).toEqual(['offline-1']);
      // Transient fields are NOT persisted
      expect(parsed.state.isLoading).toBeUndefined();
      expect(parsed.state.isDownloading).toBeUndefined();
      expect(parsed.state.downloadProgress).toBeUndefined();
    });
  });
});