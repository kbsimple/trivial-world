import { Platform } from 'react-native';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { platformStorage } from '../services/platformStorage';
import { PackIndexEntry, Category, Difficulty, PackCombo } from '@trivial-world/types';
import { fetchPackIndex } from '../services/packIndex';
import { downloadPackWithProgress, getDownloadedPackIds, setActivePack } from '../services/packDownloader';
import { getOfflinePackIds, setCachedPackIndex } from '../services/packCache';
import { usePlayerStore } from './playerStore';

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
  // Dynamic multi-pack selection (set when user picks 2+ packs without naming a combo)
  activePackIdList: string[] | null; // null = single-pack mode (use activePackId)
  // User-created combos (blend of multiple packs), persisted
  savedCombos: PackCombo[];
  // Currently active combo for game-level selection (null = single pack via activePackId)
  activeComboId: string | null;
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

  // Web-only: IDs of packs cached in IndexedDB (separate from native downloadedPackIds)
  offlinePackIds: string[];

  // Actions
  fetchAvailablePacks: () => Promise<void>;
  downloadPack: (entry: PackIndexEntry) => Promise<void>;
  downloadPackForOffline: (entry: PackIndexEntry) => Promise<void>;
  refreshDownloadedPacks: () => Promise<void>;
  refreshOfflinePackIds: () => Promise<void>;
  selectPack: (packId: string) => Promise<void>;
  selectPackList: (packIds: string[]) => Promise<void>;
  createCombo: (name: string, packIds: string[]) => void;
  deleteCombo: (comboId: string) => void;
  selectCombo: (comboId: string | null) => void;
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
      activePackIdList: null,
      savedCombos: [],
      activeComboId: null,
      enabledCategories: null, // null = all categories enabled
      enabledDifficulties: null, // null = all difficulties enabled
      isLoading: false,
      isDownloading: false,
      downloadProgress: 0,
      downloadBytesWritten: 0,
      downloadError: null,
      offlinePackIds: [],

      fetchAvailablePacks: async () => {
        set({ isLoading: true });
        try {
          const packs = await fetchPackIndex();
          set({ availablePacks: packs, isLoading: false });
          // Cache index to IDB for offline use (fire-and-forget — noop on native)
          setCachedPackIndex(packs).catch(err =>
            console.warn('fetchAvailablePacks: failed to cache pack index:', err)
          );
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

      downloadPackForOffline: async (_entry: PackIndexEntry) => {
        // Implementation added in Task 2
        throw new Error('downloadPackForOffline not yet implemented');
      },

      refreshDownloadedPacks: async () => {
        if (Platform.OS === 'web') return;
        const downloadedIds = await getDownloadedPackIds();
        set({ downloadedPackIds: downloadedIds });
      },

      refreshOfflinePackIds: async () => {
        const offlineIds = await getOfflinePackIds();
        set({ offlinePackIds: offlineIds });
      },

      selectPack: async (packId: string) => {
        if (Platform.OS !== 'web') {
          await setActivePack(packId);
        }
        set({ activePackId: packId, activePackIdList: null });
      },

      selectPackList: async (packIds: string[]) => {
        if (packIds.length === 0) return;
        if (Platform.OS !== 'web') {
          await setActivePack(packIds[0]);
        }
        set({ activePackId: packIds[0], activePackIdList: packIds, activeComboId: null });
      },

      createCombo: (name: string, packIds: string[]) => {
        const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : `combo-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        const combo: PackCombo = { id, name, packIds, createdAt: new Date().toISOString() };
        set((state) => ({ savedCombos: [...state.savedCombos, combo] }));
      },

      deleteCombo: (comboId: string) => {
        set((state) => ({
          savedCombos: state.savedCombos.filter(c => c.id !== comboId),
          activeComboId: state.activeComboId === comboId ? null : state.activeComboId,
        }));
        // F-01: clear stale comboId from any player that had this combo assigned
        const { players, updatePlayerCombo } = usePlayerStore.getState();
        players
          .filter((p) => p.comboId === comboId)
          .forEach((p) => updatePlayerCombo(p.id, null));
      },

      selectCombo: (comboId: string | null) => set({ activeComboId: comboId }),

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
        offlinePackIds: state.offlinePackIds,
        activePackId: state.activePackId,
        activePackIdList: state.activePackIdList,
        enabledCategories: state.enabledCategories,
        enabledDifficulties: state.enabledDifficulties,
        savedCombos: state.savedCombos,
        activeComboId: state.activeComboId,
      }),
    }
  )
);