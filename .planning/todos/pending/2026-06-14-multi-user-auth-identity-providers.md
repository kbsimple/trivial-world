---
created: 2026-06-14T17:18:00Z
title: Multi-user registration and login via identity providers
area: auth
files: []
---

## Problem

The app currently has no user accounts — players are ephemeral, named locally per session. To support persistent profiles, saved scores, cross-device play, or any social features, users need a way to register and log in. The current architecture has no auth layer at all.

## Solution

Add multi-user authentication via OAuth identity providers (Google as the primary, potentially others). Key decisions to make when scoping:
- Which identity providers to support (Google required; Apple may be needed for App Store compliance)
- Whether to use Expo AuthSession / expo-auth-session, Clerk, Supabase Auth, or another managed auth service
- How player identity maps to the existing playerStore (guest vs authenticated player)
- Whether profiles/scores persist server-side or stay device-local even after auth
- Session persistence strategy (token refresh, secure storage)
