/**
 * Storage adapter for the web/PWA app.
 * Uses sessionStorage for session-only persistence (D-06).
 *
 * This is the sole storage adapter after the v12.0 native build-path removal
 * (the former platformStorage.native.ts / AsyncStorage path was deleted).
 */
export const platformStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return sessionStorage.getItem(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    sessionStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    sessionStorage.removeItem(name);
  },
};