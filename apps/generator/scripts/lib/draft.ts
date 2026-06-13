import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { type Question } from '@trivial-world/types';
import type { ConfidenceScore } from '../../lib/ollama/client.js';

export interface DraftQuestion {
  question: Question;
  verification: ConfidenceScore;
  status: 'pending' | 'approved' | 'rejected';
  editedQuestion?: Question;
}

export interface DraftPack {
  status: 'draft';
  topic: string;
  generatedAt: string;
  questions: DraftQuestion[];
}

/**
 * Create a new empty draft pack and return its file path.
 * The file is written immediately so the editor can see progress during generation.
 */
export function initDraft(topic: string, outputDir: string): string {
  const safeDir = resolve(outputDir);
  if (!existsSync(safeDir)) {
    mkdirSync(safeDir, { recursive: true });
  }

  const slug = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const shortId = crypto.randomUUID().slice(0, 8);
  const filename = `${slug}-${shortId}.json`;
  const filePath = resolve(safeDir, filename);

  const draft: DraftPack = {
    status: 'draft',
    topic,
    generatedAt: new Date().toISOString(),
    questions: [],
  };

  writeFileSync(filePath, JSON.stringify(draft, null, 2) + '\n', 'utf-8');
  return filePath;
}

/**
 * Append a single generated DraftQuestion to an existing draft file.
 * Reads the current file, pushes the new question, writes back.
 * Called after each question is generated so editors can inspect progress.
 */
export function appendDraftQuestion(filePath: string, draftQuestion: DraftQuestion): void {
  const draft: DraftPack = JSON.parse(readFileSync(filePath, 'utf-8'));
  draft.questions.push(draftQuestion);
  writeFileSync(filePath, JSON.stringify(draft, null, 2) + '\n', 'utf-8');
}

/**
 * Read an existing draft file and return the parsed DraftPack.
 */
export function readDraft(filePath: string): DraftPack {
  return JSON.parse(readFileSync(filePath, 'utf-8')) as DraftPack;
}

/**
 * Write the entire draft pack back to disk (used after review edits).
 */
export function writeDraft(filePath: string, draft: DraftPack): void {
  writeFileSync(filePath, JSON.stringify(draft, null, 2) + '\n', 'utf-8');
}
