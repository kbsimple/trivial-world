# Phase 16: CLI Bulk Question Generation - Research

**Researched:** 2026-06-12
**Domain:** Node.js CLI tooling, AI generation pipeline, JSON schema extension, React Native UI
**Confidence:** HIGH

---

## Summary

Phase 16 adds a command-line generation pipeline so editors can produce full question packs (all 6 categories) from a single `--topic` argument without opening the web generator UI. The key design challenges are: (1) adapting the browser-oriented generator code to run under Node.js, (2) introducing a `tidbits` field to the shared `QuestionSchema`, (3) implementing a draft/publish file workflow with a separate review command, (4) registering published packs in the existing `public/api/v1/packs.json` index, and (5) displaying `tidbits` in the mobile app's `QuestionCard` after the answer is revealed.

The existing codebase already has almost everything needed. The Vercel AI SDK (`ai@6.0.200`, `ollama-ai-provider-v2@3.6.0`) supports Node.js 18+ natively — the only browser-specific usage is the `NEXT_PUBLIC_OLLAMA_URL` env var name and `crypto.subtle` (both work fine in Node 25). The `@trivial-world/types` `QuestionSchema` needs a single optional field addition. The mobile `questions` WatermelonDB table and `QuestionCard` need parallel updates. Published packs are static JSON files dropped into `apps/generator/public/packs/` with an entry added to `apps/generator/public/api/v1/packs.json`.

**Primary recommendation:** Add the CLI as a `scripts/` directory under `apps/generator`, share all existing `lib/ollama/` and `lib/pack/` logic directly (no duplicates), extend `QuestionSchema` with an optional `tidbits` field, add a WatermelonDB migration (schema v3) for the `tidbits` column, and update `QuestionCard` to show tidbits below the answer.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Bulk generation loop | CLI (Node.js script) | — | Runs outside browser; calls existing AI lib |
| Draft JSON persistence | CLI (Node.js script) / filesystem | — | Files in `scripts/drafts/`, not browser localStorage |
| Review command (CLI) | CLI (Node.js script) | — | Terminal editor; no browser needed |
| Pack index registration | CLI (Node.js script) | — | Mutates `public/api/v1/packs.json` in-place |
| `tidbits` field definition | `packages/types` (shared schema) | — | Single source of truth for all consumers |
| WatermelonDB schema migration | Mobile app (schema v3) | — | `tidbits` column in `questions` table |
| Tidbits display | Mobile app (`QuestionCard`) | — | Shown after answer reveal on question screen |
| Question generation logic | Generator app `lib/` (reused) | — | CLI imports the same `generateQuestion` function |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` | 6.0.200 (installed) | Vercel AI SDK, `generateObject` | Already in project; Node.js 18+ compatible [VERIFIED: node_modules] |
| `ollama-ai-provider-v2` | 3.6.0 (installed) | Ollama provider for AI SDK | Already in project; works with `createOllama` in Node.js [VERIFIED: node_modules] |
| `zod` | 4.4.3 (installed) | Schema validation | Already in `@trivial-world/types` [VERIFIED: npm registry] |
| `tsx` | 4.22.4 (current) | TypeScript runner for CLI scripts | Zero-config TS execution; no compile step needed [VERIFIED: npm registry] |
| Node.js `fs`, `path`, `crypto` | built-in (Node 25 installed) | File I/O, UUID, SHA-256 | `crypto.subtle.digest` works in Node 25 [VERIFIED: tested locally] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `commander` | 15.0.0 (current on npm) | CLI argument parsing | `--topic`, `--model`, `--count`, `--output` flags [VERIFIED: npm registry] |
| `@trivial-world/types` | workspace | Shared types | Already used by generator; import same `QuestionSchema` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `tsx` | `ts-node` | `tsx` is faster, zero-config, no tsconfig quirks; ts-node is heavier |
| `commander` | `yargs` or `minimist` | `commander` is the most common in TypeScript CLIs; yargs adds more but isn't needed |
| `commander` | `inquirer` (interactive) | Review command uses interactive prompts for editing; `commander` handles args, `readline` handles prompts |

**Installation (new deps only):**
```bash
pnpm add --filter @trivial-world/generator commander tsx
```

---

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│  CLI Entry Point                                     │
│  apps/generator/scripts/generate.ts                  │
│  $ pnpm generate --topic "anime" --count 10          │
└─────────────┬───────────────────────────────────────┘
              │ calls generateQuestion() × (6 cats × count)
              ▼
┌─────────────────────────────────────────────────────┐
│  Existing Generator Lib (reused unchanged)           │
│  apps/generator/lib/ollama/client.ts                 │
│  apps/generator/lib/ollama/prompts.ts                │
│  apps/generator/lib/ollama/verification.ts           │
└─────────────┬───────────────────────────────────────┘
              │ generates Question[] with tidbits
              ▼
┌─────────────────────────────────────────────────────┐
│  Draft JSON File                                     │
│  apps/generator/scripts/drafts/<topic>-<uuid>.json  │
│  { status: "draft", generatedAt, questions[] }      │
└─────────────┬───────────────────────────────────────┘
              │ read by review command
              ▼
┌─────────────────────────────────────────────────────┐
│  CLI Review Command                                  │
│  apps/generator/scripts/review.ts                   │
│  $ pnpm review <draft-file>                          │
│  Terminal: approve / edit / reject each question     │
└─────────────┬───────────────────────────────────────┘
              │ writes approved questions to published pack
              ▼
┌─────────────────────────────────────────────────────┐
│  Published Pack + Index Registration                 │
│  apps/generator/public/packs/<name>-<uuid>.json     │
│  apps/generator/public/api/v1/packs.json  (mutated) │
└─────────────┬───────────────────────────────────────┘
              │ downloaded by mobile app via fetchPackIndex()
              ▼
┌─────────────────────────────────────────────────────┐
│  Mobile App (Netlify URL)                            │
│  services/packIndex.ts → packDownloader.ts           │
│  WatermelonDB questions table (schema v3 with        │
│  tidbits column)                                     │
└─────────────┬───────────────────────────────────────┘
              │ QuestionCard receives question.tidbits
              ▼
┌─────────────────────────────────────────────────────┐
│  Question Reveal Screen                              │
│  components/QuestionCard.tsx                         │
│  Shows tidbits below answerText after reveal         │
└─────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
apps/generator/
├── scripts/                    # New — CLI entry points
│   ├── generate.ts             # --topic --count --model --output
│   ├── review.ts               # <draft-file> interactive review + publish
│   └── drafts/                 # Draft JSON files (gitignored or committed)
│       └── .gitkeep
├── lib/                        # Existing — reused unchanged by CLI
│   ├── ollama/
│   │   ├── client.ts           # generateQuestion(), verifyQuestion()
│   │   ├── prompts.ts          # buildQuestionPrompt() — needs tidbits addition
│   │   └── verification.ts
│   ├── pack/
│   │   └── export.ts           # calculateChecksum(), generatePackId()
│   └── storage/
│       └── local.ts            # NOT used by CLI (browser localStorage)
├── public/
│   ├── api/v1/packs.json       # Index mutated by review.ts publish step
│   └── packs/                  # Published pack files dropped here
└── package.json                # Add scripts: generate, review
```

