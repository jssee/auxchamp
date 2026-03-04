# Game implementation plan (repo-aligned)

## Purpose

This document updates the original implementation plan to match the **current** Auxchamp repo.

The old version assumed an empty repository and an unspecified app/API stack.
That is no longer true.

Current baseline:

- SvelteKit app in `apps/web`
- shared packages in `packages/*`
- oRPC + OpenAPI handler wiring already in place
- Better Auth already integrated
- Drizzle + Neon Postgres client already integrated
- Bun + Turborepo + oxlint/oxfmt + lefthook already integrated

This plan keeps the same game domain from `2026-03-05-DESIGN.md`, but maps implementation work onto today’s package boundaries and conventions.

---

## Current repo patterns to follow

### 1) Package boundaries are intentional

- `packages/db`: schema + DB client only
- `packages/auth`: framework-agnostic auth creation
- `packages/api`: domain logic + query/command surfaces + oRPC router
- `apps/web`: SvelteKit UI, route handlers, remote functions, framework-specific glue

Do not collapse these into one package for speed.

### 2) Framework-specific code stays in `apps/web`

`packages/auth` already follows this pattern (shared `createAuth`, app-level SvelteKit plugin wiring).
Game code should do the same.

### 3) Shared business logic lives in `packages/api`

Both transports (SvelteKit remote functions and oRPC handlers) should call the same service/query functions.
Do not duplicate game rules in handlers.

### 4) Schema ownership stays in `packages/db`

All game tables and relations belong in `packages/db/src/schema/*`, exported from schema index files.

### 5) Typed env remains centralized

Add new env vars to `@auxchamp/env` (`server.ts` or `web.ts`) instead of reading raw `process.env` in feature code.

---

## Working assumptions

- Domain model and rules in `docs/2026-03-05-DESIGN.md` remain valid.
- `game` is the aggregate root.
- Table naming remains singular (`game`, `player`, `round`, etc.).
- IDs remain NanoID-based (explicitly add dependency; currently not first-class in workspace deps).
- MVP still requires exactly 3 stars, distinct submissions, no self-vote.
- MVP start rule remains: at least 4 active players and at least 1 round.
- MVP shortfall rule remains: <4 submissions at submission close => round is scored/void and flow advances.

---

## Scope

### In scope

- game lifecycle (draft -> active -> completed)
- rounds, invites, joins/leaves/removals
- submissions, ballots, scoring
- transition engine (time-driven)
- Spotify playlist integration at submission->voting transition
- app transport wiring using current repo conventions

### Out of scope (for first pass)

- notifications/reminders
- generic workflow engine
- generalized repository abstraction layer
- materialized score/projection tables
- reopen history/admin tooling beyond manual SQL
- rich operational analytics

---

## Target code layout (repo-aligned)

```txt
packages/
  db/
    src/
      index.ts
      schema/
        index.ts
        auth.ts
        game/
          game.ts
          player.ts
          round.ts
          submission.ts
          ballot.ts
          star.ts
          index.ts
      migrations/             # generated under src/migrations

  api/
    src/
      index.ts                 # procedure builders / middleware
      context.ts
      routers/
        index.ts               # appRouter composition
        game.ts                # game router surface
      game/
        types.ts
        actions.ts
        capabilities.ts
        locks.ts
        transition.ts
        scoring.ts
        commands.ts
        queries.ts
      integrations/
        spotify/
          playlist-service.ts
          fake-playlist-service.ts
          spotify-playlist-service.ts

apps/
  web/
    src/
      lib/
        app.remote.ts          # existing
        game.remote.ts         # first-party app command/query wrappers
        server/
          orpc-handlers.ts     # already present
      routes/
        rpc/[...rpc]/+server.ts
        api-reference/[...openapi]/+server.ts
        games/...
```

Notes:

- Keep `appRouter` as a composition root, not a dumping ground.
- Keep domain logic in `packages/api/src/game/*`; router handlers should stay thin.
- Keep UI-specific behavior in `apps/web`.

---

## Delivery plan

### Milestone 0: repo prep (minimal, explicit)

### Goal

Prepare the workspace for game feature work without changing architecture.

### Tasks

- Add NanoID dependency where ID creation lives (likely `@auxchamp/api` or `@auxchamp/db`).
- Add a small shared ID helper (`createId()`) and use it consistently.
- Establish game schema folder exports in `packages/db/src/schema/game/index.ts` and `packages/db/src/schema/index.ts`.
- Confirm migration workflow uses existing DB scripts (`bun run db:generate`, `bun run db:push`, `bun run db:migrate`).

### Done when

- IDs are generated from one helper
- schema barrel exports are stable
- migration commands run with no path hacks

---

### Milestone 1: game schema in `@auxchamp/db`

### Goal

Encode core game records and cheap invariants in Postgres.

### Tasks

