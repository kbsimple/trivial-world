#!/usr/bin/env tsx
/**
 * review.ts — Interactive draft review and publish CLI
 *
 * Usage:
 *   pnpm review <draft-file>
 *
 * Presents each pending question interactively. For each question:
 *   [a]pprove — mark as approved (no changes)
 *   [e]dit — edit questionText, answerText, or tidbits inline
 *   [r]eject — mark as rejected (excluded from published pack)
 *   [s]kip — leave as pending for another review session
 *
 * After all questions are reviewed, prompts to publish:
 *   Assembles approved questions into a QuestionPack JSON
 *   Validates against QuestionPackSchema
 *   Writes to apps/generator/public/packs/<slug>-<uuid8>.json
 *   Mutates apps/generator/public/api/v1/packs.json to add index entry
 */
import { createInterface } from 'readline';
import { readFileSync, writeFileSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { program } from 'commander';
import { QuestionPackSchema, type Category } from '@trivial-world/types';
import { calculateChecksum, generatePackId, getCurrentTimestamp } from '../lib/pack/export.js';
import { readDraft, writeDraft, type DraftQuestion, type DraftPack } from './lib/draft.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const GENERATOR_BASE_URL = 'https://trivial-world-generator.netlify.app';
const PACKS_DIR = resolve(__dirname, '../public/packs');
const INDEX_PATH = resolve(__dirname, '../public/api/v1/packs.json');

// readline interface for interactive prompts
const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

function printQuestion(dq: DraftQuestion, index: number, total: number): void {
  const q = dq.editedQuestion ?? dq.question;
  console.log(`\n--- Question ${index + 1} of ${total} [${q.category}] ---`);
  console.log(`Verification confidence: ${dq.verification.score ?? 'n/a'}`);
  console.log(`\nQ: ${q.questionText}`);
  console.log(`A: ${q.answerText}`);
  if (q.tidbits) {
    console.log(`T: ${q.tidbits}`);
  }
  console.log(`Difficulty: ${q.difficulty ?? 'unset'}`);
}

async function reviewQuestion(dq: DraftQuestion, index: number, total: number): Promise<DraftQuestion> {
  printQuestion(dq, index, total);

  while (true) {
    const input = (await ask('\n[a]pprove / [e]dit / [r]eject / [s]kip: ')).trim().toLowerCase();

    if (input === 'a' || input === 'approve') {
      return { ...dq, status: 'approved' };
    }

    if (input === 'r' || input === 'reject') {
      return { ...dq, status: 'rejected' };
    }

    if (input === 's' || input === 'skip') {
      return dq; // leave status as-is (pending)
    }

    if (input === 'e' || input === 'edit') {
      const current = dq.editedQuestion ?? dq.question;
      console.log('\nEditing question (press Enter to keep current value):');

      const newQuestionText = (await ask(`  questionText [${current.questionText.slice(0, 60)}...]: `)).trim();
      const newAnswerText = (await ask(`  answerText [${current.answerText}]: `)).trim();
      const newTidbits = (await ask(`  tidbits [${current.tidbits ?? ''}]: `)).trim();

      const edited = {
        ...current,
        questionText: newQuestionText || current.questionText,
        answerText: newAnswerText || current.answerText,
        tidbits: newTidbits || current.tidbits,
      };

      const updatedDq: DraftQuestion = { ...dq, editedQuestion: edited, status: 'approved' };
      printQuestion(updatedDq, index, total);
      const confirm = (await ask('  Save edits and approve? [y/n]: ')).trim().toLowerCase();
      if (confirm === 'y' || confirm === 'yes') {
        return updatedDq;
      }
      // Otherwise loop back to the action prompt
    } else {
      console.log("  Please type 'a', 'e', 'r', or 's'.");
    }
  }
}

async function publishDraft(draft: DraftPack, draftPath: string): Promise<void> {
  const approved = draft.questions
    .filter((dq) => dq.status === 'approved')
    .map((dq) => dq.editedQuestion ?? dq.question);

  if (approved.length < 20) {
    console.log(`\nCannot publish: need at least 20 approved questions, have ${approved.length}.`);
    return;
  }

  // Prompt for pack metadata
  console.log('\n--- Pack Metadata ---');
  const name = (await ask(`  Pack name [${draft.topic} Trivia Pack]: `)).trim() || `${draft.topic} Trivia Pack`;
  const author = (await ask('  Author: ')).trim() || 'Trivial World';
  const description = (await ask('  Description (optional): ')).trim();

  const packId = generatePackId();
  const now = getCurrentTimestamp();

  // Compute category counts from approved questions
  const categoryCounts: Record<string, number> = {};
  for (const q of approved) {
    categoryCounts[q.category] = (categoryCounts[q.category] ?? 0) + 1;
  }

  // Compute checksum over the questions JSON string (matches packDownloader.ts expectation)
  const questionsJson = JSON.stringify(approved);
  const checksum = await calculateChecksum(questionsJson);

  // Build slug and filename
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const shortId = packId.replace(/-/g, '').slice(0, 8);
  const filename = `${slug}-${shortId}.json`;
  const packPath = resolve(PACKS_DIR, filename);
  const downloadUrl = `${GENERATOR_BASE_URL}/packs/${filename}`;

  const pack = {
    metadata: {
      id: packId,
      name,
      description: description || undefined,
      version: '1.0.0',
      author,
      createdAt: now,
      updatedAt: now,
      categoryCounts: categoryCounts as Record<Category, number>,
      totalQuestions: approved.length,
      checksum,
      schemaVersion: '1.0.0' as const,
      contentEncoding: 'identity' as const,
      size: 0, // placeholder; updated after write
    },
    questions: approved,
  };

  // Validate before writing
  const result = QuestionPackSchema.safeParse(pack);
  if (!result.success) {
    console.error('\nPack validation failed:', result.error.message);
    return;
  }

  // Write pack file (placeholder size = 0)
  const packJson = JSON.stringify(result.data, null, 2) + '\n';
  writeFileSync(packPath, packJson, 'utf-8');

  // Update size field with actual byte count and re-write
  const sizeBytes = statSync(packPath).size;
  const packWithSize = {
    ...result.data,
    metadata: { ...result.data.metadata, size: sizeBytes },
  };
  writeFileSync(packPath, JSON.stringify(packWithSize, null, 2) + '\n', 'utf-8');

  // Update pack index
  const index = JSON.parse(readFileSync(INDEX_PATH, 'utf-8')) as { packs: unknown[] };
  const indexEntry = {
    id: packId,
    name,
    author,
    version: '1.0.0',
    totalQuestions: approved.length,
    categoryCounts: categoryCounts as Record<Category, number>,
    downloadUrl,
    checksum,
    size: sizeBytes,
  };

  // Replace existing entry with same id (idempotent), or append
  const existingIdx = index.packs.findIndex((p: unknown) => (p as { id: string }).id === packId);
  if (existingIdx >= 0) {
    index.packs[existingIdx] = indexEntry;
  } else {
    index.packs.push(indexEntry);
  }
  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + '\n', 'utf-8');

  console.log(`\nPublished!`);
  console.log(`  Pack file:  ${packPath}`);
  console.log(`  Index:      ${INDEX_PATH}`);
  console.log(`  Questions:  ${approved.length}`);
  console.log(`  Download:   ${downloadUrl}`);
  console.log(`\nNext step: git add apps/generator/public && git commit && git push`);
  console.log('Netlify will deploy within ~1 minute.');

  // Suppress unused variable warning — draftPath is kept for future use (e.g., archiving the draft)
  void draftPath;
}