### Pattern 1: Tidbits Field in QuestionSchema
**What:** Add an optional `tidbits` field to the existing `QuestionSchema` in `packages/types/src/question-pack.ts`
**When to use:** New field on existing schema with backward compatibility

```typescript
// Source: packages/types/src/question-pack.ts (existing pattern)
export const QuestionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  category: CategorySchema,
  questionText: z.string().min(10).max(500),
  answerText: z.string().min(1).max(200),
  difficulty: DifficultySchema.optional(),
  choices: z.array(z.string()).max(6).optional(),
  correctChoiceIndex: z.number().int().min(0).optional(),
  // NEW in Phase 16:
  tidbits: z.string().max(500).optional(), // interesting context shown at answer reveal
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  author: z.string().max(100).optional(),
  source: z.string().url().optional(),
});
```
**Note:** Marking `tidbits` as `.optional()` preserves backward compatibility with existing packs that don't have it. [VERIFIED: existing schema pattern]

### Pattern 2: Prompt Extension for Tidbits Generation
**What:** Extend `buildQuestionPrompt` to request a `tidbits` field from the LLM
**When to use:** When generating questions via the CLI (not the web UI — web UI continues generating without tidbits)

```typescript
// Source: apps/generator/lib/ollama/prompts.ts (existing pattern — extend)
// The JSON schema in the prompt must include tidbits:
`Respond with valid JSON matching this schema:
{
  "id": "unique-url-safe-id",
  "category": "${category}",
  "questionText": "The question text",
  "answerText": "The correct answer",
  "difficulty": "easy" | "medium" | "hard",
  "tidbits": "1-2 sentences of interesting context or explanation shown after the answer"
}`;
```
**Note:** The existing prompt does NOT request tidbits. A CLI-specific prompt builder (`buildCLIQuestionPrompt`) should extend the existing `buildQuestionPrompt` or accept a flag to include tidbits. This avoids changing behavior of the existing web UI. [ASSUMED — design choice; both approaches are viable]

