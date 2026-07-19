import { PackIndexEntrySchema, PackIndexEntry } from '@trivial-world/types';
import { GENERATOR_PACK_INDEX_URL } from '../constants/packConfig';
import { setCachedPackIndex, getCachedPackIndex } from './packCache';

/**
 * Pack index response from generator
 */
interface PackIndexResponse {
  packs: PackIndexEntry[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

/**
 * Fetch available packs from the generator index
 * Per D-03: Hardcoded URL, not user-configurable
 * Per CLOUD-03: Includes version info for update detection
 *
 * Web/PWA-only (Phase 24-02 collapse): the IDB write-through and offline
 * fallback are the sole code path — the former web-only branch is inlined
 * as the only path.
 *
 * @returns Promise resolving to array of validated pack entries
 * @throws Error if fetch fails or response is invalid
 */
export async function fetchPackIndex(): Promise<PackIndexEntry[]> {
  try {
    const response = await fetch(GENERATOR_PACK_INDEX_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch pack index: ${response.status} ${response.statusText}`);
    }

    const data: PackIndexResponse = await response.json();

    // Validate each pack entry with Zod
    // IN-02: Track invalid entries for debugging
    const validPacks: PackIndexEntry[] = [];
    const invalidPacks: { pack: unknown; error: string }[] = [];

    for (const pack of data.packs) {
      const result = PackIndexEntrySchema.safeParse(pack);
      if (result.success) {
        validPacks.push(result.data);
      } else {
        invalidPacks.push({ pack, error: result.error.message });
      }
    }

    if (invalidPacks.length > 0) {
      console.warn(`${invalidPacks.length} invalid pack entries skipped`);
      // Log details for debugging
      for (const { pack, error } of invalidPacks) {
        console.warn(`Invalid pack entry: ${error}`, pack);
      }
    }

    // Cache to IDB for offline use (write-through — sole path after 24-02 collapse)
    await setCachedPackIndex(validPacks);
    return validPacks;
  } catch (error) {
    // Offline fallback: serve IDB-cached index (sole path after 24-02 collapse)
    const cached = await getCachedPackIndex();
    if (cached) {
      console.warn('fetchPackIndex: offline — serving cached pack index from IDB');
      return cached;
    }
    console.error('Error fetching pack index:', error);
    throw error;
  }
}