/**
 * Pack export utility with checksum calculation
 * Per D-03: UUID-based pack identifiers
 * Per D-05: Schema version '1.0.0'
 * Per D-18: Manual JSON download for approved packs
 * Per D-19: Pack files use .json extension
 */

import type { Question, QuestionPack, PackMetadata, Category } from '@trivial-world/types';
import { QuestionPackSchema } from '@trivial-world/types';
import { getApprovedQuestions, getApprovedCountByCategory } from '../storage/local';

/**
 * Calculate SHA-256 checksum for content
 * Uses browser crypto API (Web Crypto API)
 *
 * @param content - String content to hash
 * @returns SHA-256 hex string (64 characters)
 */
export async function calculateChecksum(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate unique pack ID using UUID v4
 * Per D-03: UUID-based pack identifiers
 *
 * @returns UUID v4 string
 */
export function generatePackId(): string {
  return crypto.randomUUID();
}

/**
 * Generate initial version for new packs
 *
 * @returns '1.0.0'
 */
export function generateVersion(): string {
  return '1.0.0';
}

/**
 * Get current ISO timestamp
 *
 * @returns ISO datetime string
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Export a question pack with metadata
 * Validates pack against QuestionPackSchema and creates downloadable JSON
 *
 * Per D-05: Schema version '1.0.0' enforced
 * Per D-19: contentEncoding set to 'identity' for now (gzip optional)
 *
 * @param name - Pack name (1-100 chars)
 * @param description - Optional pack description (max 500 chars)
 * @param author - Author name (1-100 chars)
 * @returns Object containing validated pack, blob, and filename
 * @throws Error if fewer than 20 approved questions
 * @throws Error if pack validation fails
 */
export async function exportPack(
  name: string,
  description: string | undefined,
  author: string
): Promise<{ pack: QuestionPack; blob: Blob; filename: string }> {
  // Get approved questions from LocalStorage
  const approvedQuestions = getApprovedQuestions();

  if (approvedQuestions.length < 20) {
    throw new Error(`Pack must have at least 20 questions. Currently have ${approvedQuestions.length}.`);
  }

  // Extract questions from approved items
  const questions: Question[] = approvedQuestions.map((aq) => aq.question);

  // Calculate checksum from questions content
  const content = JSON.stringify(questions);
  const checksum = await calculateChecksum(content);

  // Get category counts from LocalStorage
  const categoryCounts = getApprovedCountByCategory();

  // Build metadata
  const now = getCurrentTimestamp();
  const metadata: PackMetadata = {
    id: generatePackId(),
    name,
    description,
    version: generateVersion(),
    author,
    createdAt: now,
    updatedAt: now,
    categoryCounts,
    totalQuestions: questions.length,
    checksum,
    schemaVersion: '1.0.0',
    contentEncoding: 'identity', // Per D-19: gzip optional, use identity for now
    size: new Blob([content]).size,
  };

  // Build pack
  const pack: QuestionPack = { metadata, questions };

  // Validate against schema
  const result = QuestionPackSchema.safeParse(pack);
  if (!result.success) {
    throw new Error(`Invalid pack: ${result.error.message}`);
  }

  // Create blob for download
  const json = JSON.stringify(result.data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });

  // Generate filename: pack-name-first-8-chars-of-uuid.json
  const slugifiedName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const shortId = metadata.id.slice(0, 8);
  const filename = `${slugifiedName}-${shortId}.json`;

  return { pack: result.data, blob, filename };
}

/**
 * Trigger browser download for pack file
 * Creates temporary object URL and triggers download
 *
 * @param blob - Blob containing pack JSON
 * @param filename - Download filename
 */
export function downloadPack(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}