### Pattern 3: Draft File Format
**What:** Intermediate JSON format saved immediately after generation, before review
**Why this separation:** Generation is slow (LLM calls); review is human-paced. Decoupling means editors can quit and resume.

```typescript
// Source: [ASSUMED - new structure derived from existing patterns]
interface DraftPack {
  status: 'draft';
  topic: string;
  generatedAt: string;           // ISO datetime
  questions: DraftQuestion[];    // All generated, not yet curated
}

interface DraftQuestion {
  question: Question;            // Full Question including tidbits
  verification: ConfidenceScore; // 3-pass verification result
  status: 'pending' | 'approved' | 'rejected';
  editedQuestion?: Question;     // Override if editor changed fields
}
```

### Pattern 4: Pack Index Mutation
**What:** `review.ts` publish step reads and mutates `apps/generator/public/api/v1/packs.json` in-place

```typescript
// Source: apps/generator/public/api/v1/packs.json (existing structure, verified)
// Existing structure: { packs: PackIndexEntry[] }
// Publish step: read file, push new PackIndexEntry, write file

const indexPath = path.resolve(__dirname, '../public/api/v1/packs.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
index.packs.push(newEntry);
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n');
```

### Pattern 5: WatermelonDB Migration v3 (tidbits column)
**What:** Add `tidbits` column to `questions` table using `addColumns` migration step
**When to use:** Adding columns to existing tables in WatermelonDB

```typescript
// Source: apps/mobile/database/migrations/002_add_question_packs.ts (existing pattern)
import { addColumns } from '@nozbe/watermelondb/Schema/migrations';

// Migration toVersion: 3
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
}
```

### Anti-Patterns to Avoid
- **Do not import browser-only code in CLI scripts:** `lib/storage/local.ts` uses `window` and `localStorage` — the CLI must NOT import this module. Draft persistence uses `fs` directly.
- **Do not use `NEXT_PUBLIC_OLLAMA_URL` in the CLI:** Use a plain `OLLAMA_URL` env var or `--ollama-url` flag instead. The `NEXT_PUBLIC_` prefix is a Next.js convention that doesn't apply to Node.js scripts.
- **Do not recompute checksums from pack questions only:** The existing `calculateChecksum` in `export.ts` hashes only questions content. The CLI must use the same logic (hash the questions JSON string) to produce consistent checksums that `packDownloader.ts` can verify.
- **Do not modify `schemaVersion` in `PackMetadataSchema`:** It is currently `z.literal('1.0.0')`. If tidbits is optional in `QuestionSchema`, existing packs still validate. Changing schemaVersion would break all existing downloaded packs.
- **Do not add migration v3 to schema.ts without updating `migrations/index.ts`:** The `maxVersion` in migrations index must be incremented to 3, and the new migration must be imported and spread into `sortedMigrations`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CLI argument parsing | Custom `process.argv` parsing | `commander` 15.x | Edge cases: flags, help text, defaults, validation |
| TypeScript execution | Compile-then-run workflow | `tsx` via `pnpm exec tsx` | No separate build step; matches Node.js ESM semantics |
| SHA-256 checksum | Custom hash | `crypto.subtle.digest('SHA-256', ...)` (already in export.ts) | Built-in, cross-platform, tested |
| Pack ID generation | Custom UUID | `crypto.randomUUID()` (already in export.ts) | Built-in in Node 14.17+, no deps |
| Draft file format | Custom binary/DB | Plain JSON files in `scripts/drafts/` | Simple, inspectable, resumable, gitignore-able |
| Interactive review | Web UI | Terminal readline prompts | Editors are in terminal; no browser needed for CLI workflow |

---

## Runtime State Inventory

This phase is a new CLI addition, not a rename/refactor. No existing runtime state changes.

**Nothing found in category:** None — verified by phase description (new feature, not rename/migration).

---

## Common Pitfalls

