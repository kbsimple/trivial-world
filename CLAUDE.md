# Project: Trivial World

Mobile trivia game for in-person social play.

## Quick Reference

| Artifact | Location |
|----------|----------|
| Project Context | `.planning/PROJECT.md` |
| Requirements | `.planning/REQUIREMENTS.md` |
| Roadmap | `.planning/ROADMAP.md` |
| Current State | `.planning/STATE.md` |
| Research | `.planning/research/` |

## Current Status

**Phase:** 1 of 5 (Game Setup & Conductor Interface)
**Status:** Ready to plan
**Next Step:** `/gsd-plan-phase 1`

## Core Value

Enable in-person social trivia gameplay where the app supports (not replaces) human interaction — the game conductor reads questions aloud and players move together.

## Tech Stack

- **Framework:** Expo SDK 55 + React Native 0.83
- **State:** Zustand 5.x with persist middleware
- **Database:** WatermelonDB (offline-first)
- **UI:** Tamagui 2.x
- **Animations:** react-native-reanimated 3.x
- **Navigation:** Expo Router

## GSD Workflow

This project uses Get Shit Done (GSD) methodology.

### Common Commands

| Command | Purpose |
|---------|---------|
| `/gsd-progress` | Check current phase status |
| `/gsd-plan-phase N` | Plan phase N |
| `/gsd-execute-phase N` | Execute phase N |
| `/gsd-discuss-phase N` | Discuss phase approach |
| `/gsd-next` | Advance to next phase |

### Workflow Agents

| Agent | Purpose | Enabled |
|-------|---------|---------|
| Researcher | Research before planning | ✓ |
| Plan Checker | Verify plans achieve goals | ✓ |
| Verifier | Confirm deliverables match goals | ✓ |

### Phase Summary

| # | Phase | Goal |
|---|-------|------|
| 1 | Game Setup & Conductor Interface | Create games, manage participants, display questions |
| 2 | Game Loop & Turn Management | Die rolls, move choices, turn cycling |
| 3 | Question System | Category-based selection, no-repeat tracking |
| 4 | Scoring & Win Condition | Wedges, win detection, final results |
| 5 | State Persistence | Save/resume, pause handling, app lifecycle |

## Development Notes

### Key Constraints

- **Mobile-first:** Phone screen size (not tablet)
- **Offline-first:** No network dependency for core gameplay
- **No accounts:** Friction kills social gameplay
- **Eyes-up design:** Conductor reads to group, minimal on-screen info during play

### Categories

| Color | Category | Focus |
|-------|----------|-------|
| Blue | The World Outside | Game maps, landmarks, anime settings |
| Pink | Pop Culture & Streaming | Streamers, memes, Marvel, YouTubers |
| Yellow | Milestones & Myths | Tech history, ancient warriors, battles |
| Purple | Animation and Artwork | Comics, graphic novels, artists |
| Green | Tech, Space & Logic | AI, astronomy, apex predators |
| Orange | Sports & Gaming | Pro sports, college sports, esports |

## Git Commit Author

All commits must use:
- **Author:** Faiser
- **Email:** keepbreakfastsimple@gmail.com