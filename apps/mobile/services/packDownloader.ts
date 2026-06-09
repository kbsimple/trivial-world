import { QuestionPackSchema, QuestionPack, PackIndexEntry, Category } from '@trivial-world/types';
import { database } from '../database';
import { QuestionPackModel } from '../database/models/QuestionPack';
import { QuestionModel } from '../database/models/Question';
import { verifyChecksum } from './checksum';
import { PACK_DOWNLOAD_TIMEOUT_MS } from '../constants/packConfig';

/**
 * Download progress information
 * Per D-10: Progress bar during download
 */
export interface DownloadProgress {
  bytesWritten: number;
  bytesTotal: number;
  percent: number;
}

/**
 * Progress callback type for download updates
 */
export type ProgressCallback = (progress: DownloadProgress) => void;

/**
 * Download a pack from URL with progress tracking
 * Per D-10: Progress bar during download
 * Per D-11: Error handling for download failures
 * Per D-12: Checksum verification
 * Per D-16: Store in WatermelonDB
 *
 * @param entry - Pack index entry with download URL and checksum
 * @param onProgress - Optional callback for progress updates
 * @returns Promise resolving to validated QuestionPack
 * @throws Error if download, validation, or storage fails
 */
export async function downloadPackWithProgress(
  entry: PackIndexEntry,
  onProgress?: ProgressCallback
): Promise<QuestionPack> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PACK_DOWNLOAD_TIMEOUT_MS);

  try {
    // D-10: Download with progress tracking
    const response = await fetch(entry.downloadUrl, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : entry.size;

    // Read response body with progress
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const chunks: Uint8Array[] = [];
    let bytesWritten = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      bytesWritten += value.length;

      if (onProgress) {
        onProgress({
          bytesWritten,
          bytesTotal: totalBytes,
          percent: Math.round((bytesWritten / totalBytes) * 100),
        });
      }
    }

    clearTimeout(timeoutId);

    // Combine chunks into string
    const content = new TextDecoder().decode(
      chunks.reduce((acc, chunk) => {
        const result = new Uint8Array(acc.length + chunk.length);
        result.set(acc);
        result.set(chunk, acc.length);
        return result;
      }, new Uint8Array(0))
    );

    // D-12: Checksum verification (silent on success, throws on mismatch)
    await verifyChecksum(content, entry.checksum);

    // Parse and validate with Zod
    const json = JSON.parse(content);
    const result = QuestionPackSchema.safeParse(json);

    if (!result.success) {
      throw new Error(`Pack validation failed: ${result.error.message}`);
    }

    const pack = result.data;

    // D-16: Store in WatermelonDB
    await database.write(async () => {
      // Create pack record
      const packRecord = await database.get('question_packs').create((p: QuestionPackModel) => {
        p.packId = pack.metadata.id;
        p.name = pack.metadata.name;
        p.description = pack.metadata.description || '';
        p.version = pack.metadata.version;
        p.author = pack.metadata.author;
        p.downloadedAt = Date.now();
        p.checksum = entry.checksum;
        p.isActive = false;
        p.categoryCounts = JSON.stringify(pack.metadata.categoryCounts);
        p.totalQuestions = pack.metadata.totalQuestions;
        p.schemaVersion = pack.metadata.schemaVersion;
      });

      // Bulk insert questions
      for (const q of pack.questions) {
        await database.get('questions').create((question: QuestionModel) => {
          question.questionPackId = packRecord.id;
          question.questionId = q.id;
          question.category = q.category;
          question.questionText = q.questionText;
          question.answerText = q.answerText;
          question.difficulty = q.difficulty || 'medium';
          question.choices = q.choices ? JSON.stringify(q.choices) : null;
          question.correctChoiceIndex = q.correctChoiceIndex || null;
          question.askedAt = null;
        });
      }
    });

    return pack;
  } catch (error) {
    clearTimeout(timeoutId);
    // D-11: Error handling for retry
    console.error('Pack download failed:', error);
    throw error;
  }
}

/**
 * Get downloaded pack IDs from database
 *
 * @returns Promise resolving to array of pack IDs
 */
export async function getDownloadedPackIds(): Promise<string[]> {
  const packs = await database.get('question_packs').query().fetch();
  return packs.map((p: QuestionPackModel) => p.packId);
}

/**
 * Get active pack from database (D-15: only one active at a time)
 *
 * @returns Promise resolving to active pack model or null
 */
export async function getActivePack(): Promise<QuestionPackModel | null> {
  const { Q } = await import('@nozbe/watermelondb');
  const packs = await database.get('question_packs')
    .query(Q.where('is_active', true))
    .fetch();
  return packs.length > 0 ? (packs[0] as QuestionPackModel) : null;
}

/**
 * Set active pack (deactivates others per D-15)
 *
 * @param packId - The pack ID to activate
 */
export async function setActivePack(packId: string): Promise<void> {
  const { Q } = await import('@nozbe/watermelondb');

  await database.write(async () => {
    // Deactivate all packs
    const allPacks = await database.get('question_packs').query().fetch();
    for (const pack of allPacks) {
      await (pack as QuestionPackModel).update((p) => {
        p.isActive = false;
      });
    }

    // Activate selected pack
    const targetPacks = await database.get('question_packs')
      .query(Q.where('pack_id', packId))
      .fetch();

    if (targetPacks.length > 0) {
      await (targetPacks[0] as QuestionPackModel).update((p) => {
        p.isActive = true;
      });
    }
  });
}