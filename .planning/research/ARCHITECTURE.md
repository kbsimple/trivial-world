# Architecture Research

**Domain:** Question Pack System for Mobile Trivia Game
**Researched:** 2026-06-08
**Confidence:** HIGH

## Executive Summary

This research addresses the architecture for a question pack system that enables:
1. **Question Pack Structure** - TypeScript types and JSON Schema for portable question data
2. **Question Generator Web App** - AI-powered question creation with cloud storage
3. **Game Configuration** - Mobile app pack selection and settings

The recommended architecture uses a **monorepo with shared types**, **Zod for runtime validation**, and **JSON Schema for pack validation**. The question pack format follows patterns from established trivia schemas (Sunbird inQuiry, trivia-schema) with adaptations for Trivial World's 6-category model.

Key decisions:
- **Monorepo structure** with shared `@trivial-world/types` package
- **Zod-first types** for single source of truth + runtime validation
- **JSON Schema export** for validation in environments without Zod
- **Cloud storage** via presigned URLs (S3-compatible) for pack downloads
- **Offline-first** pack caching in WatermelonDB (existing from v1.0)

---

## System Overview

### Two-App Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MONOREPO ROOT                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  apps/                                                                       │
│  ├── mobile/              # Expo SDK 55 (existing Trivial World app)        │
│  │   ├── app/             # Expo Router screens                             │
│  │   │   ├── game/        # Existing game screens                           │
│  │   │   └── packs/       # NEW: Pack management screens                    │
│  │   ├── components/      # UI components                                  │
│  │   ├── stores/          # Zustand stores                                  │
│  │   │   └── packStore.ts # NEW: Pack selection state                      │
│  │   ├── database/        # WatermelonDB models                             │
│  │   │   └── QuestionPack.ts # NEW: Pack model                              │
│  │   └── services/        # Pack download/cache service                     │
│  │                                                                          │
│  └── generator/           # Next.js 15 web app (new)                        │
│      ├── app/             # App Router pages                                │
│      ├── components/      # Question editor UI                              │
│      ├── lib/             # AI generation, API clients                      │
│      └── api/             # REST endpoints for pack CRUD                    │
│                                                                             │
│  packages/                                                                   │
│  ├── types/               # @trivial-world/types                            │
│  │   ├── question-pack.ts # Zod schemas + inferred types                   │
│  │   ├── category.ts      # Category definitions (shared)                   │
│  │   └── json-schema.ts   # JSON Schema exports                            │
│  │                                                                          │
│  └── ts-config/           # Shared TypeScript configs                      │
│                                                                             │
│  turbo.json               # Turborepo build pipeline                       │
│  pnpm-workspace.yaml      # Workspace config                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow: Generator to Consumer

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        QUESTION GENERATOR (Web)                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌────────────────┐ │
│  │ Topic Input │───▶│ AI Provider │───▶│ Question    │───▶│ Pack Builder   │ │
│  │ + Guidance  │    │ (OpenAI)    │    │ Validator   │    │ (JSON Schema)  │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └───────┬────────┘ │
│                                                                   │          │
│  ┌─────────────┐    ┌─────────────┐                              ▼          │
│  │ Pack List   │◀───│ Pack Store  │◀─────────────────────┌────────────────┐ │
│  │ UI          │    │ (Postgres)  │                      │ Cloud Upload   │ │
│  └─────────────┘    └─────────────┘                      │ (S3 presigned) │ │
│                                                          └───────┬────────┘ │
└──────────────────────────────────────────────────────────│───────────────┘
                                                           │
                    ┌──────────────────────────────────────┘
                    │ HTTP/HTTPS
                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           CLOUD STORAGE (S3)                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ question-packs/                                                         │ │
│  │  ├── pack-{id}-v{version}.json    # Pack files                          │ │
│  │  ├── pack-{id}-v{version}.checksum.sha256                              │ │
│  │  └── index.json                   # Pack manifest                       │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
                    │
                    │ Download (presigned URL)
                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           MOBILE APP (Consumer)                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ Pack Browser│───▶│ Download    │───▶│ Validator   │───▶│ WatermelonDB│  │
