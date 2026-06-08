# Trivial World

## What This Is

Trivial World is a mobile trivia game inspired by Trivial Pursuit, designed for social play. One person acts as the **game conductor**, reading questions from the app to 1 or more participants. The app handles die rolls, move options, and question management, while players engage in a shared physical space around the mobile device.

## Core Value

Enable in-person social trivia gameplay where the app supports (not replaces) human interaction — the game conductor reads questions aloud and players move together.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Game conductor can start a new game session
- [ ] Game conductor can add 1 or more participants to the game
- [ ] App simulates die roll and displays result
- [ ] App indicates valid move choices based on die roll
- [ ] App presents questions from 6 categories to game conductor
- [ ] Questions are created electronically with category metadata
- [ ] Game tracks scoring progress per participant

### Out of Scope

- Online multiplayer (remote play) — initial version is in-person only
- User accounts/authentication — no player profiles for v1
- AI-generated questions — questions are manually curated initially

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

**Target Platform:** Mobile (iOS/Android) with potential web companion.

## Constraints

- **Platform:** Mobile-first design (phone screen size)
- **Social:** Designed for in-person group play, not solo or remote play
- **Simplicity:** Low friction to start playing — minimal setup

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Game conductor model | Enables social, screen-sharing gameplay without每人 having a device | — Pending |
| Simulated die roll | Removes physical die requirement, keeps randomness element | — Pending |
| 6 adapted categories | Familiar structure from Trivial Pursuit, themed for modern interests | — Pending |

---
*Last updated: 2026-06-08 after initialization*

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state