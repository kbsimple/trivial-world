import { PackIndexEntrySchema, PackIndexEntry } from '@trivial-world/types';
import { Platform } from 'react-native';
import { GENERATOR_PACK_INDEX_URL } from '../constants/packConfig';

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

    // Cache to IDB for offline use (web only — noop shim on native)
    if (Platform.OS === 'web') {
      const { setCachedPackIndex } = await import('./packCache.web');
      await setCachedPackIndex(validPacks);
    }
    return validPacks;
  } catch (error) {
    // Offline fallback: serve IDB-cached index (web only)
    if (Platform.OS === 'web') {
      const { getCachedPackIndex } = await import('./packCache.web');
      const cached = await getCachedPackIndex();
      if (cached) {
        console.warn('fetchPackIndex: offline — serving cached pack index from IDB');
        return cached;
      }
    }
    console.error('Error fetching pack index:', error);
    throw error;
  }
}