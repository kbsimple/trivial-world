# Project Research Summary

**Project:** Trivial World
**Domain:** Mobile trivia game with offline-first capability + Question Pack System
**Researched:** 2026-06-08
**Confidence:** HIGH

## Executive Summary

Trivial World is a mobile trivia game designed for in-person social play, where a game conductor reads questions aloud to a group. The v2.0 milestone adds a question pack system enabling users to download custom question packs and generate new questions via AI. This research covers the technical architecture for connecting a mobile app (Expo SDK 55, React Native) with a new web-based question generator (Next.js 16) through cloud storage and shared TypeScript types.

The recommended approach uses a monorepo structure with a shared `@trivial-world/types` package defining Zod schemas that both apps consume. Question packs are stored in WatermelonDB on mobile (offline-first) and S3-compatible cloud storage with presigned URLs. AI question generation uses Vercel AI SDK with OpenAI, with multi-model fact-checking to address the 20-45% hallucination rate identified in research. Schema versioning from day one prevents migration failures that commonly break offline apps.

Key risks include AI hallucination (20-45% of generated content has factual issues), prompt injection attacks (#1 OWASP LLM risk), and API cost abuse from unrestricted generation endpoints. Mitigation requires multi-model validation pipelines, token-based rate limiting, and content moderation layers. The architecture prioritizes offline-first gameplay, ensuring no network dependency for core game functionality.

## Key Findings

### Recommended Stack

The mobile app uses Expo SDK 55 with React Native 0.83, Zustand 5.x for state, WatermelonDB for offline-first data, and Tamagui 2.x for UI. This stack is already implemented for v1.0. For the v2.0 question pack milestone, the research recommends adding: Zod 4.x for shared schema validation between apps, Vercel AI SDK 6.x with OpenAI for question generation, Next.js 16 for the generator web app, and Supabase for cloud storage (works with Expo Go without config plugins).

**Core technologies:**
- **Expo SDK 55**: Mobile framework — managed workflow, OTA updates, React Native 0.83 with New Architecture
- **WatermelonDB**: Offline-first database — lazy loading, observable queries, sync protocol for future cloud backup
- **Zustand 5.x**: Client state — minimal bundle (1.2KB), persist middleware, simple store model
- **Zod 4.x**: Schema validation — shared types between mobile and web, 14x faster parsing than Zod 3
- **Vercel AI SDK**: LLM abstraction — provider-agnostic, structured output with Zod, streaming support
- **Supabase**: Cloud backend — Postgres for pack metadata, Storage for JSON files, Expo Go compatible
- **Next.js 16**: Generator web app — App Router, Server Actions for secure LLM calls, Edge runtime

### Expected Features

Research identified table stakes features (users expect these), differentiators (competitive advantage), and anti-features (seem good but create problems). For v2.0, the MVP focuses on pack storage, selection, and basic configuration — AI generation comes in v2.1 after the core system is validated.

**Must have (table stakes):**
- **Question Pack Storage Model** — Local-first schema with versioning, foundation for all pack features
- **Pack Selection UI** — List, select, view metadata — universal expectation in trivia apps
- **Schema Validation** — JSON schema validation on import — prevents corrupted packs from crashing the app
- **Question Accuracy** — Users notice factual errors immediately; 19% of AI failures are hallucinations

**Should have (competitive):**
- **AI-Powered Generation** — Users create custom packs from any topic — unique vs. static content competitors
- **Question Explanations** — Show why an answer is correct — educational value, builds trust in social play
- **Quality Score Indicators** — Visual confidence scores help conductors decide if pack is "game night ready"

**Defer (v2.x+):**
- **Cloud Pack Repository** — Download packs from central server — enhances but not core to gameplay
- **Custom Pack CRUD** — Full create/edit/delete — higher complexity, add after pack system is stable
- **Real-Time Multiplayer Sync** — Undermines conductor model, adds 10x complexity — anti-feature

### Architecture Approach

The architecture uses a monorepo with shared types, enabling the mobile app and generator web app to share a single source of truth for question pack schemas. This contract-first development ensures the generator produces exactly what the mobile app expects. Question packs flow from generator (web) to consumer (mobile) via cloud storage with presigned URLs, while the mobile app maintains offline-first gameplay through WatermelonDB caching.

**Major components:**
1. **Shared Types Package (`@trivial-world/types`)** — Zod schemas for question packs, categories, validation; JSON Schema export for non-Zod environments
2. **Mobile App (Expo)** — Pack browser, download service, WatermelonDB cache, game integration with existing question flow
3. **Generator Web App (Next.js)** — AI-powered question generation, pack management UI, REST API for pack CRUD, S3 upload
4. **Cloud Storage (Supabase/S3)** — Pack files with checksums, presigned URLs for secure downloads, Postgres for metadata

### Critical Pitfalls

Research identified nine critical pitfalls, with the top four requiring immediate attention during architecture and planning:

1. **AI Hallucination** — 20-45% of AI-generated content has factual issues. Prevent with multi-model fact-checking (Gemini + GPT-4 + Perplexity consensus), confidence scoring in schema, human review queue for flagged items. Address in Phase 1 (schema) and Phase 3 (generation).

2. **Prompt Injection** — #1 OWASP LLM security risk. Prevent with input sanitization (100 char limit), structured output enforcement, separate system prompts from user input, content moderation layer. Address in Phase 3.

3. **Schema Migration Breaking Packs** — JSON schema changes break local cached packs. Prevent with version field in every payload, additive-only changes, upcaster pattern for runtime migration. Design from day one in Phase 1.

4. **Large Pack Performance** — Loading entire packs into memory causes crashes. Prevent with WatermelonDB lazy loading, database indexes, pagination (never load > 50 questions at once). Address in Phase 1 design.

## Implications for Roadmap

Based on research, the v2.0 milestone should be structured in three phases:

### Phase 1: Question Pack Data Structure
**Rationale:** Foundation for all subsequent work. Must exist before generator can produce packs or mobile app can consume them. Research emphasizes versioning from day one to prevent migration failures.
**Delivers:** Zod schemas, JSON Schema export, WatermelonDB schema, pack validation service
**Addresses:** Pack Storage Model, Schema Validation (FEATURES.md)
**Avoids:** Schema Migration Breaking Packs (PITFALLS.md), Large Pack Performance

### Phase 2: Cloud Storage & Pack Download
**Rationale:** Once data structure exists, mobile app needs infrastructure to fetch packs. Presigned URLs enable secure downloads without user accounts, maintaining the no-auth frictionless design.
**Delivers:** Pack index API, presigned URL generation, download service, checksum verification, pack caching
**Uses:** Supabase client, expo-file-system, Zod validation
**Implements:** Pack Download Architecture (ARCHITECTURE.md)

### Phase 3: AI Question Generation
**Rationale:** Requires complete data structure and working storage. Most complex phase with highest risk. Research shows this needs multi-model validation, content moderation, and human review queue.
**Delivers:** Generator web app, AI generation endpoint, quality scoring, fact-checking pipeline, human review UI
**Uses:** Vercel AI SDK, OpenAI, Next.js 16
**Avoids:** AI Hallucination, Prompt Injection, Content Moderation Gaps (PITFALLS.md)

### Phase Ordering Rationale

- **Phase 1 first:** Data structure is the contract between generator and consumer. Cannot build either without it. Versioning prevents future breaking changes.
- **Phase 2 second:** Mobile app needs working download pipeline before generator produces content to download. Validates the end-to-end flow with placeholder content.
- **Phase 3 last:** AI generation is highest complexity and risk. Having infrastructure in place allows focused development on quality and safety.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (AI Generation):** Complex integration with multiple validation layers. Multi-model fact-checking API patterns need investigation. Content moderation API selection (OpenAI Moderation vs. Perspective API) needs comparison.
- **Phase 3 (Prompt Engineering):** Difficulty calibration research shows 30-40% of "hard" questions are actually medium. Prompt templates need testing with real category content.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Data Structure):** Well-documented Zod and WatermelonDB patterns. Standard schema versioning approaches.
- **Phase 2 (Cloud Storage):** Presigned URL patterns are established. Supabase has comprehensive documentation.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Multiple official sources verified. Expo SDK 55, WatermelonDB, Zustand, Zod all have current documentation. Supabase + Expo Go compatibility confirmed. |
| Features | HIGH | AI question generation research includes 2026 study data on failure rates. Schema patterns from established trivia formats. Competitive analysis covers Kahoot, Quizlet, Sporcle. |
| Architecture | HIGH | Monorepo pattern well-documented. Contract-first development is established practice. Offline-first patterns from Kuratour case study and WatermelonDB docs. |
| Pitfalls | HIGH | Academic research (BBC/EBU, NAACL 2025, ICLR 2025) on AI hallucination. OWASP Top 10 for LLM security. WatermelonDB performance patterns from official docs. |

