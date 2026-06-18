/**
 * Platform-guarded pack cache shim.
 * On web: delegates to packCache.web.ts (idb-keyval).
 * On native: returns no-ops — WatermelonDB handles native caching.
 *
 * Import this file everywhere. Never import packCache.web.ts directly
 * (except in web-specific tests).
 */
import { Platform } from 'react-native';
import type { Question, PackIndexEntry } from '@trivial-world/types';

// synchronous require inside Platform guard — prevents idb-keyval from
// entering the native Metro bundle at all
const impl = Platform.OS === 'web'
  ? require('./packCache.web')
  : null;

export const getCachedPackQuestions: (packId: string) => Promise<Question[] | null> =
  impl?.getCachedPackQuestions ?? (async () => null);

export const setCachedPackQuestions: (packId: string, questions: Question[]) => Promise<void> =
  impl?.setCachedPackQuestions ?? (async () => {});

export const getCachedPackChecksum: (packId: string) => Promise<string | null> =
  impl?.getCachedPackChecksum ?? (async () => null);

export const setCachedPackChecksum: (packId: string, checksum: string) => Promise<void> =
  impl?.setCachedPackChecksum ?? (async () => {});

export const getCachedPackIndex: () => Promise<PackIndexEntry[] | null> =
  impl?.getCachedPackIndex ?? (async () => null);

export const setCachedPackIndex: (packs: PackIndexEntry[]) => Promise<void> =
  impl?.setCachedPackIndex ?? (async () => {});

export const getOfflinePackIds: () => Promise<string[]> =
  impl?.getOfflinePackIds ?? (async () => []);

export const deleteCachedPack: (packId: string) => Promise<void> =
  impl?.deleteCachedPack ?? (async () => {});

export const requestPersistentStorage: () => Promise<boolean> =
  impl?.requestPersistentStorage ?? (async () => false);
