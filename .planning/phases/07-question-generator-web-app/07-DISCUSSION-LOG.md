# Phase 7: Question Generator Web App - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-08
**Phase:** 07-question-generator-web-app
**Areas discussed:** AI Provider & Architecture, Web App Framework, Fact-Checking Pipeline, Human Review Workflow, Background Curation, Deployment & Publishing

---

## AI Provider & Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Single provider (OpenAI only) | One provider for generation and fact-checking. Simpler setup, consistent API. | |
| Dual-provider (generation + validation) | One provider for generation, separate for fact-checking. | |
| Multi-model consensus | Generation from primary, fact-checking requires consensus from 2+ models. Highest quality, higher cost. | |

**User's choice:** Single provider at a time, but with options. Default to Ollama.
**Notes:** Local-first approach with Ollama as default. Vercel AI SDK for provider abstraction. Other providers can be added in future.

### Provider Swap Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Vercel AI SDK abstraction | Provider-agnostic API. Users configure via env vars. | |
| Ollama-only for now | Keeps scope tight. Add other providers later. | ✓ |
| Runtime-swappable providers | Interface pattern for runtime swapping. More code. | |

**User's choice:** Ollama-only for now
**Notes:** Single provider architecture keeps Phase 7 scope manageable. Future phases can add OpenAI, Anthropic support.

---

## Web App Framework

| Option | Description | Selected |
|--------|-------------|----------|
| Next.js App Router (Recommended) | Modern Next.js with Server Actions, built-in API routes. Best Vercel AI SDK integration. | ✓ |
| React Router / Remix | React Router v7 with Remix-style loaders. Simpler mental model. | |
| Vite + React SPA | Pure client-side React with static export. Simplest deployment. | |

**User's choice:** Next.js App Router (Recommended)
**Notes:** App Router provides best Vercel AI SDK integration and server-side capabilities if needed later.

### Pages/Routes Structure

| Option | Description | Selected |
|--------|-------------|----------|
| 3-page flow: Generator → Review → Packs | Minimal routes. Keep scope tight for Phase 7. | ✓ |
| 4+ pages: add Settings page | Separate settings for Ollama connection, generation defaults. | |
| Full app: Index + Generator + Review + Pack Details + Settings | More complete but larger scope. | |

**User's choice:** Use your recommendation (3-page flow)
**Notes:** 3-page flow with Generator, Review, Packs. Settings integrated into Generator page, not separate route.

---

## Fact-Checking Pipeline

| Option | Description | Selected |
|--------|-------------|----------|
| Self-verification prompt | Single Ollama call asking model to verify its own facts. Simpler, less reliable. | |
| Multi-pass verification | Multiple Ollama calls with different phrasings. Flag inconsistencies. | ✓ |
| Skip automated fact-check | Trust generation prompt. Human review catches errors. Fastest, highest risk. | |

**User's choice:** Multi-pass verification
**Notes:** 3 Ollama calls with different phrasings to catch hallucinations. Flags questions that don't get consistent answers.

### Inconsistency Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Flag for human review on inconsistency | Show all three answers to reviewer. Maximum human oversight. | ✓ (part 1) |
| Confidence score + threshold (Recommended) | Mark as 'needs review' with confidence %. Auto-approve 3/3 matches. | ✓ (part 2) |
| Auto-reject any inconsistency | Only use if all 3 passes agree. Strictest quality. | |

**User's choice:** Do (1) and (2)
**Notes:** Show all 3 pass results to reviewer AND flag with confidence percentage. Auto-approve only 3/3 matches. Visual indicator for confidence level (green/yellow/red).

---

## Human Review Workflow

| Option | Description | Selected |
|--------|-------------|----------|
| Single-question focus (Recommended) | One question at a time with edit/approve/reject. Focus and thoroughness. | ✓ |
| Bulk list view | Table view with bulk approve/reject. Faster for large packs. | |
| Dual mode: single + bulk toggle | Toggle between views. More flexible, more complex. | |

**User's choice:** Single-question focus (Recommended)
**Notes:** Review shows one question at a time with full context: question text, answer, choices, difficulty, category, all 3 verification results.

### Editing Capability

| Option | Description | Selected |
|--------|-------------|----------|
| Full edit before approve (Recommended) | Fix typos, adjust wording, add hints. Keeps generator honest. | ✓ |
| Approve/reject only | Approve or reject. If wrong, regenerate. Simpler, may waste good questions. | |
| Answer-only edit | Edit answer text only. Question text locked. | |

**User's choice:** Full edit before approve (Recommended)
**Notes:** All fields editable before approve: question text, answer, choices, difficulty.

---

## Background Curation

| Option | Description | Selected |
|--------|-------------|----------|
| Manual only — no background tasks | Generator runs, you review, you publish. Full human control. | |
| Background generation queue | Generate questions while reviewing previous batch. No auto-publish. | |
| Full pipeline automation | System auto-generates, fact-checks, adds to review queue. Human approves. | |

**User's choice:** Aim for pipeline automation but expect small batches that don't take long, semi-synchronous workflow in UI.
**Notes:** Pipeline automation with fast batch processing. Results appear in seconds (not minutes). User sees results shortly after submission.

---

## Deployment & Publishing

| Option | Description | Selected |
|--------|-------------|----------|
| Static export (Recommended) | Static site on Netlify CDN. Client-side Ollama calls. | ✓ |
| Hybrid: static + server functions | Server functions for AI calls. Requires Netlify Functions. | |

**User's choice:** Static export (Recommended)
**Notes:** Pure client-side app. Ollama runs locally or on accessible server. No server functions needed.

### Publishing Method

| Option | Description | Selected |
|--------|-------------|----------|
| Download JSON manually (Recommended) | Manual download after review. Can host anywhere. Simplest for Phase 7. | ✓ |
| Cloud upload to S3/R2 | Upload to cloud storage. Mobile app can download. More infrastructure. | |
| Netlify-hosted pack index | Pack index served from Netlify. Enables cloud pack discovery. | |

**User's choice:** Download JSON manually (Recommended)
**Notes:** Cloud hosting deferred to Phase 8 or later. Manual download keeps Phase 7 scope tight.

---

## Claude's Discretion

- Exact prompt templates for Ollama (researcher to investigate)
- Verification prompt phrasing variations (researcher to design)
- Category validation in prompts (ensure generated questions match selected category)
- Batch size limits for reasonable response times
- Error handling UI patterns for Ollama connection failures

## Deferred Ideas

- Cloud pack hosting (Phase 8 or later)
- Pack discovery/marketplace (Phase 8 or later)
- Multi-provider AI support (OpenAI, Anthropic, Google Gemini)
- API key management in settings
- Question generation from source material (movies, books, TV shows) - AI-02
- Difficulty calibration testing - AI-04
- Distractor quality scoring - AI-04