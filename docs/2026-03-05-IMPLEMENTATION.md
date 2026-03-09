# Game implementation plan (repo-aligned)

## Purpose

This document updates the original implementation plan to match the **current** Auxchamp repo and the **current delivery goal**.

The old version assumed we should build the full game loop in milestone order:

1. schema
2. domain core
3. commands
4. read models
5. transport wiring
6. Spotify integration
7. verification

That sequencing is too bottom-up for the current goal.

Current goal:

- get a small but real demo working
- exercise the main package boundaries
- learn how the domains fit together in this codebase
- avoid building infrastructure ahead of the first usable slice

So this plan keeps the same game domain from `2026-03-05-DESIGN.md`, but reorganizes the work into **vertical milestones**. Schema and domain work still matter, but they now sit inside the first demo milestone instead of standing alone as milestones.

---

## Current repo patterns to follow

### 1) Package boundaries are intentional

- `packages/db`: schema + DB client only
- `packages/auth`: framework-agnostic auth creation
- `packages/api`: domain logic + query/command surfaces + oRPC router
- `apps/web`: SvelteKit UI, route handlers, remote functions, framework-specific glue

Do not collapse these into one package for speed.

### 2) Framework-specific code stays in `apps/web`

`packages/auth` already follows this pattern. Game code should do the same.

### 3) Shared business logic lives in `packages/api`

SvelteKit remote functions and any future oRPC handlers should call the same service/query functions.
Do not duplicate game rules in handlers.

### 4) Schema ownership stays in `packages/db`

All game tables and relations belong in `packages/db/src/schema/*`, exported from schema index files.

### 5) Typed env remains centralized

Add new env vars to `@auxchamp/env` instead of reading raw `process.env` in feature code.

---

## Working assumptions

- The domain model and rules in `docs/2026-03-05-DESIGN.md` remain the source of truth.
- `game` is the aggregate root.
- Table naming remains singular (`game`, `player`, `round`, etc.).
- IDs remain NanoID-based.
- The first demo should prove the app stack, not the full game loop.
- We should favor one thin vertical slice over broad backend completeness.

---

## Scope

### In scope for the overall plan

- game lifecycle (`draft -> active -> completed`)
- rounds, invites, joins, starts
- submissions, ballots, scoring
- transition logic
- app transport wiring using current repo conventions
- Spotify playlist integration at submission -> voting transition

### Out of scope for the overall plan

- notifications and reminders
- generic workflow engine
- generalized repository abstraction layer
- materialized score tables
- admin tooling beyond what MVP needs
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
      migrations/

  api/
    src/
      index.ts
      context.ts
      routers/
        index.ts
        game.ts
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
        app.remote.ts
        game.remote.ts
        server/
          orpc-handlers.ts
      routes/
        rpc/[...rpc]/+server.ts
        api-reference/[...openapi]/+server.ts
        games/...
