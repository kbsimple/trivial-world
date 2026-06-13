# Phase 16: CLI Bulk Question Generation - Pattern Map

**Mapped:** 2026-06-12
**Files analyzed:** 8 new/modified files
**Analogs found:** 8 / 8

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `apps/generator/scripts/generate.ts` | utility (CLI entrypoint) | batch | `apps/mobile/scripts/generate-statusz.mjs` | role-match |
| `apps/generator/scripts/review.ts` | utility (CLI entrypoint) | request-response | `apps/mobile/scripts/generate-statusz.mjs` | role-match |
| `apps/generator/scripts/lib/draft.ts` | utility (file I/O helpers) | file-I/O | `apps/generator/lib/pack/export.ts` | role-match |
| `packages/types/src/question-pack.ts` | model (schema extension) | transform | self (existing schema) | exact |
| `apps/mobile/database/migrations/003_add_tidbits.ts` | migration | CRUD | `apps/mobile/database/migrations/002_add_question_packs.ts` | exact |
| `apps/mobile/database/schema.ts` | config (schema version bump) | — | self (existing schema) | exact |
| `apps/mobile/database/migrations/index.ts` | config (migration registry) | — | self (existing migrations index) | exact |
| `apps/mobile/database/models/Question.ts` | model (field addition) | CRUD | self (existing model) | exact |
| `apps/mobile/components/QuestionCard.tsx` | component (UI extension) | request-response | self (existing component) | exact |
| `apps/mobile/app/game/question.tsx` | component (prop extension) | request-response | self (existing screen) | exact |

---

## Pattern Assignments

### `apps/generator/scripts/generate.ts` (CLI entrypoint, batch)

**Analog:** `apps/mobile/scripts/generate-statusz.mjs` for file write / `apps/generator/lib/ollama/client.ts` for generation

**Shebang + imports pattern** (generate-statusz.mjs lines 1-7):
```javascript
#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
```
For TypeScript CLI under `tsx`, use `import` with Node built-ins and workspace packages directly — no compile step required.

**`__dirname` equivalent for ESM/tsx** (generate-statusz.mjs lines 16-17):
```javascript
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
```
`tsx` supports `import.meta.url`; use this pattern to resolve paths relative to the script file, not CWD.

**`generateQuestion` call signature** (client.ts lines 49-66):
```typescript
export async function generateQuestion(
  topic: string,
  category: Category,
  guidance?: string,
  sourceMaterial?: string,
  model: string = DEFAULT_MODEL,
  ollamaUrl?: string
): Promise<Question>
```
The CLI passes `ollamaUrl` from `--ollama-url` flag and `model` from `--model` flag. `guidance` and `sourceMaterial` can be `undefined` for bulk CLI usage.

**Default Ollama URL env var** (client.ts line 20):
```typescript
const DEFAULT_OLLAMA_URL = process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434';
```
The CLI must override this by passing `ollamaUrl` explicitly from `--ollama-url` arg (or `process.env.OLLAMA_URL`), because `NEXT_PUBLIC_OLLAMA_URL` is not injected outside Next.js builds. The `ollamaUrl` parameter is already wired through `generateQuestion` — just pass it from the flag.

**Commander CLI arg pattern** (RESEARCH.md lines 340-349 — standard pattern, no codebase analog):
```typescript
import { program } from 'commander';

program
  .name('generate')
  .description('Generate question packs in bulk')
  .requiredOption('--topic <topic>', 'Topic for questions')
  .option('--count <n>', 'Questions per category', '10')
  .option('--model <model>', 'Ollama model', 'qwen3.5')
  .option('--ollama-url <url>', 'Ollama endpoint', 'http://localhost:11434')
  .option('--output <dir>', 'Draft output dir', './scripts/drafts')
  .action(async (opts) => { /* generation loop */ });

await program.parseAsync(process.argv);
```

**`sanitizeInput` usage** (prompts.ts lines 11-19):
```typescript
export function sanitizeInput(input: string, maxLength: number = 100): string {
  return input
    .replace(/[\x00-\x1F\x7F]/g, '')
    .slice(0, maxLength)
    .trim();
}
```
Call `sanitizeInput(opts.topic, 100)` and `sanitizeInput(opts.guidance, 500)` on user-provided CLI args before passing to prompt builders. Import from `../lib/ollama/prompts`.

**`generateAndVerifyQuestion` convenience wrapper** (client.ts lines 81-92):
```typescript
export async function generateAndVerifyQuestion(
  topic: string,
  category: Category,
  guidance?: string,
  sourceMaterial?: string,
  model?: string,
  ollamaUrl?: string
): Promise<{ question: Question; verification: ConfidenceScore }>
```
The CLI generation loop should call `generateAndVerifyQuestion` (not `generateQuestion`) to get both the question and its verification score in one call, then bundle both into the `DraftQuestion` record.

