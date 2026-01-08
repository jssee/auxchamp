---
id: a-f9c0
status: closed
deps: []
links: []
created: 2026-01-08T06:07:19Z
type: epic
priority: 1
assignee: Jesse Hoyos
---
# Stage Submissions Feature

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement stage page UI for track submissions with optional notes during battles.

**Architecture:** Extend existing `submitTrack` remote function with note field. Build stage page that conditionally shows submission form and hides other players' submissions until voting phase.

**Tech Stack:** SvelteKit, Drizzle ORM, Valibot, Spotify embeds

---

## Context

**Existing code:**
- `src/lib/server/db/schema/public.ts` - submission table (id, stageId, userId, spotifyUrl, submissionOrder, submittedAt, starsReceived)
- `src/lib/remote/stage.remote.ts` - submitTrack function with full validation (auth, phase, deadline, max submissions)
- `src/routes/b/[id]/s/[id]/` - empty page files

**Requirements:**
- Add optional note field (max 280 chars) to submissions
- Full stage page: header, deadlines, form, submissions
- User sees only own submissions during submission phase
- All submissions visible in voting/closed phases
- Deadlines displayed in user's local timezone

---

## Task Execution Order

```
a-5f48: Schema migration (note column)
   |
   +---> a-8ef8: Update submitTrack remote function
   |        |
   |        +---> a-9445: Unit tests
   |        |
   +---> a-94a5: Server load function
            |
            +---> a-9a2f: Page UI component
```

---

## Verification

After all tasks complete:

1. Start dev server: `bun dev`
2. Create and activate a battle with a stage
3. Navigate to stage page as a player
4. Submit track with note - verify saves
5. Submit track without note - verify works
6. Verify own submission displays with Spotify embed
7. As different user, verify cannot see first user's submission
8. Simulate voting phase (update stage.phase in DB)
9. Verify all submissions now visible
10. Run tests: `bun test:unit`