│  │ Screen      │    │ Service     │    │ (Zod)       │    │ Pack Cache  │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └──────┬──────┘  │
                                                                   │         │
│  ┌─────────────┐    ┌─────────────┐                              ▼         │
│  │ Game Screen │◀───│ Question    │◀─────────────────────┌─────────────┐   │
│  │ (existing)  │    │ Store       │                      │ Pack Model  │   │
│  └─────────────┘    └─────────────┘                      └─────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Recommended Project Structure

### Monorepo Root

```
trivial-world/
├── apps/
│   ├── mobile/                    # Existing Expo app (relocated)
│   │   ├── app/                   # Expo Router screens
│   │   │   ├── index.tsx          # Home screen
│   │   │   ├── game/              # Game screens (existing)
│   │   │   │   ├── setup.tsx
│   │   │   │   ├── roll.tsx
│   │   │   │   ├── move.tsx
│   │   │   │   ├── question.tsx
│   │   │   │   ├── results.tsx
│   │   │   │   └── _layout.tsx
│   │   │   └── packs/             # NEW: Pack management screens
│   │   │       ├── index.tsx      # Pack browser
│   │   │       ├── [id].tsx       # Pack details
│   │   │       └── _layout.tsx
│   │   ├── components/            # Existing UI components
│   │   ├── stores/                # Zustand stores
│   │   │   ├── gameStore.ts       # Existing
│   │   │   ├── playerStore.ts     # Existing
│   │   │   ├── questionStore.ts   # Modified (filter by pack)
│   │   │   └── packStore.ts       # NEW
│   │   ├── database/              # NEW: WatermelonDB (migrated from AsyncStorage)
│   │   │   ├── schema.ts          # DB schema
│   │   │   ├── models/
│   │   │   │   ├── Question.ts
│   │   │   │   ├── QuestionPack.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts           # Database export
│   │   ├── services/              # NEW: Pack services
│   │   │   ├── packDownloader.ts  # Download + cache
│   │   │   ├── packValidator.ts   # Zod validation
│   │   │   └── packSync.ts        # Check for updates
│   │   ├── constants/
│   │   ├── types/                 # Local types only
│   │   └── app.json
│   │
│   └── generator/                 # NEW: Next.js 15 web app
│       ├── app/                   # App Router
│       │   ├── layout.tsx
│       │   ├── page.tsx           # Landing
│       │   ├── create/            # Question generation
│       │   │   ├── page.tsx       # Generator UI
│       │   │   └── generate/route.ts  # AI endpoint
│       │   ├── packs/             # Pack management
│       │   │   ├── page.tsx       # List packs
│       │   │   ├── [id]/page.tsx  # Edit pack
│       │   │   └── new/page.tsx   # Create new
│       │   └── api/               # REST endpoints
│       │       ├── packs/route.ts
│       │       ├── packs/[id]/route.ts
│       │       └── upload/route.ts
│       ├── components/            # Editor components
│       │   ├── QuestionEditor.tsx
│       │   ├── CategorySelector.tsx
│       │   └── PackPreview.tsx
│       ├── lib/
│       │   ├── ai/                # AI integration
│       │   │   ├── openai.ts       # OpenAI client
│       │   │   └── prompts.ts      # Question generation prompts
│       │   ├── storage/            # Cloud storage
│       │   │   └── s3.ts           # S3 client
│       │   └── db/                 # Database
│       │       └── postgres.ts     # Prisma/Drizzle client
│       ├── prisma/                 # Database schema
│       │   └── schema.prisma
│       └── next.config.ts
│
├── packages/
│   └── types/                     # @trivial-world/types
│       ├── src/
│       │   ├── index.ts           # Public exports
│       │   ├── question-pack.ts   # Pack Zod schemas
│       │   ├── category.ts        # Category constants
│       │   ├── question.ts        # Question types
│       │   └── json-schema.ts     # JSON Schema exports
│       ├── package.json
│       └── tsconfig.json
│
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### Structure Rationale

- **`packages/types`**: Single source of truth for question pack schema. Both apps import from this package, ensuring mobile can validate what generator produces.
- **`apps/mobile/database`**: WatermelonDB for offline-first pack caching. Downloads once, validates with Zod, persists to SQLite.
- **`apps/generator/lib/ai`**: Isolated AI integration makes it easy to swap providers (OpenAI, Anthropic, local models).
- **`apps/generator/lib/storage`**: Abstraction layer for cloud storage. S3-compatible with presigned URLs for secure downloads.

---

## Question Pack Schema Design

### Zod-First Type Definition

```typescript
// packages/types/src/question-pack.ts
import { z } from 'zod';

