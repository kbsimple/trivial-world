# Trivial World

## What This Is

Trivial World is a mobile trivia game for in-person social play, with a web-based question generator for creating custom question packs. One person acts as the **game conductor**, reading questions from the app to participants. The mobile app handles die rolls, move choices, question management, and scoring, while players engage in a shared physical space around the mobile device.

## Core Value

Enable in-person social trivia gameplay where the app supports (not replaces) human interaction — the game conductor reads questions aloud and players move together.

## Current Milestone: v3.0 Web Deployment

**Goal:** Deploy both apps to Netlify with GitHub sync from main branch

**Target features:**
- WEB-01: Game web app — Expo web export with session-only storage
- WEB-02: Generator web app — Next.js static export for Netlify
- WEB-03: Netlify deployment — Two separate sites, GitHub sync from main
- WEB-04: PWA manifest — Add to Home Screen, app icons

**Key decisions:**
- AI generation stays dev-only (Ollama local) — production generator deploys as static site
- Game storage is session-only — no IndexedDB, simpler than full offline
- Two separate Netlify sites — game and generator deploy independently

## Requirements

### Validated

- ✓ Game conductor can start a new game session — v1.0
- ✓ Game conductor can add 1 or more participants to the game — v1.0
- ✓ App simulates die roll and displays result — v1.0
- ✓ App indicates valid move choices based on die roll — v1.0
- ✓ App presents questions from 6 categories to game conductor — v1.0
- ✓ Questions are created electronically with category metadata — v2.0
- ✓ Game tracks scoring progress per participant — v1.0
- ✓ Question pack data structure with versioning and validation — v2.0
- ✓ AI-powered question generation from topics and source material — v2.0
- ✓ Pack selection UI with category/difficulty filtering — v2.0
- ✓ Pack download with checksum verification — v2.0

### Active

- [ ] WEB-01: Game runs in web browser via Expo export
- [ ] WEB-02: Generator accessible as static web app
- [ ] WEB-03: Both apps deploy automatically from main branch
- [ ] WEB-04: Game installable as PWA on mobile devices

### Out of Scope

| Feature | Reason |
|---------|--------|
| Online multiplayer (remote play) | Initial version is in-person only — breaks core social value |
| User accounts/authentication | No player profiles for v1 — friction kills social gameplay |
| Real-time leaderboards | Not needed for in-person play — adds complexity without value |
| In-app purchases | Free-to-play model not planned for v1 |
| Time limits per question | Conductor controls pacing (D-04) |
| Game variants | Deferred for future (D-07) |
| Cloud pack hosting | Manual JSON download for v2.0 (D-18) |
| Multi-provider AI | Ollama-only for v2.0 |

## Context

**Inspiration:** Trivial Pursuit board game with mobile adaptations for convenience and modern gameplay.

**Categories adapted from Trivial Pursuit:**

| Color | Original Category | Trivial World Category | Core Focus |
|-------|-------------------|------------------------|------------|
| Blue | Geography | The World Outside | Game maps, landmarks, anime settings, rules of survival |
| Pink | Entertainment | Pop Culture & Streaming | Streamers, memes, Marvel, YouTubers, music |
| Yellow | History | Milestones & Myths | Tech history, ancient warriors, major battles |
| Purple | Art & Literature | Animation and Artwork | Comics, graphic novels, books, artists, video game characters |
| Green | Science & Nature | Tech, Space & Logic | AI, astronomy, apex predators, desert tortoise |
| Orange | Sports & Leisure | Sports & Gaming | Pro sports, college sports, competitive gaming |

**Target Platform:** Mobile (iOS/Android) with web companion (question generator).

**Architecture:** Monorepo with Turborepo — `apps/mobile` (Expo), `apps/generator` (Next.js), `packages/types` (shared Zod schemas).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Game conductor model | Enables social, screen-sharing gameplay without everyone having a device | ✓ Good |
| Simulated die roll | Removes physical die requirement, keeps randomness element | ✓ Good |
| 6 adapted categories | Familiar structure from Trivial Pursuit, themed for modern interests | ✓ Good |
| Monorepo structure | Contract-first development, shared types between mobile and web | ✓ Good |
| Zod-first schemas | Single source of truth for validation, TypeScript types derived automatically | ✓ Good |
| WatermelonDB for packs | Offline-first pack caching, lazy-loading queries | ✓ Good |
| Ollama-only generation | Simple single-provider setup for v2.0, AI SDK for future swap | ✓ Good |
| Static export for generator | Netlify deployment without server infrastructure | ✓ Good |
| Pack selection before setup | Clear flow: home → pack → setup → game | ✓ Good |
| Built-in default pack | 120 questions bundled, no download required to start | ✓ Good |

## Constraints

- **Platform:** Mobile-first design (phone screen size)
- **Social:** Designed for in-person group play, not solo or remote play
- **Simplicity:** Low friction to start playing — minimal setup
- **Offline-first:** No network dependency for core gameplay

---
*Last updated: 2026-06-09 for v3.0 milestone*