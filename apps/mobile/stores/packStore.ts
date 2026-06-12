import { Platform } from 'react-native';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { platformStorage } from '../services/platformStorage';
import { PackIndexEntry, Category, Difficulty } from '@trivial-world/types';
import { fetchPackIndex } from '../services/packIndex';
import { downloadPackWithProgress, getDownloadedPackIds, setActivePack } from '../services/packDownloader';

/**
 * Pack store state
 * Per CONTEXT.md: Pack selection, category/difficulty filtering, download state
 */
interface PackState {
  // Available packs from index (D-03: fetched from hardcoded URL)
  availablePacks: PackIndexEntry[];
  // IDs of downloaded packs (in WatermelonDB)
  downloadedPackIds: string[];
  // Currently active pack for gameplay (D-15: only one active)
  activePackId: string | null;
  // Category filter (D-05: before game start)
  enabledCategories: Category[] | null; // null = all enabled
  // Difficulty filter (D-06: optional pre-game setting)
  enabledDifficulties: Difficulty[] | null; // null = all enabled
  // Loading states
  isLoading: boolean;
  isDownloading: boolean;
  downloadProgress: number; // 0-100
  downloadBytesWritten: number; // Actual bytes downloaded
  downloadError: string | null;

  // Actions
  fetchAvailablePacks: () => Promise<void>;
  downloadPack: (entry: PackIndexEntry) => Promise<void>;
  refreshDownloadedPacks: () => Promise<void>;
  selectPack: (packId: string) => Promise<void>;
  setEnabledCategories: (categories: Category[] | null) => void;
  setEnabledDifficulties: (difficulties: Difficulty[] | null) => void;
  setDownloadProgress: (progress: number) => void;
  clearDownloadError: () => void;
}

export const usePackStore = create<PackState>()(
  persist(
    (set, get) => ({
      availablePacks: [],
      downloadedPackIds: [],
      activePackId: null,
      enabledCategories: null, // null = all categories enabled
      enabledDifficulties: null, // null = all difficulties enabled
      isLoading: false,
      isDownloading: false,
      downloadProgress: 0,
      downloadBytesWritten: 0,
      downloadError: null,

      fetchAvailablePacks: async () => {
        set({ isLoading: true });
        try {
          const packs = await fetchPackIndex();
          set({ availablePacks: packs, isLoading: false });
        } catch (error) {
          console.error('Failed to fetch pack index:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      downloadPack: async (entry: PackIndexEntry) => {
        set({ isDownloading: true, downloadProgress: 0, downloadBytesWritten: 0, downloadError: null });
        try {
          await downloadPackWithProgress(entry, (progress) => {
            set({ downloadProgress: progress.percent, downloadBytesWritten: progress.bytesWritten });
          });

          // Refresh downloaded pack IDs
          const downloadedIds = await getDownloadedPackIds();
          set({
            downloadedPackIds: downloadedIds,
            isDownloading: false,
            downloadProgress: 100,
          });
        } catch (error) {
          // D-11: Store error for retry UI
          const errorMessage = error instanceof Error ? error.message : 'Download failed';
          set({
            isDownloading: false,
            downloadProgress: 0,
            downloadBytesWritten: 0,
            downloadError: errorMessage,
          });
          throw error;
        }
      },

      refreshDownloadedPacks: async () => {
        if (Platform.OS === 'web') return;
        const downloadedIds = await getDownloadedPackIds();
        set({ downloadedPackIds: downloadedIds });
      },

      selectPack: async (packId: string) => {
        // D-15: Only one active pack at a time
        // On web, Zustand's persist middleware handles storage; WatermelonDB is mobile-only
        if (Platform.OS !== 'web') {
          await setActivePack(packId);
        }
        set({ activePackId: packId });
      },

      setEnabledCategories: (categories: Category[] | null) => {
        set({ enabledCategories: categories });
      },

      setEnabledDifficulties: (difficulties: Difficulty[] | null) => {
        set({ enabledDifficulties: difficulties });
      },

      setDownloadProgress: (progress: number) => {
        set({ downloadProgress: progress });
      },

      clearDownloadError: () => {
        set({ downloadError: null });
      },
    }),
    {
      name: 'trivial-world-packs',
      storage: createJSONStorage(() => platformStorage),
      partialize: (state) => ({
        downloadedPackIds: state.downloadedPackIds,
        activePackId: state.activePackId,
        enabledCategories: state.enabledCategories,
        enabledDifficulties: state.enabledDifficulties,
      }),
    }
  )
);