// Category enum (must match existing game categories)
export const CategorySchema = z.enum([
  'blue',    // The World Outside
  'pink',    // Pop Culture & Streaming
  'yellow',  // Milestones & Myths
  'purple',  // Animation and Artwork
  'green',   // Tech, Space & Logic
  'orange',  // Sports & Gaming
]);
export type Category = z.infer<typeof CategorySchema>;

// Difficulty levels
export const DifficultySchema = z.enum(['easy', 'medium', 'hard']);
export type Difficulty = z.infer<typeof DifficultySchema>;

// Single question
export const QuestionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),  // URL-safe ID
  category: CategorySchema,
  questionText: z.string().min(10).max(500),
  answerText: z.string().min(1).max(200),
  difficulty: DifficultySchema.optional(),
  // Future: multiple choice support
  choices: z.array(z.string()).max(6).optional(),
  correctChoiceIndex: z.number().int().min(0).optional(),
  // Metadata
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  author: z.string().optional(),
  source: z.string().url().optional(),
});
export type Question = z.infer<typeof QuestionSchema>;

// Pack metadata
export const PackMetadataSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),  // SemVer
  author: z.string().min(1).max(100),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  // Category breakdown
  categoryCounts: z.record(CategorySchema, z.number().int().min(0)),
  totalQuestions: z.number().int().min(1),
  // Validation checksums
  checksum: z.string().regex(/^[a-f0-9]{64}$/),  // SHA-256
  schemaVersion: z.literal('1.0.0'),
  // Mobile delivery optimization
  contentEncoding: z.enum(['gzip', 'identity']).default('gzip'),
  size: z.number().int().positive(),  // Bytes (uncompressed)
});
export type PackMetadata = z.infer<typeof PackMetadataSchema>;

// Full question pack
export const QuestionPackSchema = z.object({
  metadata: PackMetadataSchema,
  questions: z.array(QuestionSchema).min(20),  // Minimum 20 questions per pack
});
export type QuestionPack = z.infer<typeof QuestionPackSchema>;

// Pack index (for browsing available packs)
export const PackIndexEntrySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  author: z.string(),
  version: z.string(),
  totalQuestions: z.number(),
  categoryCounts: z.record(CategorySchema, z.number()),
  downloadUrl: z.string().url(),
  checksum: z.string(),
  size: z.number(),
});
export type PackIndexEntry = z.infer<typeof PackIndexEntrySchema>;
```

### JSON Schema Export

```typescript
// packages/types/src/json-schema.ts
import { zodToJsonSchema } from 'zod-to-json-schema';
import { QuestionPackSchema, QuestionSchema, PackMetadataSchema } from './question-pack';

// Export JSON Schema for validation in environments without Zod
export const questionPackJsonSchema = zodToJsonSchema(QuestionPackSchema, {
  $refStrategy: 'none',
  target: 'jsonSchema7',
});

export const questionJsonSchema = zodToJsonSchema(QuestionSchema);

export const packMetadataJsonSchema = zodToJsonSchema(PackMetadataSchema);

// Can be used with AJV or other JSON Schema validators
```

### Validation Example

```typescript
// apps/mobile/services/packValidator.ts
import { QuestionPackSchema, QuestionPack } from '@trivial-world/types';

export function validatePack(json: unknown): QuestionPack | null {
  const result = QuestionPackSchema.safeParse(json);
  if (!result.success) {
    console.error('Pack validation failed:', result.error.issues);
    return null;
  }
  return result.data;
}

