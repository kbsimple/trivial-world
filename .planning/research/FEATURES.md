# Feature Research

**Domain:** Question Pack System for Mobile Trivia Game
**Researched:** 2026-06-08
**Confidence:** HIGH (multiple sources, production patterns documented)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Question Pack Selection** | Users expect to choose what content to play, similar to selecting quiz topics in other apps | LOW | Simple list UI. Already have category system in place. Depends on: pack storage model |
| **Category Organization** | Trivia apps organize by categories (history, science, pop culture) - this is universal | LOW | Already implemented with 6 categories. Packs should respect or extend this |
| **Pack Metadata Display** | Users want to know pack name, description, question count before selecting | LOW | Standard card/list UI with pack details |
| **Basic Difficulty Levels** | Easy/Medium/Hard is the standard trivia difficulty pattern | MEDIUM | Affects question generation prompts and pack filtering |
| **Question Accuracy** | Incorrect questions damage trust rapidly; users notice factual errors immediately | HIGH | 19% of AI question failures are factual hallucinations (2026 study) |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **AI-Powered Generation from Topics** | Users create custom packs from any topic ("80s movies", "local history", "my company") - unique vs. static content competitors | MEDIUM | Prompt engineering critical. Study shows 69% AI questions usable with minor edits, 31% need revision |
| **Question Explanations** | Show why an answer is correct - educational value, builds trust, reduces post-question disputes in social play | MEDIUM | Adds ~50% content size, significant value for social trivia where conductor reads explanation |
| **Quality Score Indicators** | Visual confidence scores help conductors decide if pack is "game night ready" | MEDIUM | Combine: factual verification pass rate, question variety, source citations |
| **Cross-Session No-Repeat** | Remember questions asked across game sessions - prevents "we just did this question" frustration | MEDIUM | Requires persistent tracking with pack-scoped IDs. Already have game state persistence |
| **Custom Question Packs (CRUD)** | Hosts create their own question packs for events (corporate events, parties, classrooms) | HIGH | Full CRUD interface. Higher value for conductor-led social play |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Real-Time Multiplayer Sync** | "Everyone should see the app simultaneously" | Undermines conductor model, adds 10x complexity, requires accounts and networking infrastructure | Conductor reads aloud (current model) - eyes-up social design |
| **User Accounts for Pack Sync** | "Save my packs across devices" | Friction kills social gameplay - adds onboarding barrier, breaks spontaneous play | Local-first storage, optional cloud backup later |
| **Community Question Submission** | "Let users submit questions" | Quality control nightmare, moderation overhead, legal liability | AI generation with human review is more scalable |
| **Real-Time Fact Checking** | "Verify every question during generation" | 6.7-34s latency per question (OpenAI Guardrails), high cost, breaks generation flow | Generate batch, validate offline, flag low-confidence for human review |
| **Infinite Question Generation** | "Never run out of questions" | Without deduplication, AI generates similar questions; 43% of failures are weak distractors | Semantic deduplication (FAISS embeddings) + explicit uniqueness tracking |

## Feature Dependencies

```
Question Pack Selection
    └──requires──> Pack Storage Model (local-first)
    └──requires──> Pack Metadata Schema

AI-Powered Generation
    └──requires──> Pack Metadata Schema
    └──requires──> Question Schema with Validation
    └──requires──> Generation Prompt Templates
    └──enhances──> Question Explanations

Question Validation
    └──requires──> Quality Score Framework
    └──enhances──> AI-Powered Generation (feedback loop)

Pack Download (Cloud)
    └──requires──> Pack Storage Model
    └──requires──> Version Tracking (migrations)
    └──requires──> Integrity Verification (checksums)

Game Configuration
    └──requires──> Pack Selection (config applies to selected pack)
    └──requires──> Configuration Schema
    └──independent──> Question Generation

Custom Question Packs (CRUD)
    └──requires──> Question Validation
    └──requires──> AI-Powered Generation
    └──requires──> Question Explanations
    └──conflicts──> Real-Time Multiplayer (different UX model)
```