---

### `apps/generator/scripts/review.ts` (CLI entrypoint, request-response)

**Analog:** `apps/mobile/scripts/generate-statusz.mjs` for Node.js file I/O; `apps/generator/lib/pack/export.ts` for pack assembly

**File write pattern** (generate-statusz.mjs lines 73-75):
```javascript
writeFileSync(outPath, JSON.stringify(status, null, 2) + '\n', 'utf8');
console.log('statusz →', outPath);
```
Always append `\n` after the JSON and pass `'utf8'`. Use `JSON.stringify(obj, null, 2)` for human-readable output.

**Pack index mutation pattern** (derived from `apps/generator/public/api/v1/packs.json` structure):
```typescript
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const indexPath = path.resolve(__dirname, '../../public/api/v1/packs.json');
const index = JSON.parse(readFileSync(indexPath, 'utf-8')) as { packs: PackIndexEntry[] };
index.packs.push(newEntry);
writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n', 'utf-8');
```
The index file has a single `{ "packs": [...] }` shape (verified from `apps/generator/public/api/v1/packs.json` lines 1-20).

**`calculateChecksum` reuse** (export.ts lines 21-27):
```typescript
export async function calculateChecksum(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
```
Import directly from `../lib/pack/export`. `crypto.subtle` is available globally in Node 25 — no polyfill needed.

**Filename slug pattern** (export.ts lines 123-129):
```typescript
const slugifiedName = name
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');
const shortId = metadata.id.slice(0, 8);
const filename = `${slugifiedName}-${shortId}.json`;
```
Use this exact pattern for both draft files (`<topic>-<uuid8>.json`) and published pack files.

**Pack validation before write** (export.ts lines 113-118):
```typescript
const result = QuestionPackSchema.safeParse(pack);
if (!result.success) {
  throw new Error(`Invalid pack: ${result.error.message}`);
}
```
The review publish step must validate the assembled pack via `QuestionPackSchema.safeParse()` before writing to `public/packs/`. Use `result.data` (the parsed/coerced value) not the original object.

---

### `apps/generator/scripts/lib/draft.ts` (utility, file-I/O)

**Analog:** `apps/generator/lib/pack/export.ts` (checksum, UUID helpers) + `apps/mobile/scripts/generate-statusz.mjs` (file write)

**`generatePackId` / `crypto.randomUUID()`** (export.ts lines 35-37):
```typescript
export function generatePackId(): string {
  return crypto.randomUUID();
}
```
Import `generatePackId` from `../../lib/pack/export` for draft file naming. Slice to 8 chars for the filename suffix: `crypto.randomUUID().slice(0, 8)`.

**`getCurrentTimestamp`** (export.ts lines 50-54):
```typescript
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}
```
Import from `../../lib/pack/export` for `generatedAt` and `updatedAt` fields.

**Draft file shape** (derived from RESEARCH.md Pattern 3 — new structure):
```typescript
interface DraftPack {
  status: 'draft';
  topic: string;
  generatedAt: string;       // ISO datetime — use getCurrentTimestamp()
  questions: DraftQuestion[];
}

interface DraftQuestion {
  question: Question;              // Full Question including tidbits
  verification: ConfidenceScore;   // From generateAndVerifyQuestion()
  status: 'pending' | 'approved' | 'rejected';
  editedQuestion?: Question;       // Set if reviewer edits a field
}
```

**File write helper** (generate-statusz.mjs lines 73-74):
```javascript
writeFileSync(outPath, JSON.stringify(status, null, 2) + '\n', 'utf8');
```

---

### `packages/types/src/question-pack.ts` — schema extension (model, transform)

**Analog:** Self — add `tidbits` field following the `choices` / `correctChoiceIndex` optional field pattern

**Existing optional field pattern** (question-pack.ts lines 14-16):
```typescript
difficulty: DifficultySchema.optional(),
choices: z.array(z.string()).max(6).optional(),
correctChoiceIndex: z.number().int().min(0).optional(),
```

**New field to insert after `correctChoiceIndex`** (line 16, before `// Metadata` comment):
```typescript
tidbits: z.string().max(500).optional(), // interesting context shown at answer reveal
```
Mark `.optional()` to preserve backward compatibility — all existing packs without `tidbits` continue to validate against `QuestionSchema`.

**Do not change `schemaVersion`** (question-pack.ts line 43):
```typescript
schemaVersion: z.literal('1.0.0'),
```
Because `tidbits` is optional, existing packs still validate at `schemaVersion: '1.0.0'`. Do not increment.

---

### `apps/mobile/database/migrations/003_add_tidbits.ts` (migration, CRUD)

