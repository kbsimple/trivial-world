import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Platform-aware storage interface for Zustand persist middleware
 * Per D-04: AsyncStorage on mobile, sessionStorage on web
 * Per D-06: Session-only storage on web (no IndexedDB)
 */
interface Storage {
  getItem: (name: string) => Promise<string | null>;
  setItem: (name: string, value: string) => Promise<void>;
  removeItem: (name: string) => Promise<void>;
}

/**
 * Create platform-specific storage adapter
 * - Mobile: AsyncStorage (persistent)
 * - Web: sessionStorage (session-only, clears on tab close per D-06)
 */
function createPlatformStorage(): Storage {
  if (Platform.OS === 'web') {
    // Web: Use sessionStorage for session-only persistence (D-06)
    return {
      getItem: async (name: string) => {
        return sessionStorage.getItem(name);
      },
      setItem: async (name: string, value: string) => {
        sessionStorage.setItem(name, value);
      },
      removeItem: async (name: string) => {
        sessionStorage.removeItem(name);
      },
    };
  }

  // Mobile: Use AsyncStorage (persistent)
  return AsyncStorage;
}

/**
 * Singleton storage instance
 * Use with Zustand's createJSONStorage:
 * storage: createJSONStorage(() => platformStorage)
 */
export const platformStorage = createPlatformStorage();