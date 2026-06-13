#!/usr/bin/env tsx
/**
 * generate.ts — Bulk question pack generator CLI
 *
 * Usage:
 *   pnpm generate --topic "anime" [--count 10] [--model qwen3.5] [--ollama-url http://localhost:11434] [--output ./scripts/drafts]
 *
 * Generates questions for all 6 categories and saves a draft JSON file immediately.
 * Each question is appended to the draft as it finishes — no blocking on completion.
 */
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { program } from 'commander';
import { generateObject } from 'ai';
import { createOllama } from 'ollama-ai-provider-v2';
import { QuestionSchema, type Category } from '@trivial-world/types';
import { verifyQuestion } from '../lib/ollama/client.js';
import { sanitizeInput, buildCLIQuestionPrompt } from '../lib/ollama/prompts.js';
import { initDraft, appendDraftQuestion, type DraftQuestion } from './lib/draft.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ALL_CATEGORIES: Category[] = ['blue', 'pink', 'yellow', 'purple', 'green', 'orange'];

program
  .name('generate')
  .description('Generate a full question pack for all 6 categories from a given topic')
  .requiredOption('--topic <topic>', 'Topic/theme for the questions (e.g. "anime", "Marvel MCU")')
  .option('--count <n>', 'Number of questions per category', '10')
  .option('--model <model>', 'Ollama model to use', 'qwen3.5')
  .option('--ollama-url <url>', 'Ollama endpoint URL', process.env.OLLAMA_URL || 'http://localhost:11434')
  .option('--output <dir>', 'Directory to save draft files', resolve(__dirname, './drafts'));

program.action(async (opts) => {
  const topic = sanitizeInput(opts.topic, 100);
  const count = parseInt(opts.count, 10);
  const model: string = opts.model;
  const ollamaUrl: string = opts.ollamaUrl;
  const outputDir: string = opts.output;

  if (isNaN(count) || count < 1 || count > 20) {
    console.error('Error: --count must be an integer between 1 and 20');
    process.exit(1);
  }

  console.log(`\nGenerating pack for topic: "${topic}"`);
  console.log(`Categories: ${ALL_CATEGORIES.join(', ')}`);
  console.log(`Questions per category: ${count} (total: ${ALL_CATEGORIES.length * count})`);
  console.log(`Model: ${model}`);
  console.log(`Ollama: ${ollamaUrl}\n`);

  const draftPath = initDraft(topic, outputDir);
  console.log(`Draft file: ${draftPath}\n`);

  let totalGenerated = 0;
  let totalFailed = 0;

  for (const category of ALL_CATEGORIES) {
    console.log(`[${category}] Generating ${count} questions...`);

    for (let i = 0; i < count; i++) {
      try {
        const ollama = createOllama({ baseURL: ollamaUrl });
        const prompt = buildCLIQuestionPrompt(topic, category);
        const { object: question } = await generateObject({
          model: ollama(model),
          schema: QuestionSchema,
          prompt,
        });
        const verification = await verifyQuestion(question, model, ollamaUrl);

        const draftQuestion: DraftQuestion = {
          question,
          verification,
          status: 'pending',
        };

        appendDraftQuestion(draftPath, draftQuestion);
        totalGenerated++;
        process.stdout.write(`  [${category}] ${i + 1}/${count} — Q: ${question.questionText.slice(0, 60)}...\n`);
      } catch (err) {
        totalFailed++;
        console.error(`  [${category}] ${i + 1}/${count} FAILED: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  console.log(`\nDone.`);
  console.log(`  Generated: ${totalGenerated}`);
  console.log(`  Failed:    ${totalFailed}`);
  console.log(`  Draft:     ${draftPath}`);
  console.log(`\nNext step: pnpm review ${draftPath}`);
});

await program.parseAsync(process.argv);