```

Notes:

- Keep `appRouter` as a composition root, not a dumping ground.
- Keep domain logic in `packages/api/src/*`; router handlers should stay thin.
- Keep UI-specific behavior in `apps/web`.

---

## Delivery strategy

Build the app in **vertical milestones**.

That means each milestone should end in something a human can try, not just a deeper internal layer.

### What changed

The old standalone milestones for **schema** and **domain core** are now **tasks inside Milestone 1**.

Reason:

- schema alone is not demoable
- domain core alone is not demoable
- we need the first useful slice to cross DB, API, auth, and UI together

---

## Milestone 0: repo prep

### Goal

Prepare the workspace for game feature work without changing architecture.

### Tasks

- Add NanoID dependency where ID creation lives.
- Add a small shared ID helper and use it consistently.
- Establish game schema barrel exports in `packages/db/src/schema/game/index.ts` and `packages/db/src/schema/index.ts`.
- Confirm migration workflow uses existing scripts:
  - `bun run db:generate`
  - `bun run db:push`
  - `bun run db:migrate`

### Done when

- IDs are generated from one helper.
- Schema barrel exports are stable.
- Migration commands run with no path hacks.

---

## Milestone 1: playable lobby + submission demo

### Goal

Ship the first real vertical slice:

- create a game
- add rounds
- invite players
- accept invites
- start the game
- submit songs for round 1

This is the first milestone because it proves the stack end to end without pulling in the hardest gameplay rules too early.

### Why this is the cutoff

Stopping earlier at schema or domain core gives us infrastructure, not a demo.

Going further into voting, scoring, transitions, and Spotify adds the most complex rules before we know whether the basic repo flow feels good.

This milestone is the smallest slice that is both:

- technically meaningful
- demoable by humans

### In scope

#### Minimal schema

Implement only the records needed for draft setup, lobby flow, game start, and round 1 submission:

- `game`
- `player`
- `round`
- `submission`

For this milestone, keep DB constraints cheap and structural:

- one `player` per `(game_id, user_id)`
- one `round` per `(game_id, number)`
- one `submission` per `(round_id, player_id)`
- positive timing-window values

Defer for now:

- `ballot`
- `star`

#### Minimal domain core

Implement only the command surface needed for the demo:

- `createGame`
- `addRound`
- `invitePlayer`
- `acceptInvite`
- `startGame`
- `upsertSubmission`

Keep each write small and explicit.

Use one transaction per command. `startGame` should move the game to `active` and open round 1 in the same transaction. `upsertSubmission` should only succeed for an active player on the active round while submission is open.

Do not build architecture that this slice does not use.

Defer unless clearly required:

- full capability matrix
- generic transition engine
- scoring helpers
- Spotify adapter
- full oRPC surface parity

#### Minimal read model

Add only the reads needed to render the demo flow.

Prefer one clear game-detail query if it can return:

- game metadata
- player list and statuses
- round list
- current active round
- current actor submission state
- simple per-round submission status for the lobby page

#### Minimal web transport and UI

Use SvelteKit remote functions first.

Add:

- `apps/web/src/lib/game.remote.ts`
- a create-game path
- a game detail / lobby path
- invite-accept flow
- start-game action
- submission form for the active round

Do **not** require matching oRPC routes in this milestone.

### Rules to keep now

These rules shape the domain and should be enforced in Milestone 1:

- a game must have at least 1 round before start
- a game should require at least 4 active players before start
- only active players may submit
- only the active round may accept submissions
- one submission per player per round
- players may edit only their own submission while submission is open

### Tasks

1. **Schema + migration in `@auxchamp/db`**
   - add `game`, `player`, `round`, `submission`
   - add only structural DB constraints needed now
   - wire schema exports cleanly

2. **Command services in `@auxchamp/api`**
   - implement `createGame`, `addRound`, `invitePlayer`, `acceptInvite`, `startGame`, `upsertSubmission`
   - keep invariants close to the write path
   - keep transaction and locking behavior simple but correct for start and submission

3. **Read query in `@auxchamp/api`**
   - add the minimum game-detail read needed to render the lobby and submission state
   - avoid premature query fragmentation

4. **App flow in `apps/web`**
   - add `game.remote.ts`
   - wire simple pages/forms for create, join, start, and submit
   - optimize for clarity, not polished UX

5. **Verification**
   - add basic tests for start and submission rules
   - manually run the full demo flow with multiple users

### Demo definition

A good Milestone 1 demo is:

1. User A signs in and creates a game.
2. User A adds 1 or more rounds.
3. User A invites 3 other users.
4. Those users accept.
5. User A starts the game.
6. Round 1 appears as active.
7. Players submit Spotify track URLs and optional notes.
8. The game page shows who has submitted and who has not.

### Done when

- one end-to-end flow works from SvelteKit UI -> remote function -> API/domain -> DB
- the main package boundaries are respected
- the happy path is demoable by humans
- `bun run check` passes
- `bun run check-types` passes

### Explicitly out of scope

Do not include these in Milestone 1:

- voting
- ballots / stars
- scoring
- leaderboard / champion
- automatic submission -> voting transition
- Spotify integration
- removal and leave edge cases beyond what the happy path needs
- full capability system
- full oRPC parity

Shortcut cost:

- Milestone 1 will not prove the complete game loop

Replacement condition:

- after Milestone 1 is stable, the next milestone should add voting and scoring, because that is the first real gameplay complexity wall

---

## Milestone 2: voting + scoring vertical slice

### Goal

Extend the demo from “players can submit” to “a round can complete and produce results.”

### In scope

- `ballot` and `star` schema
- `upsertBallot`
- voting invariants:
  - exactly 3 stars
  - 3 distinct submissions
  - no self-vote
  - all starred submissions belong to the same round
- round result query
- game leaderboard / champion query
- enough transition logic to move from submission to voting to scored

### Done when

- a round can go from submitting -> voting -> scored
- results can be displayed
- cumulative scoring works for the game

---

## Milestone 3: transport parity + Spotify integration

### Goal

Expose the shared game domain cleanly across transport surfaces and add the playlist integration boundary.

### In scope

- `packages/api/src/router.ts`
- keep handlers thin: parse, auth, call, map error
- keep the public API surface flat and game-specific
- define playlist adapter interface
- fake playlist adapter for tests/dev
- real Spotify adapter with env-driven credentials
- wire playlist creation into submission -> voting transition

### Done when

- the same game domain functions are reachable through app paths and oRPC
- Spotify integration works behind a clear adapter boundary

### Shortcut cost

Inline playlist creation may orphan a playlist if the external call succeeds and the DB transaction fails.

### Replacement condition

Introduce an outbox + retry worker when operational reliability becomes a requirement.

---

## Milestone 4: hardening and edge cases

### Goal

Make the MVP resistant to concurrency, stale writes, and the first wave of unhappy paths.

### In scope

- stronger locked transaction patterns for all writes
- capability cleanup if needed
- leave/remove edge behavior
- shortfall handling for too few submissions
- concurrency tests
- DB-backed integration tests

### Done when

- stale submit/vote writes are rejected
- transition behavior is deterministic under concurrent access
- the major unhappy paths are covered by tests

---

## Risks to control

1. **Rule duplication across transport layers**
   - Keep domain logic in `packages/api/src/*` only.
2. **Over-abstracting early**
   - No generic FSM or repository layer in Milestone 1.
3. **Premature completeness**
   - Do not build voting, scoring, or Spotify before the first demo works.
4. **Concurrency regressions**
   - Compute permissions and writes in one transaction once the write paths become more complex.

---

## Exit criteria

The app is ready to move beyond MVP slices when:

- draft game setup works end to end
- invite, join, start, submit, vote, and score rules are enforced
- round transitions are deterministic
- first-party app flows work through the current SvelteKit structure
- shared game logic is not duplicated across transports
- verification commands pass