### Dependency Notes

- **Pack Storage Model is foundational:** All pack features depend on this. Design schema first.
- **AI Generation depends on Question Schema:** Cannot generate without knowing the output format.
- **Validation is separate from Generation:** Validation can run offline, asynchronously after batch generation.
- **Pack Download conflicts with Offline-First philosophy:** Must maintain local-first capability; cloud is enhancement, not replacement.

## Question Pack Schema (Recommended)

Based on analysis of [trivia-schema](https://github.com/gaufqwi/trivia-schema) and [JSON Quiz Format](https://json-quiz.github.io/json-quiz):

```typescript
// Core types
interface QuestionPack {
  id: string;                    // UUID v4
  version: string;               // SemVer (e.g., "1.2.0")
  schemaVersion: string;         // Schema version for migrations
  name: string;                  // Display name
  description: string;           // Short description
  author: string;                // Creator name or "Trivial World"
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601

  categories: CategoryConfig[];  // Categories in this pack
  questions: Question[];          // All questions
  metadata: PackMetadata;        // Generation info, quality scores

  checksum: string;              // SHA-256 of content for integrity
}

interface Question {
  id: string;                    // UUID v4
  category: string;              // References category ID
  text: string;                  // Question text
  type: 'multiple-choice';       // Future: 'true-false', 'open'
  options: string[];             // 4 options for multiple choice
  correctIndex: number;          // 0-3
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;          // Why answer is correct
  source?: string;               // Citation or "AI Generated"
  lastVerified?: string;         // ISO 8601, when last fact-checked
  tags?: string[];               // For search/filter
}

interface PackMetadata {
  generatedBy: 'human' | 'ai' | 'hybrid';
  aiModel?: string;              // e.g., "gpt-4o-mini"
  promptTemplate?: string;       // Template ID used
  qualityScore?: number;         // 0-100
  validationStatus: 'pending' | 'validated' | 'flagged';
  estimatedPlayTime?: number;    // Minutes
}

interface CategoryConfig {
  id: string;                    // Matches existing category IDs
  color: string;                 // Hex color
  name: string;                  // Display name
  questionCount: number;         // Questions in this category
}
```

### Schema Rationale

- **Version + SchemaVersion separate:** Content versioning (1.0.0 to 1.1.0) separate from schema migrations (v1 to v2)
- **Checksum for offline integrity:** Detects corruption after iOS app updates or failed downloads
- **Quality metadata:** Enables filtering by validation status before game use
- **Explanation optional:** Reduces storage for packs without explanations, but highly recommended

## AI Question Generation Patterns

### Prompt Template (Recommended Structure)

Based on analysis of [Maastricht University Prompt Library](https://library.maastrichtuniversity.nl/apps-tools/ai-prompt-library/create-multiple-choice-questions/), [QuizGPT Package](https://pypi.org/project/quizgpt/), and [MCQ Creation Assistant](https://github.com/linexjlin/GPTs/blob/main/prompts/MCQ%20Creation%20Assistant.md):

```typescript
interface GenerationPrompt {
  // Input
  topic: string;                  // "Marvel Cinematic Universe"
  category: string;               // Maps to category ID
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount: number;          // Target count
  context?: string;               // Additional guidance

  // Constraints (embedded in prompt)
  outputFormat: 'json';           // Enforce JSON output
  distractorQuality: 'high';      // Generate plausible wrong answers
  includeExplanation: boolean;
  includeSource: boolean;
}

// Prompt template
const buildPrompt = (config: GenerationPrompt): string => `
Generate ${config.questionCount} trivia questions about "${config.topic}".

**Category:** ${config.category}
**Difficulty:** ${config.difficulty}

**Rules:**
1. Each question has exactly 4 options, exactly 1 correct answer
2. Distractors must be plausible but clearly incorrect to someone who knows the topic
3. Avoid "All of the above" and "None of the above"
4. Questions should test ${difficultyDepthMap[config.difficulty]}
5. Include a brief explanation for the correct answer
6. Include a citation or source reference

**Output Format (JSON only, no markdown, no explanation):**
${JSON.stringify(exampleQuestionSchema, null, 2)}

**Topic Context:**
${config.context || 'No additional context provided'}

Generate now. Return ONLY valid JSON array.
`;
```

### Quality Control Pipeline

Based on [2026 AI Quiz Generation Study](https://simplequizmaker.com/blog/ai-quiz-generation-data-study-2026) findings:

```
1. GENERATE BATCH (5-10 questions per request)
   +-- Use temperature 0.2-0.3 for consistency
   +-- Force JSON output with response_format: {"type": "json_object"}

2. SCHEMA VALIDATION
   +-- Parse JSON, validate against Question schema
   +-- Reject malformed questions
   +-- Retry up to 2 times

3. DEDUPLICATION CHECK
   +-- Compute semantic embeddings (FAISS/bge-small)
   +-- Compare against existing questions in pack
   +-- Flag duplicates for removal

4. FACTUAL VERIFICATION (Batch)
   +-- Run offline or async, not during generation
   +-- Use NLI-based checker (Provenance/FactLens) for speed
   +-- Flag low-confidence items for human review

5. HUMAN REVIEW QUEUE
   +-- Questions with qualityScore < 70
   +-- Questions with validationStatus: 'flagged'
   +-- First-time generated questions
```

### Difficulty Calibration

Per [PolarNotes MCQ Prompts](https://www.polarnotesai.com/prompts/multiple-choice-chatgpt-difficulty-control/):

| Difficulty | Bloom's Level | Prompt Guidance | Quality Rate |
|------------|---------------|-----------------|--------------|
| Easy | 1-2 (Recall/Understand) | "Test basic recognition and recall" | 89% match |
| Medium | 3-4 (Apply/Analyze) | "Require application of concepts" | Drifts toward easy |
| Hard | 5-6 (Evaluate/Create) | "Require synthesis and evaluation" | Often appears hard but is not |

**Recommendation:** Generate with hard prompts, manually elevate 30-40% for true difficulty.

## Game Configuration Schema

```typescript
interface GameConfiguration {
  // Pack Settings
  selectedPackIds: string[];        // Which packs to use
  categoryFilter?: string[];        // Subset of categories (null = all)

  // Difficulty
  difficultyMode: 'mixed' | 'fixed';
  fixedDifficulty?: 'easy' | 'medium' | 'hard';

  // Timing
  timeLimitMode: 'off' | 'per-question' | 'per-turn';
  timeLimitSeconds?: number;        // If per-question or per-turn

  // Gameplay Variants
  wedgeRequirement: number;         // Wedges needed to win (default: 6)
  allowRollAgainOnCorrect: boolean; // Bonus roll after correct answer

  // Accessibility
  showTimer: boolean;
  showDifficulty: boolean;
  autoAdvance: boolean;             // Auto-advance after answer

  // AI Generation (for custom packs)
  generationSettings?: {
    model: 'gpt-4o-mini' | 'gpt-4o';
    temperature: number;
    includeExplanations: boolean;
  };
}
```

### Configuration UI Patterns

Based on [Mobile Game Settings UX](https://reactnative.live/designing-emulation-like-config-uis-for-mobile-games-lessons):

1. **Presets First:** Quick Game (defaults), Custom Game (full config), Custom Pack (AI generation)
2. **Inline Explanations:** "Time limit adds pressure for competitive play"
3. **Defaults for Social Play:**
   - Time limit: OFF (conductor reads at group pace)
   - Difficulty: MIXED (mixed skill levels in social groups)
   - Auto-advance: OFF (conductor controls pacing)

## Pack Download Architecture

Based on [Kuratour Case Study](https://expo.dev/blog/the-offline-first-multilingual-audio-tour-app-built-with-expo) and [WatermelonDB Patterns](https://github.com/FastheDeveloper/watermelondb-expo-offline-demo):

```typescript
interface PackDownloadManager {
  // Core operations
  downloadPack(packId: string): Promise<QuestionPack>;
  verifyIntegrity(pack: QuestionPack): Promise<boolean>;
  storeLocally(pack: QuestionPack): Promise<void>;

  // Version management
  checkForUpdates(packId: string): Promise<VersionInfo>;
  migratePack(pack: QuestionPack, fromVersion: string): Promise<QuestionPack>;
}

// Key patterns:
// 1. Download to temp location, verify checksum, then move to storage
// 2. Store schema version alongside pack for migration handling
// 3. Keep last-known-good version as rollback
// 4. Use expo-file-system for downloads, expo-sqlite for metadata
```

### Download Flow

```
[Cloud Pack Repository]
        |
        v downloadPack()
[Temporary Storage] --verifyIntegrity()--> [Fail: Delete temp, retry]
        |
        v (on success)
[Local Pack Storage] --updateIndex()--> [Pack List UI]
        |
        +--keepPreviousVersion()--> [Rollback Available]
```

## Validation Patterns

Based on [RefChecker](https://arxiv.org/pdf/2405.14486), [Provenance](https://arxiv.org/html/2411.01022), and [OpenAI Guardrails](https://openai.github.io/openai-guardrails-python/ref/checks/hallucination_detection/):

| Validation Type | When to Use | Latency | Cost |
|-----------------|-------------|---------|------|
| **Schema Validation** | Every generated question | <10ms | Free |
| **Semantic Deduplication** | During pack creation | ~50ms/question | Low |
| **NLI Fact Checking** | Batch validation (Provenance) | ~100ms/question | Low |
| **LLM-as-Judge** | Flagged questions only | 5-30s/question | High |
| **Human Review** | Final quality gate | Variable | Manual |

**Recommendation:**
- Schema validation: Always (inline during generation)
- Deduplication: Always (inline)
- NLI checking: Batch after generation (async)
- LLM judge: Only for flagged items (low volume)
- Human review: Only for packs marked for public distribution

## MVP Definition

### Launch With (v2.0)

Minimum viable product - what is needed to validate the question pack concept.

- [ ] **Question Pack Storage Model** - Local-first schema with versioning
- [ ] **Pack Selection UI** - List, select, view metadata
- [ ] **Basic Game Configuration** - Pack selection, difficulty filter
- [ ] **Pack Metadata Display** - Name, description, question count, categories
- [ ] **Schema Validation for Questions** - JSON schema validation on import

### Add After Validation (v2.1)

Features to add once pack storage is validated.

- [ ] **AI Question Generation** - Topic input, category selection, batch generation
- [ ] **Generation Prompts** - Template library for different subjects
- [ ] **Question Explanations** - Include in generation, display after answer

### Future Consideration (v2.x+)

Features to defer until pack system is stable.

- [ ] **Cloud Pack Repository** - Download packs from central server
- [ ] **Quality Score System** - Aggregate validation results into pack quality score
- [ ] **Custom Pack CRUD** - Full create/edit/delete for user packs
- [ ] **Cross-Session No-Repeat** - Track asked questions across game sessions

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Pack Storage Model | HIGH | MEDIUM | P1 |
| Pack Selection UI | HIGH | LOW | P1 |
| Schema Validation | HIGH | LOW | P1 |
| Game Configuration | MEDIUM | LOW | P1 |
| AI Generation | HIGH | MEDIUM | P2 |
| Question Explanations | MEDIUM | LOW | P2 |
| Quality Scoring | MEDIUM | MEDIUM | P3 |
| Cloud Download | MEDIUM | HIGH | P3 |
| Custom Pack CRUD | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for v2.0 launch
- P2: Should have, add when core is working
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Kahoot! | Quizlet | Sporcle | Trivial World Approach |
|---------|---------|---------|---------|------------------------|
| Custom Content | User-created quizzes | Flashcard sets | User-created games | AI-generated packs |
| Difficulty Levels | Yes (easy/hard) | Yes (study modes) | Varies by creator | Yes (easy/medium/hard) |
| Explanations | Limited | Yes (flashcard) | Varies | Yes (AI-generated) |
| Offline Mode | No | Premium only | No | Yes (offline-first) |
| AI Generation | Quiz AI (premium) | Magic Notes (limited) | No | Yes (core feature) |
| Social Play | Live host mode | Share links | Solo only | Conductor model (unique) |

## Sources

### AI Question Generation
- [2026 AI Quiz Generation Study](https://simplequizmaker.com/blog/ai-quiz-generation-data-study-2026) - Quality metrics, failure modes, subject-specific rates
- [Maastricht University Prompt Library](https://library.maastrichtuniversity.nl/apps-tools/ai-prompt-library/create-multiple-choice-questions/) - MCQ generation templates
- [QuizGPT Package](https://pypi.org/project/quizgpt/) - Production-scale question generation with deduplication
- [MCQ Creation Assistant](https://github.com/linexjlin/GPTs/blob/main/prompts/MCQ%20Creation%20Assistant.md) - 4-step prompt engineering pattern
- [PolarNotes MCQ Prompts](https://www.polarnotesai.com/prompts/multiple-choice-chatgpt-difficulty-control/) - Difficulty calibration patterns
- [Python AI Quiz Generator Tutorial](https://aicodewithharitha.com/python-ai/ai-quiz-generator-python-excel/) - JSON structured output patterns

### Schema and Content Formats
- [Trivia Schema](https://github.com/gaufqwi/trivia-schema) - JSON schema for pub quiz questions
- [JSON Quiz Format](https://json-quiz.github.io/json-quiz) - Extensible quiz format specification

### Content Pack Architecture
- [SwiftDataPacks](https://github.com/CircuitProApp/SwiftDataPacks) - Read-only content pack architecture
- [Sutra Content Pack Design](https://github.com/Mahalp/Sutra/commit/b8734249e26f29c1bbb9e73f71567aa5f75c47df) - Offline-first pack patterns
- [Kuratour Case Study](https://expo.dev/blog/the-offline-first-multilingual-audio-tour-app-built-with-expo) - Offline-first Expo patterns
- [WatermelonDB Offline Demo](https://github.com/FastheDeveloper/watermelondb-expo-offline-demo) - Observable queries, sync patterns
- [Supastash](https://github.com/0xZekeA/supastash) - Supabase + SQLite sync engine

### Game Configuration UI
- [Mobile Game Settings UX](https://reactnative.live/designing-emulation-like-config-uis-for-mobile-games-lessons) - Settings UI patterns
- [UX StackExchange Difficulty Picker](https://ux.stackexchange.com/questions/119456/best-way-to-make-an-easy-medium-hard-picker) - Multi-select patterns

### Content Versioning
- [React Native Versioned State](https://dev.to/sebastianthiebaud/a-simple-pattern-for-versioned-persisted-state-in-react-native-ll6) - Schema versioning pattern
- [SwiftData Migrations](https://www.donnywals.com/a-deep-dive-into-swiftdata-migrations/) - iOS migration strategies

### Validation and Fact-Checking
- [RefChecker](https://arxiv.org/pdf/2405.14486) - Fine-grained hallucination detection
- [Provenance](https://arxiv.org/html/2411.01022) - Lightweight NLI fact-checker
- [OpenAI Guardrails](https://openai.github.io/openai-guardrails-python/ref/checks/hallucination_detection/) - Hallucination detection API
- [FactLens](https://github.com/factlens/factlens) - Geometric hallucination detection

---
*Feature research for: Question Pack System*
*Researched: 2026-06-08*