**Analog:** `apps/mobile/database/migrations/002_add_question_packs.ts` — exact pattern for `addColumns`

**Import and `schemaMigrations` structure** (002_add_question_packs.ts lines 1-12):
```typescript
import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 3,
      steps: [
        addColumns({
          table: 'questions',
          columns: [
            { name: 'tidbits', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
  ],
});
```
Note: 002 used `createTable` but the pattern for adding columns to existing tables is `addColumns`. The `isOptional: true` flag is required so existing rows (which have no `tidbits` value) remain valid.

**Column naming convention** (002_add_question_packs.ts lines 37-43):
All column names use `snake_case` matching the existing `questions` table columns (`question_pack_id`, `question_id`, `question_text`, `answer_text`, `asked_at`). The new column is `tidbits` (no underscore — matches field name directly).

---

### `apps/mobile/database/schema.ts` — version bump (config)

**Analog:** Self — increment `version` from 2 to 3 and add `tidbits` column to the `questions` tableSchema

**Current schema version** (schema.ts line 13):
```typescript
export const schema = appSchema({
  version: 2, // Incremented from v1 (original game state)
```
Change to `version: 3`.

**Column to add to `questions` tableSchema** (schema.ts lines 42-46 — after `asked_at`):
```typescript
{ name: 'tidbits', type: 'string', isOptional: true },
```
Must mirror `isOptional: true` matching the migration column definition. Position it after `asked_at` at the end of the columns array.

---

### `apps/mobile/database/migrations/index.ts` — migration registry update (config)

**Analog:** Self — add migration 004 import and spread into `sortedMigrations`

**Current registry pattern** (migrations/index.ts lines 1-19):
```typescript
import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';
import migration002 from './002_add_question_packs';

export const migrations = {
  validated: true as const,
  minVersion: 1,
  maxVersion: 2,
  sortedMigrations: [
    ...migration002.sortedMigrations,
  ],
};

export default migrations;
```

**Updated pattern — add migration003**:
```typescript
import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';
import migration002 from './002_add_question_packs';
import migration003 from './003_add_tidbits';

export const migrations = {
  validated: true as const,
  minVersion: 1,
  maxVersion: 3,
  sortedMigrations: [
    ...migration002.sortedMigrations,
    ...migration003.sortedMigrations,
  ],
};

export default migrations;
```
`maxVersion` must equal the new `schema.version` (3). Migrations are spread in ascending version order.

---

### `apps/mobile/database/models/Question.ts` — field addition (model, CRUD)

**Analog:** Self — add `tidbits` field following the `difficulty` / `choices` optional field pattern

**Existing optional field declarations** (Question.ts lines 20-23):
```typescript
@field('difficulty') difficulty?: Difficulty;
@field('choices') choices?: string; // JSON array
@field('correct_choice_index') correctChoiceIndex?: number;
@field('asked_at') askedAt?: number; // Unix timestamp or null
```

**New field to add after `correctChoiceIndex`** (before `askedAt`):
```typescript
@field('tidbits') tidbits?: string;
```

**`toQuestion()` method extension** (Question.ts lines 44-53):
```typescript
toQuestion(): Question {
  return {
    id: this.questionId,
    category: this.category,
    questionText: this.questionText,
    answerText: this.answerText,
    difficulty: this.difficulty,
    choices: this.getChoices(),
    correctChoiceIndex: this.correctChoiceIndex,
    // Add:
    tidbits: this.tidbits,
  };
}
```

---

### `apps/mobile/components/QuestionCard.tsx` — tidbits display (component, request-response)

**Analog:** Self — add `tidbits` prop following the `answerText` reveal pattern

**Existing props interface** (QuestionCard.tsx lines 8-17):
```typescript
interface QuestionCardProps {
  questionNumber: number;
  category: PlayerColor;
  questionText: string;
  answerText: string;
  revealed: boolean;
  onReveal: () => void;
  choices?: string[];
  correctChoiceIndex?: number;
}
```
Add `tidbits?: string` as an optional prop at the end.

**Existing answer reveal branch** (QuestionCard.tsx lines 91-106) — for open-answer (non-MC) questions:
```typescript
revealed ? (
  <Text style={[styles.answerText, { color: theme.color?.val as string }]}>
    {answerText}
  </Text>
) : (
  <Pressable ... onPress={onReveal}>
    <Text style={styles.revealButtonText}>Reveal Answer</Text>
  </Pressable>
)
```
After the `answerText` `<Text>`, add:
```typescript
{revealed && tidbits && (
  <Text style={[styles.tidbitsText, { color: theme.color?.val as string }]}>
    {tidbits}
  </Text>
)}
```