**Overall confidence:** HIGH

### Gaps to Address

- **Difficulty calibration specifics:** Research shows "hard" questions often aren't truly hard. Need prompt engineering testing during Phase 3 planning to calibrate difficulty.
- **Distractor quality validation:** 57% of AI questions have implausible distractors. Need specific validation logic for distractor plausibility. Address in Phase 3 generation pipeline.
- **Human review workflow UX:** Research recommends human review queue but doesn't specify UX patterns. Need to design review interface during Phase 3 planning.
- **Cost projections for AI:** Token-based pricing depends on usage patterns. Need volume estimates before Phase 3 implementation to set rate limits.

## Sources

### Primary (HIGH confidence)
- Expo SDK 55 Changelog — SDK versions, React Native compatibility
- WatermelonDB Documentation — Offline-first patterns, schema, sync
- Vercel AI SDK Documentation — LLM integration patterns, structured output
- Zod 4 Documentation — Schema validation, TypeScript integration
- Supabase Expo Quickstart — Integration patterns
- OWASP Top 10 for LLM Applications 2025 — Security risks, prompt injection
- BBC/EBU News Integrity Study (October 2025) — AI hallucination rates
- NAACL 2025 Semantic Leakage paper — Category leakage in generated content
- 2026 AI Quiz Generation Study — Quality metrics, failure modes

### Secondary (MEDIUM confidence)
- Maastricht University Prompt Library — MCQ generation templates
- QuizGPT Package — Production-scale question generation
- WatermelonDB Offline Demo — Observable queries, sync patterns
- JSON Schema Migration Best Practices — Versioning, upcasters
- University of Michigan L@S '24 — Distractor quality research
- Google Cloud Quizaic Case Study — Multi-model fact-checking pipeline

### Tertiary (LOW confidence)
- React Native Database Comparison 2026 — Performance benchmarks (third-party)
- Mobile Game Settings UX — Settings UI patterns (blog post)
- UX StackExchange Difficulty Picker — Multi-select patterns (community)

---
*Research completed: 2026-06-08*
*Ready for roadmap: yes*