Implement tables:

- `game`
- `player`
- `round`
- `submission`
- `ballot`
- `star`

Keep DB-level constraints for uniqueness/shape only:

- one `player` per `(game_id, user_id)`
- one creator per game
- one `round` per `(game_id, number)`
- one `submission` per `(round_id, player_id)`
- one `ballot` per `(round_id, player_id)`
- one `star` per `(ballot_id, submission_id)`
- positive timing window checks

Do not force these in DB yet:

- exactly 3 stars per ballot
- self-vote ban
- active-player-only writes

### Done when

- schema compiles and migrates
- schema exports remain consumable via `@auxchamp/db/schema/*`

---

### Milestone 2: domain core in `@auxchamp/api`

### Goal

Centralize game rules and transitions in package-level service functions.

### Tasks

Add modules in `packages/api/src/game/`:

- action vocabulary (`Action` union)
- capability context loader
- `getAllowedActions`
- lock helper(s)
- `transitionGame`
- scoring helpers

Command pattern (all writes):

1. transaction start
2. lock aggregate rows
3. run `transitionGame`
4. load capability context
5. assert required action + command invariants
6. write

### Done when

- no rule duplication in router/UI layers
- every write command follows one transaction pattern

---

### Milestone 3: game commands

### Goal

Ship command surface for draft/lobby/start/submission/voting.

### Commands

- `createGame`
- `updateGame`
- `addRound`
- `updateFutureRound`
- `invitePlayer`
- `acceptInvite`
- `leaveGame`
- `removePlayer`
- `startGame`
- `upsertSubmission`
- `deleteSubmission`
- `upsertBallot`

### Done when

- creator can assemble and start a valid game
- active players can submit and vote under all MVP constraints

---

### Milestone 4: read models + scoring queries

### Goal

Expose minimal read surfaces for app and API consumers.

### Queries

- game detail
- player list
- round list/current round
- round results (submission + star totals + winner flag)
- game leaderboard/champion

### Done when

- all required screens and API responses can be built from explicit query functions

---

### Milestone 5: transport wiring (current stack)

### Goal

Expose the same domain functions through existing transport surfaces.

### Tasks

- Add `packages/api/src/routers/game.ts` and compose into `appRouter`.
- Keep handlers thin: parse/auth/call/map error.
- Add `apps/web/src/lib/game.remote.ts` for first-party SvelteKit pages.
- Keep remote functions and oRPC paths calling shared `packages/api/src/game/*` code.

### Done when

- game flow works from app pages
- oRPC endpoints expose equivalent capability without duplicated rules

---

### Milestone 6: Spotify integration

### Goal

Create/store playlist IDs at submission->voting transition with a clear boundary.

### Tasks

- define playlist adapter interface in `packages/api/src/integrations/spotify`
- fake adapter for tests/dev
- real adapter with env-driven credentials
- wire adapter call in `closeSubmissionAndOpenVoting`

Shortcut cost (intentional):

- inline call may orphan playlist if external call succeeds and DB transaction fails

Replacement condition:

- introduce outbox + retry worker when operational reliability becomes a requirement

---

### Milestone 7: verification

### Goal

Prove correctness before calling MVP ready.

### Test layers

- **unit (`bun:test`)** in `packages/api/src/game/*.test.ts`
  - capabilities
  - scoring
  - transition branches
- **integration (`bun:test`)** with DB-backed flows
  - command success/failure cases
  - uniqueness + constraints
  - join/leave edge behavior
- **concurrency tests**
  - stale submit/vote writes rejected
  - removal/write race behavior

### Minimum verification commands

- `bun run check`
- `bun run check-types`
- package test runs (as added)
- DB migration from empty database

---

## First thin slice (fastest useful path)

1. game schema
2. `createGame`
3. `addRound`
4. `invitePlayer` + `acceptInvite`
5. `startGame`
6. `upsertSubmission`
7. `transitionGame` with fake playlist adapter
8. `upsertBallot`
9. leaderboard query
10. wire to `game.remote.ts` + router

This yields a complete vertical slice in the current monorepo without inventing new architecture.

---

## Risks to control

1. **Rule duplication across transport layers**
   - Keep domain logic in `packages/api/src/game/*` only.
2. **Over-abstracting early**
   - No generic FSM or repository layer in MVP.
3. **Concurrency regressions**
   - Compute permissions and writes in one locked transaction.
4. **Spotify scope creep**
   - Keep adapter boundary strict; delay reliability machinery until needed.

---

## Exit criteria

MVP backend+app flow is ready when:

- draft game setup works end-to-end
- invite/join/start rules are enforced
- submission and voting windows enforce all MVP constraints
- round transitions run deterministically
- scoring/champion queries are correct
- first-party app flows work through current SvelteKit structure
- oRPC surface is wired without duplicating rules
- verification commands pass