### Pitfall 1: `NEXT_PUBLIC_OLLAMA_URL` Does Not Work in Node.js CLI
**What goes wrong:** CLI calls `generateQuestion()` from `lib/ollama/client.ts` which reads `process.env.NEXT_PUBLIC_OLLAMA_URL`. In Node.js this env var is undefined unless explicitly exported, and Next.js doesn't inject it for non-Next processes.
**Why it happens:** `NEXT_PUBLIC_` is a Next.js build-time prefix convention; it only gets baked in during `next build`.
**How to avoid:** Add an `OLLAMA_URL` fallback to the client.ts, or pass the URL explicitly as a CLI argument and thread it through to `generateQuestion(ollamaUrl)`. The `ollamaUrl` parameter is already on `generateQuestion()` — just pass it from the CLI flag. [VERIFIED: client.ts already accepts optional `ollamaUrl` parameter]
**Warning signs:** Generation fails with "fetch failed" or "ECONNREFUSED" when running from terminal.

### Pitfall 2: `calculateChecksum` Uses Web Crypto (`crypto.subtle`) — Also Works in Node 18+
**What goes wrong:** `export.ts`'s `calculateChecksum` uses `crypto.subtle.digest('SHA-256', ...)`. Developers might assume this is browser-only.
**Why it happens:** `crypto.subtle` was added to the global scope in Node.js 19 and is available as `require('crypto').webcrypto.subtle` from Node 15+. Node 25 has it globally.
**How to avoid:** Verified: `crypto.subtle.digest` works in Node 25 globally [VERIFIED: tested locally]. Safe to use in CLI.
**Warning signs:** None — it works. But document it to avoid future confusion.

### Pitfall 3: Schema Version vs. Optional Fields
**What goes wrong:** Adding `tidbits` to `QuestionSchema` without making it `.optional()` will break validation of all existing packs (120+ questions in `public/packs/trivial-world-starter-7f3a9c2e.json` have no `tidbits` field).
**Why it happens:** Strict Zod schemas reject unknown required fields.
**How to avoid:** Declare `tidbits: z.string().max(500).optional()`. Existing packs pass validation; new packs include tidbits.
**Warning signs:** `QuestionPackSchema.safeParse()` returns errors mentioning "tidbits" after schema update.

### Pitfall 4: WatermelonDB Migration Must Be Applied in Sequence
**What goes wrong:** Adding schema v3 without creating a migration means existing users' databases fail on app launch with "schema mismatch" error.
**Why it happens:** WatermelonDB validates `schema.version` against `migrations.maxVersion`. If the schema says v3 but migrations only go to v2, the database can't migrate existing data.
**How to avoid:** Create `003_add_tidbits.ts` with `addColumns({ table: 'questions', columns: [{ name: 'tidbits', type: 'string', isOptional: true }] })`, increment `schema.version` to 3, add to `migrations/index.ts`.
**Warning signs:** App crashes on launch with WatermelonDB migration error for users who had the app before Phase 16.

### Pitfall 5: LLM May Not Generate Tidbits When Not in Schema
**What goes wrong:** `generateObject` with the existing `QuestionSchema` (before tidbits is added) will strip the tidbits field from LLM output even if the prompt requests it, because Zod strips unknown fields by default.
**Why it happens:** `z.object()` by default drops keys not in the schema.
**How to avoid:** Add `tidbits` to `QuestionSchema` FIRST before writing the CLI prompt. Once the schema includes it as optional, `generateObject` will preserve it if the LLM returns it. [VERIFIED: existing pattern — choices and correctChoiceIndex are already optional in schema]

