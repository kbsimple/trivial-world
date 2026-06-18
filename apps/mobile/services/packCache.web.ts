/**
 * Web-only IndexedDB pack cache using idb-keyval.
 * Never import this file directly on native — use packCache.ts shim instead.
 *
 * IDB store: 'trivial-world-packs' / 'pack-cache'
 * Key scheme:
 *   'pack:{packId}'           → Question[]  (parsed, ready to use)
 *   'pack-checksum:{packId}'  → string      (for update detection)
 *   'pack-index'              → PackIndexEntry[]
 */
import { get, set, del, keys, createStore } from 'idb-keyval';
import type { Question, PackIndexEntry } from '@trivial-world/types';

// Named store — avoids collision with idb-keyval defaults on shared localhost
const packStore = createStore('trivial-world-packs', 'pack-cache');

export async function getCachedPackQuestions(packId: string): Promise<Question[] | null> {
  return (await get<Question[]>(`pack:${packId}`, packStore)) ?? null;
}

export async function setCachedPackQuestions(packId: string, questions: Question[]): Promise<void> {
  await set(`pack:${packId}`, questions, packStore);
}

export async function getCachedPackChecksum(packId: string): Promise<string | null> {
  return (await get<string>(`pack-checksum:${packId}`, packStore)) ?? null;
}

export async function setCachedPackChecksum(packId: string, checksum: string): Promise<void> {
  await set(`pack-checksum:${packId}`, checksum, packStore);
}

export async function getCachedPackIndex(): Promise<PackIndexEntry[] | null> {
  return (await get<PackIndexEntry[]>('pack-index', packStore)) ?? null;
}

export async function setCachedPackIndex(packs: PackIndexEntry[]): Promise<void> {
  await set('pack-index', packs, packStore);
}

export async function getOfflinePackIds(): Promise<string[]> {
  const allKeys = await keys(packStore);
  // Only 'pack:{id}' keys — exclude 'pack-checksum:{id}' entries
  return (allKeys as string[])
    .filter(k => typeof k === 'string' && k.startsWith('pack:') && !k.startsWith('pack-checksum:'))
    .map(k => k.replace('pack:', ''));
}

export async function deleteCachedPack(packId: string): Promise<void> {
  await del(`pack:${packId}`, packStore);
  await del(`pack-checksum:${packId}`, packStore);
}

export async function requestPersistentStorage(): Promise<boolean> {
  if ('storage' in navigator && navigator.storage != null && 'persist' in navigator.storage) {
    return navigator.storage.persist();
  }
  return false;
}