**Existing StyleSheet to extend** (QuestionCard.tsx lines 111-197):
```typescript
const styles = StyleSheet.create({
  // ... existing styles ...
  answerText: {
    fontSize: 20,
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 16,
    fontWeight: '600',
  },
  // Add:
  tidbitsText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    opacity: 0.7,
    fontStyle: 'italic',
  },
});
```
`opacity: 0.7` and `fontStyle: 'italic'` keep tidbits visually subordinate to `answerText`. `marginTop: 12` matches the `questionNumber` spacing pattern.

---

### `apps/mobile/app/game/question.tsx` — tidbits prop pass-through (component, request-response)

**Analog:** Self — extend `QuestionCard` usage to forward `tidbits` from `currentQuestion`

**Existing QuestionCard usage** (question.tsx lines 70-80):
```typescript
<QuestionCard
  questionNumber={questionNumber}
  category={category}
  questionText={currentQuestion.questionText}
  answerText={currentQuestion.answerText}
  revealed={answerRevealed}
  onReveal={() => revealAnswer()}
  choices={currentQuestion.choices}
  correctChoiceIndex={currentQuestion.correctChoiceIndex}
/>
```
Add `tidbits={currentQuestion.tidbits}` — the `Question` type already carries `tidbits?: string` after the schema change. No other changes to this file.

---

## Shared Patterns

### Node.js File I/O
**Source:** `apps/mobile/scripts/generate-statusz.mjs`
**Apply to:** `generate.ts`, `review.ts`, `scripts/lib/draft.ts`
```javascript
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Always: JSON.stringify(obj, null, 2) + '\n'
writeFileSync(outPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
```

### Crypto (SHA-256 + UUID)
**Source:** `apps/generator/lib/pack/export.ts` lines 21-37
**Apply to:** `scripts/lib/draft.ts`, `review.ts`
```typescript
// SHA-256 (works in Node 25 globally — no require('crypto') needed)
const hashBuffer = await crypto.subtle.digest('SHA-256', data);
// UUID
const id = crypto.randomUUID();
```
Both `crypto.subtle` and `crypto.randomUUID()` are global in Node 25. Import `calculateChecksum` and `generatePackId` directly from `../../lib/pack/export` to avoid duplication.

### Input Sanitization
**Source:** `apps/generator/lib/ollama/prompts.ts` lines 11-19
**Apply to:** `generate.ts` (sanitize `--topic`, `--guidance` args)
```typescript
import { sanitizeInput } from '../lib/ollama/prompts';

const topic = sanitizeInput(opts.topic, 100);
const guidance = opts.guidance ? sanitizeInput(opts.guidance, 500) : undefined;
```

### Zod Optional Field Extension
**Source:** `packages/types/src/question-pack.ts` lines 13-16
**Apply to:** `question-pack.ts` (tidbits field addition)
```typescript
// Pattern: all optional metadata fields use .optional() — never .nullable()
difficulty: DifficultySchema.optional(),
choices: z.array(z.string()).max(6).optional(),
// New field follows the same pattern:
tidbits: z.string().max(500).optional(),
```

### WatermelonDB `addColumns` Migration
**Source:** `apps/mobile/database/migrations/002_add_question_packs.ts` lines 1-50
**Apply to:** `003_add_tidbits.ts`
```typescript
import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [{
    toVersion: 3,
    steps: [
      addColumns({
        table: 'questions',
        columns: [{ name: 'tidbits', type: 'string', isOptional: true }],
      }),
    ],
  }],
});
```

### WatermelonDB Model `@field` Decorator
**Source:** `apps/mobile/database/models/Question.ts` lines 16-24
**Apply to:** `Question.ts` (tidbits field)
```typescript
@field('tidbits') tidbits?: string;
```
Column name `'tidbits'` matches the migration column name exactly. No JSON serialization needed (unlike `choices` which is a JSON array).

---

## No Analog Found

All files have analogs in the codebase. The only genuinely new structural element is the Commander CLI pattern (`generate.ts`, `review.ts`), which has no existing Commander usage in the project. For those, use the standard Commander pattern from RESEARCH.md lines 340-349 directly.

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `apps/generator/scripts/generate.ts` (Commander wiring) | utility | batch | Commander library not yet used in project; use RESEARCH.md pattern |
| `apps/generator/scripts/review.ts` (readline interactive loop) | utility | request-response | No interactive terminal prompts exist in codebase; use Node.js `readline` stdlib |

---

## Metadata

**Analog search scope:** `apps/generator/lib/`, `apps/mobile/database/`, `apps/mobile/components/`, `apps/mobile/app/game/`, `apps/mobile/scripts/`, `packages/types/src/`, `apps/generator/public/`
**Files scanned:** 16
**Pattern extraction date:** 2026-06-12
