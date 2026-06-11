/**
 * Platform-specific storage for web
 * Uses sessionStorage for session-only persistence (D-06)
 *
 * NOTE: This file is used ONLY on web. React Native uses platformStorage.native.ts
 * which imports AsyncStorage. This separation prevents bundling native modules on web.
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