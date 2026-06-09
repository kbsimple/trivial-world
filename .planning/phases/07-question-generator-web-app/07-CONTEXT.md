# Phase 7: Question Generator Web App - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers **a web application for AI-powered trivia question generation, multi-pass fact-checking, human review, and pack publishing** — enabling users to create custom question packs from topics using Ollama.

**In scope:**
- Generator web app with Next.js App Router (apps/generator/)
- Ollama integration for question generation (single provider)
- Multi-pass verification pipeline (3 calls, confidence scoring)
- Human review UI (single-question focus, full edit capability)
- Pack generation and JSON export
- Static deployment to Netlify
- Integration with @trivial-world/types shared package

**Out of scope:**
- Cloud pack hosting (Phase 8 or later)
- Pack discovery/marketplace (Phase 8 or later)
- Multi-provider AI support (future enhancement)
- Pack download/sync in mobile app (Phase 8)
- Game configuration UI (Phase 8)

</domain>

<decisions>
## Implementation Decisions

### AI Provider & Architecture

- **D-01:** Ollama-only for Phase 7. Single provider architecture keeps scope tight. Other providers (OpenAI, Anthropic) can be added in future phases via Vercel AI SDK's provider abstraction.
- **D-02:** Provider configuration via environment variables. Default Ollama endpoint configurable for local or remote Ollama instances.
- **D-03:** Vercel AI SDK for provider abstraction. Enables future provider swapping without rewriting generation logic.

### Web App Framework

- **D-04:** Next.js App Router for generator web app (apps/generator/). App Router provides Server Components, streaming, and best Vercel AI SDK integration.
- **D-05:** 3-page flow: Generator (topic input, generation), Review (approve/edit/reject), Packs (manage and export). Settings integrated into Generator page (not separate route).
- **D-06:** Turborepo shared workspace. Generator app lives at `apps/generator/`, shares `@trivial-world/types` package with mobile app.

### Fact-Checking Pipeline

- **D-07:** Multi-pass verification (3 Ollama calls with different phrasings). Each pass asks the same question verification in different ways to catch hallucinations.
- **D-08:** Confidence scoring based on pass agreement. 3/3 matches = 100% confidence (auto-approve). 2/3 = 67% confidence. 1/3 or 0/3 = flagged for human review.
- **D-09:** All 3 pass results visible to human reviewer. Even auto-approved questions show the verification details in review UI.
- **D-10:** Questions marked "needs review" when passes disagree. Confidence percentage displayed prominently (e.g., "67% consistent - needs review").

### Human Review Workflow

- **D-11:** Single-question focus review UI. One question at a time with full context: question text, answer, choices (if multiple choice), difficulty, category, all 3 verification pass results.
- **D-12:** Full edit capability before approve. Question text, answer, choices, difficulty all editable. Generator output is a starting point, not final.
- **D-13:** Three actions per question: Approve (adds to pack), Edit (modify then approve), Reject (discard and optionally regenerate).

### Background Curation

- **D-14:** Pipeline automation with fast batch processing. Generation → fact-check → confidence score happens in seconds (not minutes), enabling semi-synchronous UI workflow.
- **D-15:** No background queues for Phase 7. Generation is triggered by user action, results appear in review queue within reasonable wait time.
- **D-16:** Batch size limited to keep response time acceptable. Large packs generated in batches, not all at once.

### Deployment & Publishing

- **D-17:** Static export to Netlify CDN. No server functions required. All AI calls are client-side to Ollama (running locally or on accessible server).
- **D-18:** Manual JSON download for approved packs. User downloads the pack file and can host it anywhere. Cloud hosting is Phase 8.
- **D-19:** Pack files use .json extension with gzip compression (contentEncoding field already in schema). Browser handles decompression on mobile app import.

### Claude's Discretion

- Exact prompt templates for Ollama (researcher to investigate)
- Verification prompt phrasing variations (researcher to design)
- Category validation in prompts (ensure generated questions match selected category)
- Batch size limits for reasonable response times
- Error handling UI patterns for Ollama connection failures

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Context
- `.planning/phases/06-question-pack-structure/06-CONTEXT.md` — Zod schemas, pack structure, monorepo setup
- `.planning/phases/06-question-pack-structure/06-VERIFICATION.md` — Implementation verification patterns

### Project Context
- `.planning/PROJECT.md` — Project vision, core value, categories
- `.planning/REQUIREMENTS.md` — AI-01 through AI-05, CLOUD-01 requirements
- `.planning/ROADMAP.md` — Phase 7 definition and success criteria

### Research
- `.planning/research/SUMMARY.md` — AI hallucination rates (20-45%), multi-model validation, Vercel AI SDK patterns
- `.planning/research/ARCHITECTURE.md` — Monorepo structure, contract-first development
- `.planning/research/PITFALLS.md` — Prompt injection risks, content moderation gaps

### Shared Types
- `packages/types/src/question-pack.ts` — QuestionSchema, PackMetadataSchema, QuestionPackSchema
- `packages/types/src/category.ts` — CategorySchema, CATEGORY_NAMES

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **@trivial-world/types package:** Zod schemas already defined (QuestionSchema, PackMetadataSchema, QuestionPackSchema). Generator app imports these directly.
- **Monorepo structure:** Turborepo + pnpm workspaces already set up. Generator app goes in `apps/generator/`.
- **Category system:** CATEGORY_NAMES mapping already exists in packages/types/src/category.ts.

### Established Patterns
- **Zod validation:** All question validation uses Zod schemas from shared package.
- **Checksum calculation:** SHA-256 checksum already defined in PackMetadataSchema.
- **Pack structure:** Minimum 20 questions per pack, version field, schemaVersion "1.0.0".

### Integration Points
- **Generator app:** New app in monorepo, must use shared types package.
- **Pack output:** Generator produces JSON files matching QuestionPackSchema, importable by mobile app.
- **Ollama client:** New dependency for generator app (ollama or ollama-js library).

</code_context>

<specifics>
## Specific Ideas

- Generator page should show: topic input field, category selector, generation controls, live progress indicator
- Review page should show: question text (editable), answer text (editable), choices (if multiple choice, editable), difficulty (optional, editable), all 3 verification pass results with confidence score, approve/edit/reject buttons
- Packs page should show: list of approved questions, pack metadata editor, export/download button
- Settings section on Generator page: Ollama endpoint URL (default: http://localhost:11434), model selection (default: llama3.2 or similar)
- Fact-checking prompts should verify: factual accuracy, appropriate difficulty for category, unambiguous answer
- Quality score displayed as percentage with visual indicator (green for high confidence, yellow for needs review, red for rejected)
- Error handling for Ollama connection failures with clear retry button

</specifics>

<deferred>
## Deferred Ideas

### Cloud Pack Hosting
- Pack upload to S3/R2 or Netlify-hosted pack index
- Pack discovery/marketplace for sharing question packs
- User accounts for pack ownership
- Deferred to Phase 8 or later

### Multi-Provider AI Support
- OpenAI, Anthropic, Google Gemini as alternatives to Ollama
- API key management in generator settings
- Provider comparison in review UI
- Deferred to future phase after Ollama validation

### Mobile App Integration
- Pack download from cloud URLs
- Pack update notifications
- Pack version management
- Phase 8 scope

### Difficulty Calibration (AI-04)
- Difficulty calibration testing
- Distractor quality scoring
- Deferred to future phase after core generation works

</deferred>

---

*Phase: 07-question-generator-web-app*
*Context gathered: 2026-06-08*