### Pitfall 6: Pack Index URL Points to Generator Netlify Site (Not Mobile)
**What goes wrong:** `packConfig.ts` shows `GENERATOR_PACK_INDEX_URL = 'https://trivial-world.netlify.app/api/v1/packs.json'` (mobile site). But packs are actually served from the generator site. The index and pack files are in `apps/generator/public/`.
**Why it happens:** The two `packs.json` files (one in each app's `public/`) diverge. The mobile app fetches from the generator Netlify domain.
**How to avoid:** The CLI `review.ts` publish step must mutate `apps/generator/public/api/v1/packs.json` (not the mobile one). After committing and deploying, the generator Netlify site serves updated packs. [VERIFIED: two separate packs.json files exist; mobile one has different totalQuestions count suggesting they diverge]

---

## Code Examples

Verified patterns from official sources:

### generateObject in Node.js (non-browser)
```typescript
// Source: apps/generator/lib/ollama/client.ts (existing pattern, works in Node.js)
import { createOllama } from 'ollama-ai-provider-v2';
import { generateObject } from 'ai';
import { QuestionSchema } from '@trivial-world/types';

const ollama = createOllama({ baseURL: process.env.OLLAMA_URL || 'http://localhost:11434' });

const result = await generateObject({
  model: ollama('qwen3.5'),  // use available model if llama3.2 not present
  schema: QuestionSchema,
  prompt: buildCLIQuestionPrompt(topic, category),
});
// result.object is typed as Question (validated by Zod)
```

### Commander CLI pattern
```typescript
// Source: [ASSUMED - standard commander pattern]
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

### Draft file write pattern
```typescript
// Source: apps/mobile/scripts/generate-statusz.mjs (existing pattern for Node.js file write)
import { writeFileSync } from 'fs';

const draft = { status: 'draft', topic, generatedAt: new Date().toISOString(), questions };
const filename = `${slugify(topic)}-${crypto.randomUUID().slice(0, 8)}.json`;
writeFileSync(path.join(outputDir, filename), JSON.stringify(draft, null, 2) + '\n');
```

### WatermelonDB addColumns migration
```typescript
// Source: apps/mobile/database/migrations/002_add_question_packs.ts (existing pattern)
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

### QuestionCard tidbits display pattern
```typescript
// Source: apps/mobile/components/QuestionCard.tsx (existing pattern — add below answerText)
// After answer is revealed, show tidbits beneath the answer text:
{revealed && tidbits && (
  <Text style={[styles.tidbitsText, { color: theme.color?.val as string }]}>
    {tidbits}
  </Text>
)}

// tidbitsText style: fontSize 14, opacity 0.7, italic, textAlign center, marginTop 12
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Web UI generation only | CLI bulk generation | Phase 16 | Editors don't need a browser or local Next.js dev server |
| No question explanation | `tidbits` field per question | Phase 16 | More engaging reveal; conductor has interesting fact to share |
| Manual pack download from browser | CLI publish directly to `public/packs/` | Phase 16 | One command to generate → draft → approve → publish |

**Deprecated/outdated:**
- `NEXT_PUBLIC_OLLAMA_URL` in `client.ts`: The existing default still works for browser, but CLI scripts should use `OLLAMA_URL` or `--ollama-url` arg.
- `DEFAULT_MODEL = 'llama3.2'`: This model is NOT available on the local machine (verified: only `qwen3.5` and `glm-5.1:cloud` are installed). The CLI should default to `qwen3.5` or accept `--model`. [VERIFIED: `ollama list` output]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | CLI prompt should use a separate builder (`buildCLIQuestionPrompt`) rather than modifying the existing `buildQuestionPrompt` to preserve web UI behavior | Architecture Patterns §2 | If wrong, web UI may start requesting tidbits unexpectedly (low risk since it's optional in schema) |
| A2 | Draft files live in `apps/generator/scripts/drafts/` (gitignored or committed as policy decision) | Architecture Patterns §Recommended Project Structure | If wrong, user may want drafts in a configurable output path (already parameterized by `--output` flag) |
| A3 | The review command uses terminal readline prompts (not another web UI) | Summary | If user wants a web-based review UI instead, significant additional scope |
| A4 | `qwen3.5` (available locally) is acceptable as the default model for the CLI instead of `llama3.2` | Standard Stack | If wrong, user needs to pull a different model before CLI works |
| A5 | Published pack files are committed to `apps/generator/public/packs/` and deployed to Netlify (same pattern as existing `trivial-world-starter-7f3a9c2e.json`) | Architecture Patterns §4 | If wrong, a different hosting strategy (e.g., S3, separate CDN) is needed |
| A6 | Mobile app WatermelonDB needs a schema v3 migration (not just code changes) | Common Pitfalls §4 | If wrong (no migration needed), users with existing installs would have schema mismatch crashes |

---

## Open Questions (RESOLVED)

1. **Default model for CLI**
   - What we know: `llama3.2` is hardcoded as `DEFAULT_MODEL` but is NOT installed locally. Available models: `qwen3.5:latest`, `glm-5.1:cloud`.
   - What's unclear: Should the CLI default to `qwen3.5`, or should the planner add a step to pull `llama3.2`?
   - Recommendation: Default CLI to `qwen3.5` (already installed). User can override with `--model llama3.2` after pulling.

2. **Minimum questions per category for CLI bulk generation**
   - What we know: Existing `MIN_PACK_QUESTIONS = 20` is total, not per-category. A full pack across 6 categories needs 120 total (20 per category is a common target).
   - What's unclear: Should the CLI generate a fixed count per category (e.g., 10) or make it configurable?
   - Recommendation: `--count N` (default 10) means N questions per category, so 60 total for all 6. Document minimum is 20 total for pack validity.

3. **Draft files in git or gitignored**
   - What we know: Drafts are intermediate artifacts; they may contain unreviewed AI output.
   - What's unclear: Whether to commit draft files to git (for team collaboration) or gitignore them (dev-local only).
   - Recommendation: Gitignore `scripts/drafts/*.json` by default; publish step is what creates the committed `public/packs/` files.

4. **`tidbits` in QuestionCard: always visible after reveal, or behind a tap?**
   - What we know: Screen needs to be readable at arm's distance; current design is minimal chrome.
   - What's unclear: Should tidbits appear automatically under the answer, or require a secondary tap?
   - Recommendation: Show automatically after reveal (same as `answerText` appears). If it's too much text, a smaller font + lighter opacity keeps it subordinate.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | CLI execution | ✓ | v25.9.0 | — |
| pnpm | Package management | ✓ | 9.0.0 | — |
| Ollama | AI generation | ✓ | 0.20.0 | — |
| `qwen3.5` model | Generation (default model) | ✓ | latest | Switch to `glm-5.1:cloud` |
| `llama3.2` model | Generation (existing DEFAULT_MODEL) | ✗ | — | Use `qwen3.5` or `ollama pull llama3.2` |
| `tsx` | TypeScript CLI execution | ✗ (not installed) | 4.22.4 available on npm | Install: `pnpm add -D tsx` |
| `commander` | CLI arg parsing | ✗ (not installed) | 15.0.0 available on npm | Install: `pnpm add commander` |

**Missing dependencies with no fallback:**
- `tsx` — required for running TypeScript CLI scripts. Must be installed.
- `commander` — required for argument parsing. Must be installed.

**Missing dependencies with fallback:**
- `llama3.2` — not installed. `qwen3.5` is available and works with same Vercel AI SDK pattern.

---

## Security Domain

This phase adds a CLI that calls a local Ollama instance over HTTP. ASVS categories that apply:

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | CLI is dev-only, local process |
| V3 Session Management | No | No session state |
| V4 Access Control | No | Local filesystem access only |
| V5 Input Validation | Yes | `sanitizeInput()` already exists in `prompts.ts`; use it for `--topic` and `--guidance` args |
| V6 Cryptography | No | SHA-256 used for checksum, not auth |

The existing `sanitizeInput()` function in `prompts.ts` strips control characters and limits length. The CLI should call it on user-provided `--topic` and `--guidance` arguments before passing to prompt builders. [VERIFIED: sanitizeInput exists in prompts.ts]

---

## Sources

### Primary (HIGH confidence)
- `apps/generator/lib/ollama/client.ts` — confirmed AI SDK usage, generateObject, ollamaUrl parameter pattern
- `apps/generator/lib/ollama/prompts.ts` — confirmed prompt structure, sanitizeInput
- `apps/generator/lib/pack/export.ts` — confirmed checksum, pack format, generatePackId
- `packages/types/src/question-pack.ts` — confirmed QuestionSchema fields, PackIndexEntrySchema
- `apps/mobile/database/migrations/002_add_question_packs.ts` — confirmed WatermelonDB addColumns migration pattern
- `apps/mobile/database/schema.ts` — confirmed current schema v2, column names
- `apps/mobile/components/QuestionCard.tsx` — confirmed answer reveal pattern, no tidbits yet
- `apps/mobile/services/packIndex.ts` — confirmed pack index URL and validation pattern
- `apps/generator/public/api/v1/packs.json` — confirmed pack index format
- `apps/generator/public/packs/trivial-world-starter-7f3a9c2e.json` — confirmed Question structure on disk (no tidbits)
- Local machine: `ollama list` — confirmed qwen3.5 available, llama3.2 not installed
- Local machine: Node.js crypto test — confirmed `crypto.subtle.digest` works in Node 25

### Secondary (MEDIUM confidence)
- npm registry: `tsx@4.22.4`, `commander@15.0.0` — current versions verified [VERIFIED: npm view]

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all existing packages verified in node_modules; tsx/commander verified via npm
- Architecture: HIGH — every module referenced was read and confirmed to exist
- Pitfalls: HIGH — each pitfall derived from actual code examined (localStorage in client.ts, NEXT_PUBLIC_ env var, Zod strip behavior, WatermelonDB migration sequence)

**Research date:** 2026-06-12
**Valid until:** 2026-07-12 (stable domain; Ollama API and Vercel AI SDK are stable)
