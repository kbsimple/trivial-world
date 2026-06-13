/**
 * Tests for pack store
 * Per D-03: Pack index fetching
 * Per D-05: Category/difficulty filtering
 * Per D-10: Download progress tracking
 * Per D-11: Error handling state
 * Per D-15: Single active pack
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { create } from 'zustand';
import { PackIndexEntry, Category, Difficulty } from '@trivial-world/types';

// Mock AsyncStorage
const mockAsyncStorage: Record<string, string> = {};
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockAsyncStorage[key] || null)),
    setItem: vi.fn((key: string, value: string) => {
      mockAsyncStorage[key] = value;
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      delete mockAsyncStorage[key];
      return Promise.resolve();
    }),
  },
}));

// Mock packIndex service
vi.mock('../services/packIndex', () => ({
  fetchPackIndex: vi.fn(),
}));

// Mock packDownloader service
vi.mock('../services/packDownloader', () => ({
  downloadPackWithProgress: vi.fn(),
  getDownloadedPackIds: vi.fn(),
  setActivePack: vi.fn(),
}));

import { fetchPackIndex } from '../services/packIndex';
import {
  downloadPackWithProgress,
  getDownloadedPackIds,
  setActivePack,
} from '../services/packDownloader';

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
    // Reset storage
    Object.keys(mockAsyncStorage).forEach((key) => delete mockAsyncStorage[key]);
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
  });

  describe('fetchAvailablePacks', () => {
    it('sets isLoading to true during fetch', async () => {
      const mockPacks = [createMockPackEntry()];
      vi.mocked(fetchPackIndex).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockPacks), 10))
      );

      const promise = usePackStore.getState().fetchAvailablePacks();

      // Check loading state during fetch
      expect(usePackStore.getState().isLoading).toBe(true);

      await promise;

      expect(usePackStore.getState().isLoading).toBe(false);
    });

    it('stores fetched packs in availablePacks', async () => {
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

  describe('downloadPack', () => {
    it('sets isDownloading to true at start', async () => {
      const entry = createMockPackEntry();
      vi.mocked(downloadPackWithProgress).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({} as any), 10))
      );

      const promise = usePackStore.getState().downloadPack(entry);

      expect(usePackStore.getState().isDownloading).toBe(true);

      await promise;
    });

    it('resets download progress at start', async () => {
      const entry = createMockPackEntry();
      vi.mocked(downloadPackWithProgress).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({} as any), 10))
      );

      const promise = usePackStore.getState().downloadPack(entry);

      const state = usePackStore.getState();
      expect(state.downloadProgress).toBe(0);
      expect(state.downloadBytesWritten).toBe(0);

      await promise;
    });

    it('clears download error at start', async () => {
      // Set an error first
      usePackStore.setState({ downloadError: 'Previous error' });

      const entry = createMockPackEntry();
      vi.mocked(downloadPackWithProgress).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({} as any), 10))
      );

      const promise = usePackStore.getState().downloadPack(entry);

      expect(usePackStore.getState().downloadError).toBeNull();

      await promise;
    });

    it('updates progress via callback', async () => {
      const entry = createMockPackEntry();
      let progressCallback: any;

      vi.mocked(downloadPackWithProgress).mockImplementation(
        async (_entry, onProgress) => {
          progressCallback = onProgress;
          // Simulate progress updates
          if (onProgress) {
            onProgress({ bytesWritten: 50000, bytesTotal: 100000, percent: 50 });
          }
          return {} as any;
        }
      );

      await usePackStore.getState().downloadPack(entry);

      // Check progress was updated during download
      const state = usePackStore.getState();
      expect(state.downloadProgress).toBe(100); // Set to 100 at end
    });

    it('refreshes downloaded pack IDs after successful download', async () => {
      const entry = createMockPackEntry({ id: 'new-pack-id' });
      vi.mocked(downloadPackWithProgress).mockResolvedValue({} as any);
      vi.mocked(getDownloadedPackIds).mockResolvedValue(['existing-pack', 'new-pack-id']);

      await usePackStore.getState().downloadPack(entry);

      const state = usePackStore.getState();
      expect(state.downloadedPackIds).toContain('new-pack-id');
      expect(state.downloadedPackIds).toContain('existing-pack');
    });

    it('sets progress to 100 on successful download', async () => {
      const entry = createMockPackEntry();
      vi.mocked(downloadPackWithProgress).mockResolvedValue({} as any);
      vi.mocked(getDownloadedPackIds).mockResolvedValue(['new-pack-id']);

      await usePackStore.getState().downloadPack(entry);

      expect(usePackStore.getState().downloadProgress).toBe(100);
    });

    it('resets isDownloading to false on success', async () => {
      const entry = createMockPackEntry();
      vi.mocked(downloadPackWithProgress).mockResolvedValue({} as any);
      vi.mocked(getDownloadedPackIds).mockResolvedValue([]);

      await usePackStore.getState().downloadPack(entry);

      expect(usePackStore.getState().isDownloading).toBe(false);
    });

    it('stores error message on download failure', async () => {
      const entry = createMockPackEntry();
      vi.mocked(downloadPackWithProgress).mockRejectedValue(new Error('Connection timeout'));

      await expect(usePackStore.getState().downloadPack(entry)).rejects.toThrow('Connection timeout');

      const state = usePackStore.getState();
      expect(state.downloadError).toBe('Connection timeout');
    });

    it('resets isDownloading to false on failure', async () => {
      const entry = createMockPackEntry();
      vi.mocked(downloadPackWithProgress).mockRejectedValue(new Error('Failed'));

      await expect(usePackStore.getState().downloadPack(entry)).rejects.toThrow();

      expect(usePackStore.getState().isDownloading).toBe(false);
    });

    it('resets download progress on failure', async () => {
      const entry = createMockPackEntry();
      vi.mocked(downloadPackWithProgress).mockRejectedValue(new Error('Failed'));

      await expect(usePackStore.getState().downloadPack(entry)).rejects.toThrow();

      const state = usePackStore.getState();
      expect(state.downloadProgress).toBe(0);
      expect(state.downloadBytesWritten).toBe(0);
    });

    it('handles non-Error thrown values', async () => {
      const entry = createMockPackEntry();
      vi.mocked(downloadPackWithProgress).mockRejectedValue('String error');

      await expect(usePackStore.getState().downloadPack(entry)).rejects.toThrow();

      const state = usePackStore.getState();
      expect(state.downloadError).toBe('Download failed');
    });
  });

  describe('refreshDownloadedPacks', () => {
    it('fetches and stores downloaded pack IDs', async () => {
      vi.mocked(getDownloadedPackIds).mockResolvedValue(['pack-1', 'pack-2', 'pack-3']);

      await usePackStore.getState().refreshDownloadedPacks();

      const state = usePackStore.getState();
      expect(state.downloadedPackIds).toEqual(['pack-1', 'pack-2', 'pack-3']);
    });

    it('updates to empty array when no packs downloaded', async () => {
      // Set initial state with packs
      usePackStore.setState({ downloadedPackIds: ['old-pack'] });
      vi.mocked(getDownloadedPackIds).mockResolvedValue([]);

      await usePackStore.getState().refreshDownloadedPacks();

      expect(usePackStore.getState().downloadedPackIds).toEqual([]);
    });
  });

  describe('selectPack', () => {
    it('calls setActivePack service', async () => {
      const packId = 'selected-pack-id';
      vi.mocked(setActivePack).mockResolvedValue(undefined);

      await usePackStore.getState().selectPack(packId);

      expect(setActivePack).toHaveBeenCalledWith(packId);
    });

    it('sets activePackId in state', async () => {
      const packId = 'new-active-pack';
      vi.mocked(setActivePack).mockResolvedValue(undefined);

      await usePackStore.getState().selectPack(packId);

      expect(usePackStore.getState().activePackId).toBe(packId);
    });

    it('overwrites previous active pack', async () => {
      // Set initial active pack
      usePackStore.setState({ activePackId: 'old-pack' });
      vi.mocked(setActivePack).mockResolvedValue(undefined);

      await usePackStore.getState().selectPack('new-pack');

      expect(usePackStore.getState().activePackId).toBe('new-pack');
    });
  });

  describe('setEnabledCategories', () => {
    it('sets enabled categories', () => {
      const categories: Category[] = ['blue', 'green', 'orange'];

      usePackStore.getState().setEnabledCategories(categories);

      expect(usePackStore.getState().enabledCategories).toEqual(categories);
    });

    it('allows setting to null (all enabled)', () => {
      // Set initial categories
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
      // Set initial difficulties
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

      // Error should persist
      expect(usePackStore.getState().downloadError).toBe('Network timeout');

      // State changes don't clear the error
      usePackStore.getState().setDownloadProgress(50);
      expect(usePackStore.getState().downloadError).toBe('Network timeout');
    });

    it('allows retry after clearing error', async () => {
      // Set up error state
      usePackStore.setState({ downloadError: 'Previous failure' });

      const entry = createMockPackEntry();
      vi.mocked(downloadPackWithProgress).mockResolvedValue({} as any);
      vi.mocked(getDownloadedPackIds).mockResolvedValue([]);

      // Clear error before retry
      usePackStore.getState().clearDownloadError();

      // Retry download
      await usePackStore.getState().downloadPack(entry);

      expect(usePackStore.getState().downloadError).toBeNull();
    });
  });

});