// Stream validation for large packs
export async function validatePackStream(stream: ReadableStream): Promise<QuestionPack | null> {
  try {
    const text = await new Response(stream).text();
    const json = JSON.parse(text);
    return validatePack(json);
  } catch (error) {
    console.error('Pack parsing failed:', error);
    return null;
  }
}
```

---

## Architectural Patterns

### Pattern 1: Contract-First Development

**What:** Define schemas in shared `@trivial-world/types` before implementation. Both apps depend on this contract.

**When to use:** Use for all shared data structures (question packs, categories, validation rules).

**Trade-offs:**
- (+) Ensures generator output matches mobile expectations
- (+) Single source of truth, no drift between apps
- (+) Runtime validation on both ends with Zod
- (-) Extra package to manage
- (-) Need to version schema carefully for backward compatibility

**Example:**
```typescript
// generator/lib/ai/prompts.ts
import { Category, CATEGORY_NAMES } from '@trivial-world/types';

export function buildPrompt(topic: string, category: Category): string {
  const categoryName = CATEGORY_NAMES[category];
  return `Generate a trivia question about "${topic}" for the "${categoryName}" category.
The question should be factually accurate and appropriate for social gameplay.
Format your response as JSON matching this schema: {...}`;
}

// mobile/services/packValidator.ts
import { QuestionPackSchema } from '@trivial-world/types';

// Same schema used on both ends - ensures compatibility
```

### Pattern 2: Offline-First Pack Caching

**What:** Download question packs once, cache in WatermelonDB, play offline indefinitely.

**When to use:** All pack consumption in mobile app.

**Trade-offs:**
- (+) Zero network dependency for gameplay
- (+) Instant question loading (no spinner)
- (+) Works on airplane, no data needed
- (-) Requires storage management (delete old packs)
- (-) Pack updates need explicit sync

**Example:**
```typescript
// mobile/database/models/QuestionPack.ts
import { Model, Q } from '@nozbe/watermelondb';
import { field, relation, children } from '@nozbe/watermelondb/decorators';

export class QuestionPackModel extends Model {
  static table = 'question_packs';

  @field('pack_id') packId!: string;
  @field('name') name!: string;
  @field('version') version!: string;
  @field('author') author!: string;
  @field('downloaded_at') downloadedAt!: number;
  @field('checksum') checksum!: string;
  @field('is_active') isActive!: boolean;

  // Relation to questions
  @children('questions') questions!: Query<QuestionModel>;

  // Get questions by category
  getQuestionsByCategory(category: Category) {
    return this.questions.extend(Q.where('category', category));
  }
}

// mobile/services/packDownloader.ts
export async function downloadPack(packId: string): Promise<void> {
  const packEntry = await fetchPackIndexEntry(packId);
  const response = await fetch(packEntry.downloadUrl);

  const packJson = await response.json();
  const validated = validatePack(packJson);
  if (!validated) throw new Error('Pack validation failed');

  // Verify checksum
  const computedChecksum = await computeSha256(JSON.stringify(validated));
  if (computedChecksum !== packEntry.checksum) {
    throw new Error('Checksum mismatch - pack may be corrupted');
  }

  // Store in WatermelonDB
  await database.write(async () => {
    const pack = await database.get('question_packs').create((p: QuestionPackModel) => {
      p.packId = validated.metadata.id;
      p.name = validated.metadata.name;
      p.version = validated.metadata.version;
      p.downloadedAt = Date.now();
      p.checksum = packEntry.checksum;
      p.isActive = true;
    });

    // Bulk insert questions
    for (const q of validated.questions) {
      await database.get('questions').create((question: QuestionModel) => {
        question.questionPackId = pack.id;
        question.questionId = q.id;
        question.category = q.category;
        question.questionText = q.questionText;
        question.answerText = q.answerText;
        question.difficulty = q.difficulty || 'medium';
      });
    }
  });
}
```

### Pattern 3: Presigned URL Downloads

**What:** Generator generates presigned S3 URLs for secure, time-limited pack downloads.

**When to use:** Pack download requests from mobile app.

**Trade-offs:**
- (+) No authentication needed on mobile (no user accounts)
- (+) URLs expire after configurable time
- (+) Direct client-to-S3 transfer (no server proxy)
- (+) CDN-cacheable for popular packs
- (-) URL can be shared (but expires quickly)
- (-) Requires S3-compatible storage

**Example:**
```typescript
// generator/lib/storage/s3.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function uploadPack(packId: string, content: string): Promise<string> {
  const key = `question-packs/${packId}.json`;

  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: content,
    ContentType: 'application/json',
    ContentEncoding: 'gzip',
  }));

  return key;
}

