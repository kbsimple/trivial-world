/**
 * Pack cache shim — web/PWA-only (Phase 24-02 collapse).
 *
 * Delegates unconditionally to packCache.web.ts (idb-keyval IndexedDB).
 * The native WatermelonDB cache path was removed in 24-01; this file is
 * now a thin re-export so callers import a single canonical module
 * (`./packCache`) regardless of platform.
 *
 * Import this file everywhere. Never import packCache.web.ts directly
 * (except in web-specific tests).
 */
export {
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