program
  .name('review')
  .description('Interactively review a draft question pack and publish approved questions')
  .argument('<draft-file>', 'Path to the draft JSON file produced by generate.ts');

program.action(async (draftFile: string) => {
  const draftPath = resolve(process.cwd(), draftFile);
  const draft = readDraft(draftPath);

  const pending = draft.questions.filter((dq) => dq.status === 'pending');
  console.log(`\nDraft: ${draftPath}`);
  console.log(`Topic: ${draft.topic}`);
  console.log(`Total questions: ${draft.questions.length}`);
  console.log(`Pending: ${pending.length}`);
  console.log(`Approved: ${draft.questions.filter((dq) => dq.status === 'approved').length}`);
  console.log(`Rejected: ${draft.questions.filter((dq) => dq.status === 'rejected').length}`);

  if (pending.length === 0) {
    console.log('\nNo pending questions — proceeding to publish step.');
  } else {
    console.log('\nReview each question. Changes are saved to the draft as you go.');
    for (let i = 0; i < draft.questions.length; i++) {
      const dq = draft.questions[i];
      if (dq.status !== 'pending') continue;

      const updated = await reviewQuestion(dq, i, draft.questions.length);
      draft.questions[i] = updated;
      writeDraft(draftPath, draft); // save after each question
    }
  }

  const approvedCount = draft.questions.filter((dq) => dq.status === 'approved').length;
  console.log(`\nReview complete. ${approvedCount} questions approved.`);

  if (approvedCount < 20) {
    console.log(`Need at least 20 approved questions to publish (have ${approvedCount}). Exiting.`);
    rl.close();
    return;
  }

  const doPublish = (await ask('\nPublish approved questions? [y/n]: ')).trim().toLowerCase();
  if (doPublish === 'y' || doPublish === 'yes') {
    await publishDraft(draft, draftPath);
  } else {
    console.log('Skipped publish. Run review again to publish when ready.');
  }

  rl.close();
});

await program.parseAsync(process.argv);