export async function getPresignedDownloadUrl(packId: string, version: string): Promise<string> {
  const key = `question-packs/${packId}-v${version}.json`;

  const url = await getSignedUrl(s3, new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
  }), { expiresIn: 3600 }); // 1 hour

  return url;
}

// generator/api/packs/[id]/route.ts
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  // Get pack metadata from database
  const pack = await db.questionPacks.findUnique({ where: { id } });
  if (!pack) return new Response('Not found', { status: 404 });

  // Generate presigned URL
  const downloadUrl = await getPresignedDownloadUrl(pack.id, pack.version);

  return Response.json({
    ...pack,
    downloadUrl,
  });
}
```

### Pattern 4: AI-Powered Question Generation

**What:** Web app uses LLM (OpenAI GPT-4) to generate questions from topic + guidance input.

**When to use:** Question creation in generator web app.

**Trade-offs:**
- (+) Infinite question supply
- (+) Customizable for specific topics
- (+) Consistent formatting via prompt engineering
- (-) AI can generate inaccurate facts (needs validation)
- (-) API costs per generation
- (-) Latency on generation

**Example:**
```typescript
// generator/lib/ai/openai.ts
import OpenAI from 'openai';
import { Question, Category, CATEGORY_NAMES } from '@trivial-world/types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateQuestions(
  topic: string,
  category: Category,
  count: number = 10,
  guidance?: string
): Promise<Question[]> {
  const systemPrompt = `You are a trivia question generator for a social board game.
Generate factually accurate questions that are fun for group play.
Questions should be challenging but answerable by general knowledge enthusiasts.
Each question should have a single correct answer (no multiple choice).

Output ONLY valid JSON matching this schema:
{
  "questions": [
    { "id": "uuid", "category": "${category}", "questionText": "...", "answerText": "..." }
  ]
}`;

  const userPrompt = `Generate ${count} trivia questions about: ${topic}
Category: ${CATEGORY_NAMES[category]}
${guidance ? `Additional guidance: ${guidance}` : ''}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(response.choices[0].message.content || '{}');
  return parsed.questions || [];
}
```

---

## Data Flow

### Pack Creation Flow (Web App)

```
[User enters topic + guidance]
    ↓
[Frontend calls /api/generate]
    ↓
[AI Service generates questions]
    ↓
[Zod validates each question]
    ↓
[User reviews/edits in UI]
    ↓
[User clicks "Publish Pack"]
    ↓
[Backend validates full pack]
    ↓
[Backend computes SHA-256 checksum]
    ↓
[Backend uploads to S3 (gzip compressed)]
    ↓
[Backend saves metadata to Postgres]
    ↓
[Pack available in index]
```

### Pack Download Flow (Mobile App)

```
[User opens Pack Browser]
    ↓
[App fetches pack index from API]
    ↓
[User selects pack]
    ↓
[App requests presigned download URL]
    ↓
[App downloads JSON]
    ↓
[App decompresses (if gzip)]
    ↓
[App validates with Zod]
    ↓
[App verifies checksum]
    ↓
[App stores in WatermelonDB]
    ↓
[Pack available for gameplay]
```

### Question Selection During Gameplay (Mobile App)

```
[Player lands on category space]
    ↓
[Game Store selects category]
    ↓
[Question Store queries WatermelonDB]
    ↓
[DB returns questions NOT in askedQuestions set]
    ↓
[Store picks random from available]
    ↓
[Store marks as asked]
    ↓
[UI displays question]
```

---

## WatermelonDB Schema

```typescript
// mobile/database/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 2,  // Incremented from v1 (original game)
  tables: [
    // NEW: Question packs table
    tableSchema({
      name: 'question_packs',
      columns: [
        { name: 'pack_id', type: 'string' },      // UUID from pack metadata
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'version', type: 'string' },      // SemVer string
        { name: 'author', type: 'string' },
        { name: 'downloaded_at', type: 'number' }, // Timestamp
        { name: 'checksum', type: 'string' },     // SHA-256
        { name: 'is_active', type: 'boolean' },   // Selected for gameplay
        { name: 'category_counts', type: 'string' }, // JSON string
      ],
    }),
    // NEW: Questions table (replaces hardcoded questions)
    tableSchema({
      name: 'questions',
      columns: [
        { name: 'question_pack_id', type: 'string' }, // Relation to pack
        { name: 'question_id', type: 'string' },      // ID within pack
        { name: 'category', type: 'string' },         // PlayerColor
        { name: 'question_text', type: 'string' },
        { name: 'answer_text', type: 'string' },
        { name: 'difficulty', type: 'string', isOptional: true },
        { name: 'choices', type: 'string', isOptional: true }, // JSON array
        { name: 'correct_choice_index', type: 'number', isOptional: true },
        { name: 'asked_at', type: 'number', isOptional: true }, // Timestamp or null
      ],
    }),
    // EXISTING: Game sessions (unchanged)
    tableSchema({
      name: 'game_sessions',
      columns: [
        { name: 'created_at', type: 'number' },
        { name: 'completed_at', type: 'number', isOptional: true },
        { name: 'winner_id', type: 'string', isOptional: true },
      ],
    }),
  ],
});
```

---

## API Contract

### Pack Index Endpoint

```
GET /api/v1/packs

Response:
{
  "packs": [
    {
      "id": "uuid",
      "name": "Pop Culture 2020s",
      "author": "Faiser",
      "version": "1.0.0",
      "totalQuestions": 120,
      "categoryCounts": {
        "blue": 20,
        "pink": 20,
        "yellow": 20,
        "purple": 20,
        "green": 20,
        "orange": 20
      },
      "downloadUrl": "https://storage.../pack-uuid-v1.0.0.json?signature=...",
      "checksum": "sha256...",
      "size": 45000,
      "createdAt": "2026-06-08T..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

### Pack Download Endpoint

```
GET /api/v1/packs/{id}?version=1.0.0

Response (presigned URL redirect or direct JSON):
{
  "downloadUrl": "https://storage.../pack-{id}-v{version}.json?X-Amz-...",
  "expiresAt": "2026-06-08T12:00:00Z"
}

Or direct download (for small packs):
{
  "metadata": { ... },
  "questions": [ ... ]
}
```

### Pack Creation Endpoint (Generator)

```
POST /api/v1/packs

Request:
{
  "name": "My Custom Pack",
  "description": "Questions about...",
  "questions": [ ... ]  // Array of Question objects
}

Response:
{
  "id": "uuid",
  "downloadUrl": "...",
  "checksum": "...",
  "createdAt": "..."
}
```

---

## Integration Points

### Existing Code Changes

| File | Changes Required |
|------|------------------|
| `data/questions/index.ts` | Replace with WatermelonDB query; remove hardcoded imports |
| `stores/questionStore.ts` | Query from WatermelonDB instead of static array; add pack selection |
| `stores/gameStore.ts` | Track active pack ID; reset asked questions per pack |
| `types/question.ts` | Extend with `packId` field; import from `@trivial-world/types` |
| `types/game.ts` | Add `activePackId` to game state |
| `app/game/setup.tsx` | Add pack selection UI |

### New Components Required

| Component | Location | Purpose |
|-----------|----------|---------|
| `PackBrowser` | `app/packs/index.tsx` | List available packs, show download status |
| `PackDetails` | `app/packs/[id].tsx` | Pack info, category breakdown, download button |
| `PackSelector` | `components/PackSelector.tsx` | Modal for selecting active pack during game setup |
| `DownloadProgress` | `components/DownloadProgress.tsx` | Progress bar for pack downloads |
| `PackStatusBadge` | `components/PackStatusBadge.tsx` | Visual indicator (downloaded, new, update available) |

### WatermelonDB Migration

```typescript
// mobile/database/migrations/002_add_question_packs.ts
import { schemaMigrations, addTables } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addTables([
          {
            name: 'question_packs',
            columns: [
              { name: 'pack_id', type: 'string' },
              { name: 'name', type: 'string' },
              { name: 'description', type: 'string', isOptional: true },
              { name: 'version', type: 'string' },
              { name: 'author', type: 'string' },
              { name: 'downloaded_at', type: 'number' },
              { name: 'checksum', type: 'string' },
              { name: 'is_active', type: 'boolean' },
              { name: 'category_counts', type: 'string' },
            ],
          },
          {
            name: 'questions',
            columns: [
              { name: 'question_pack_id', type: 'string' },
              { name: 'question_id', type: 'string' },
              { name: 'category', type: 'string' },
              { name: 'question_text', type: 'string' },
              { name: 'answer_text', type: 'string' },
              { name: 'difficulty', type: 'string', isOptional: true },
              { name: 'choices', type: 'string', isOptional: true },
              { name: 'correct_choice_index', type: 'number', isOptional: true },
              { name: 'asked_at', type: 'number', isOptional: true },
            ],
          },
        ]),
      ],
    },
  ],
});
```

---

## Build Order

### Phase 6: Question Pack Structure

**Goal:** Define TypeScript types, JSON Schema, and validation.

**Dependencies:** None (foundation for phases 7-8)

**Steps:**
1. Create monorepo structure with Turborepo
2. Create `packages/types` with Zod schemas
3. Export JSON Schema from Zod schemas
4. Update mobile app to import types from `@trivial-world/types`
5. Add WatermelonDB schema for question_packs and questions tables
6. Write migration from hardcoded questions to DB
7. Update questionStore to query WatermelonDB

**Verification:**
- Mobile app compiles with new types package
- Question pack Zod schema validates example JSON
- JSON Schema exported correctly for generator use
- WatermelonDB schema passes validation
- Existing questions migrated to database on first run

### Phase 7: Question Generator Web App

**Goal:** Build web app for AI-powered question generation with cloud storage.

**Dependencies:** Phase 6 (types package)

**Steps:**
1. Create Next.js 15 app in `apps/generator`
2. Install shared types package
3. Create PostgreSQL schema (Prisma or Drizzle) for pack metadata
4. Build AI question generation endpoint (OpenAI integration)
5. Create question editor UI (review/edit generated questions)
6. Build pack management UI (create, edit, delete)
7. Implement S3 upload with presigned URLs
8. Create REST API endpoints for pack CRUD
9. Deploy to Vercel (or equivalent)

**Verification:**
- Generator app runs independently
- AI generates valid questions matching Zod schema
- Questions validated on submit
- Pack uploaded to S3 with checksum
- Pack metadata stored in Postgres
- Pack downloadable via presigned URL

### Phase 8: Game Configuration in Mobile App

**Goal:** Enable pack selection, download, and management in mobile app.

**Dependencies:** Phase 6 (types, DB schema), Phase 7 (generator API)

**Steps:**
1. Create `PackBrowser` screen (`app/packs/index.tsx`)
2. Create `PackDetails` screen (`app/packs/[id].tsx`)
3. Implement pack download service (`services/packDownloader.ts`)
4. Add pack validation with Zod
5. Implement checksum verification
6. Add pack status tracking in WatermelonDB
7. Create `PackSelector` component for game setup
8. Update `gameStore` to track active pack
9. Update `questionStore` to filter by active pack
10. Add pack management UI (delete, update check)

**Verification:**
- Pack browser displays available packs from API
- Download completes successfully
- Pack validates against Zod schema
- Checksum matches
- Pack appears in game setup
- Questions from selected pack load during gameplay
- Asked questions tracked per pack
- Offline gameplay works with downloaded pack

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Single Next.js instance, S3 standard, SQLite on mobile |
| 1k-10k users | Add CloudFront CDN for pack downloads, database read replicas |
| 10k-100k users | API rate limiting, pack caching on CDN, background sync jobs |
| 100k+ users | Multi-region S3, pack pre-bundling, aggressive CDN caching |

### Scaling Priorities

1. **First bottleneck:** Pack download bandwidth. Use CloudFront CDN with long cache headers.
2. **Second bottleneck:** API database queries. Add read replicas, implement pagination.
3. **Third bottleneck:** AI generation costs. Batch generation, local model fallback for development.

---

## Anti-Patterns

### Anti-Pattern 1: Storing Questions in AsyncStorage

**What people do:** Store downloaded JSON in AsyncStorage.

**Why it's wrong:** AsyncStorage is key-value (O(n) queries), limited to 6MB, no indexing by category.

**Do this instead:** Use WatermelonDB for structured queries, AsyncStorage only for simple settings.

### Anti-Pattern 2: Embedding Questions in Pack Metadata

**What people do:** Return questions inline with pack metadata from API.

**Why it's wrong:** Large JSON payloads (100+ KB), slow on mobile networks, can't cache separately.

**Do this instead:** Return metadata + presigned URL. Download pack file separately. CDN caches pack file, API returns small metadata JSON.

### Anti-Pattern 3: Skipping Checksum Verification

**What people do:** Trust downloaded JSON without verifying checksum.

**Why it's wrong:** Corrupted downloads cause crashes; malicious content could be injected.

**Do this instead:** Always compute SHA-256 and compare against metadata before storing.

### Anti-Pattern 4: AI Questions Without Validation

**What people do:** Trust AI-generated questions without review.

**Why it's wrong:** LLMs hallucinate facts, produce inconsistent formatting, generate duplicates.

**Do this instead:** Validate every generated question with Zod schema. Require human review before publishing. Run deduplication check against existing questions.

### Anti-Pattern 5: Global Asked Questions Set

**What people do:** Single global `askedQuestions` set for all packs.

**Why it's wrong:** Switching packs doesn't reset asked state. Questions repeat unexpectedly.

**Do this instead:** Track `askedAt` timestamp per question. Reset per-pack, or query `askedAt IS NULL` for new games.

---

## Sources

- [WatermelonDB Schema Documentation](https://watermelondb.dev/docs/Schema) - Column types, relations, optional fields
- [WatermelonDB Sync Frontend](https://watermelondb.dev/docs/Sync/Frontend) - Sync protocol, pull/push changes
- [Offline-First Apps with WatermelonDB](https://usamasoft.com/blog/offline-first-apps-react-native-watermelondb) - Production schema patterns, soft deletes
- [Building Offline-First App with Expo + Supabase + WatermelonDB](https://www.themorrow.digital/blog/building-an-offline-first-app-with-expo-supabase-and-watermelondb) - Server-side sync implementation
- [Sunbird inQuiry QuestionSet Schema](https://inquiry.sunbird.org/learn/product-and-developer-guide/question-and-question-set-service/schema/questionset-schema) - Content versioning, mobile delivery fields
- [trivia-schema JSON Schema](https://github.com/gaufqwi/trivia-schema) - Comprehensive pub quiz schema, answer types
- [Type-Safe Types in Monorepos](https://www.codefixeshub.com/typescript/managing-types-in-a-monorepo-with-typescript) - Shared types package structure
- [Modern Monorepo Architecture](https://tech-andgar.me/posts/modernizing-monorepo-architecture/) - Turborepo patterns, pnpm workspaces
- [Expo + Next.js Monorepo Examples](https://github.com/TimurBas/expo-nextjs-monorepo) - Structure, shared packages
- [Cloud Storage for Mobile Apps](https://deepwiki.com/expo/examples/6.3-cloud-storage-solutions) - Presigned URLs, direct uploads
- [react-native-cloud-storage](https://context7.com/kuatsu/react-native-cloud-storage/llms.txt) - iCloud/Google Drive patterns
- [S3 Presigned URLs Best Practices](https://expo.dev/blog/faster-more-reliable-video-uploads-with-expo-modules) - Background uploads, progress tracking

---
*Architecture research for: Question Pack System*
*Researched: 2026-06-08*