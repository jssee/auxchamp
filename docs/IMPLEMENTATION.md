# Game implementation plan

## Status and tracking

This is the current implementation plan for the game slice.

Use this document for scope, sequencing, and boundary decisions. Use dex for task breakdown and execution tracking. Dex tasks are synced to GitHub, so the GitHub issues are the practical milestone tracker.

- Milestone 1 — playable lobby + submission demo: closed issue [#6](https://github.com/jssee/auxchamp/issues/6)
- Milestone 2 — round completion demo: open issue [#10](https://github.com/jssee/auxchamp/issues/10)

The game rules and domain model still come from [docs/2026-03-05-DESIGN.md](docs/2026-03-05-DESIGN.md).

---

## Current repo patterns to follow

_Updated on 2026-03-09._

### 1) Package boundaries are intentional

- `packages/db`: schema and DB client only
- `packages/auth`: framework-agnostic auth creation
- `packages/api`: business logic, validation, authorization, data access, router
- `apps/web`: SvelteKit UI, route handlers, remote functions, framework-specific glue

Do not collapse these into one package for speed.

### 2) The router is the API boundary

Follow [docs/BOUNDARIES.md](docs/BOUNDARIES.md).

Consumers do not import game mutations or queries directly. They call the router through the in-process server-side client in `apps/web`, so auth, validation, and business rules stay in `@auxchamp/api`.

### 3) `@auxchamp/api` is flat today

The current package shape is flat:

- `packages/api/src/schema.ts`
- `packages/api/src/mutation.ts`
- `packages/api/src/query.ts`
- `packages/api/src/router.ts`

That is the structure to plan against now. If the package needs extraction later, do it for a real reason, not because an earlier plan guessed a folder tree.

### 4) Framework-specific code stays in `apps/web`

Remote functions, route loads, redirects, and page-local UI behavior belong in `apps/web`.

Do not duplicate game rules there.

### 5) Schema ownership stays in `packages/db`

All game tables and relations belong in `packages/db/src/schema/game/*`, exported through the package schema barrels.

### 6) Typed env remains centralized

Add new feature env vars to `@auxchamp/env` instead of reading raw `process.env` in feature code.

---

## Working assumptions

_Updated on 2026-03-09._

- `game` remains the aggregate root.
- Table naming remains singular: `game`, `player`, `round`, `submission`, `ballot`, `star`.
- IDs remain NanoID-based for now.
- Vertical slices are still the right delivery strategy.
- We should prefer demoable slices over broad infrastructure completeness.
- Future automation should not force us to remove explicit creator controls if those controls are useful on their own.

---

## Current repo shape

_Updated on 2026-03-09._

```txt
packages/
  db/
    src/
      schema/
        index.ts
        auth.ts
        game/
          game.ts
          player.ts
          round.ts
          submission.ts
          index.ts

  api/
    src/
      context.ts
      contract.ts
      mutation.ts
      query.ts
      router.ts
      schema.ts
      util.ts

apps/
  web/
    src/
      lib/
        game.remote.ts
        server/
          api/
            handler.ts
            index.ts
      routes/
        games/
          new/
            +page.svelte
          [id]/
            +page.server.ts
            +page.svelte
            AddRoundForm.svelte
            InvitePlayerForm.svelte
            SubmissionForm.svelte
```

Notes:

- Keep `appRouter` thin. Parse, authorize, call, map.
- Keep business rules in `packages/api/src/*`.
- Keep route and remote-function concerns in `apps/web`.
- Extend existing surfaces before introducing parallel ones.

---

## Current status

_Updated on 2026-03-09._

Milestone 1 is complete.

The app can already:

- create a draft game
- add rounds
- invite players by email
- accept invites
- start a game
- save or update a submission for the active round
- render the game page with roster, round state, and submission status

The current end-to-end flow is:

- SvelteKit page or remote function
- `createApi(request)` in `apps/web`
- `appRouter` procedure in `@auxchamp/api`
- mutation or query in `packages/api/src/*`
- Drizzle + Postgres in `@auxchamp/db`

What is still missing from the playable game loop:

- ballots and stars
- voting UI and vote persistence
- scoring and standings
- round completion and next-round opening
- game completion
- Spotify integration

---

## Delivery strategy

Build the app in vertical milestones.

Each milestone should end in something a human can try. Schema, queries, and mutations matter, but they are only done when they support a usable slice.

---

## Foundational follow-ups

_Updated on 2026-03-09._

The old “Milestone 0” work is no longer a milestone. The remaining setup and ergonomics work belongs in the backlog, not on the main delivery path.

Examples:

- shared NanoID helper
- local DB workflow cleanup
- shared env bootstrap for package tests
- tiny DB test helpers
- standing warning cleanup
- DB runtime and error-posture documentation

Keep that work separate unless it directly blocks milestone delivery.

---

## Milestone 1: playable lobby + submission demo

_Completed. Updated on 2026-03-09. Tracked in [#6](https://github.com/jssee/auxchamp/issues/6)._

### Goal

Ship the first real vertical slice:

- create a game
- add rounds
- invite players
- accept invites
- start the game
- submit songs for round 1

### What shipped

#### Schema in `@auxchamp/db`

Implemented:

- `game`
- `player`
- `round`
- `submission`

Structural constraints now in place:

- one `player` per `(game_id, user_id)`
- one `round` per `(game_id, number)`
- one `submission` per `(round_id, player_id)`
- positive game timing-window values

#### API in `@auxchamp/api`

Implemented write surface:

- `createGame`
- `addRound`
- `invitePlayer`
- `acceptInvite`
- `startGame`
- `saveSubmission`

Implemented read surface:

- `getGame`

The router is already the consumer boundary. `apps/web` calls `appRouter` through the in-process server-side client instead of importing mutations or queries directly.

#### Web flow in `apps/web`

Implemented:

- `apps/web/src/lib/game.remote.ts`
- `/games/new`
- `/games/[id]`
- invite acceptance banner
- creator-only add-round and start-game controls
- active-round submission form

The invite flow is user-facing by email. Email resolution happens in the API path, not in the page layer.

### Rules enforced in Milestone 1

- a game must have at least 1 round before start
- a game must have at least 4 active players before start
- only active players may submit
- only the active round may accept submissions
- one submission per player per round
- players may edit only their own submission while submission is open

### Verification summary

Verified by automated coverage and a multi-user browser walkthrough.

At milestone completion:

- integration tests covered game creation, lobby flow, start rules, submission rules, and game-detail reads
- `bun run check` passed
- `bun run check-types` passed
- the happy path was manually exercised across multiple signed-in sessions

### Intentionally deferred

Do not treat these as Milestone 1 gaps. They were explicitly out of scope:

- ballots and stars
- voting
- scoring and standings
- automatic submission -> voting transition
- Spotify integration
- leave or remove flows beyond the happy path
- generalized capability machinery
- broader transport work beyond the current router-client path

---

## Milestone 2: round completion demo

_Active. Updated on 2026-03-09. Tracked in [#10](https://github.com/jssee/auxchamp/issues/10)._

### Goal

Extend the current slice from “players can submit” to “a round can complete and produce results.”

A successful Milestone 2 flow is:

1. players submit tracks for the active round
2. the creator advances the round to voting when ready
3. active players save ballots for that voting round
4. the creator advances the round to scored
5. the app shows round results and cumulative standings
6. the next round opens for submission, or the game completes if no rounds remain

### Why this is the next slice

Milestone 1 proved the stack and the first game action. Milestone 2 adds the first real gameplay complexity:

- cross-player write rules
- score derivation
- phase transitions
- visible game outcomes

That is the next useful boundary. Spotify, background automation, and deeper hardening can wait until round completion works.

### In scope

#### DB in `@auxchamp/db`

Add:

- `ballot`
- `star`

Keep DB constraints structural and cheap:

- one `ballot` per `(round_id, player_id)`
- one `star` per `(ballot_id, submission_id)`

Do not push full voting logic into the database if service-layer checks are the right owner.

#### API write surface in `@auxchamp/api`

Extend the current flat API modules:

- `packages/api/src/schema.ts`
- `packages/api/src/mutation.ts`
- `packages/api/src/router.ts`

Add the minimum write surface needed for voting and progression:

- a ballot save/update command that matches current naming style
- creator-controlled phase-advance commands for the active round
- scoring and progression logic that stays in explicit application code

Keep transaction boundaries clear. Do not introduce a generalized workflow engine in this milestone.

#### Read surface in `@auxchamp/api`

Extend `getGame` instead of introducing a fragmented family of new reads unless that becomes clearly necessary.

The game-detail read should grow to include:

- actor ballot state for the active voting round
- round result data once a round is scored
- cumulative standings across scored rounds
- enough phase detail to render creator controls and active-player actions clearly

#### Web flow in `apps/web`

Extend the existing surfaces:

- `apps/web/src/lib/game.remote.ts`
- `apps/web/src/routes/games/[id]/+page.server.ts`
- `apps/web/src/routes/games/[id]/+page.svelte`

Add:

- voting UI for the active voting round
- creator-only “advance phase now” controls
- round results display
- standings display

Optimize for clarity and demoability, not final polish.

### Rules to enforce now

These rules belong in the API layer for Milestone 2:

- only active players may vote
- only the active voting round may accept ballots
- a ballot must target exactly 3 submissions
- the 3 submissions must be distinct
- self-voting is forbidden
- all selected submissions must belong to the active round
- players may update only their own ballot while voting is open
- only the creator may advance the active round manually

### Creator-controlled phase advancement

Manual phase advancement is in scope as a real product feature.

Why keep it:

- it makes demos and manual play practical
- it gives the creator explicit control when all players are ready early
- it does not block us from adding time-based automatic advancement later

Scope for now:

- creator may advance the active round from submitting to voting
- creator may advance the active round from voting to scored

Non-goal for this milestone:

- background schedulers or workers that advance phases automatically when windows expire

### Demo definition

A good Milestone 2 demo is:

1. creator starts a game with at least 4 active players
2. players submit tracks for the active round
3. creator advances the round to voting immediately
4. each active player casts exactly 3 stars on 3 distinct non-self submissions
5. creator advances the round to scored
6. the game page shows round results and cumulative standings
7. if another pending round exists, it opens for submission; otherwise the game completes

### Done when

- a full round can move from submitting -> voting -> scored through the app
- voting rules are enforced server-side
- standings are visible in the app after scoring
- the creator can advance phases manually from the app
- if more rounds exist, the next round opens automatically; otherwise the game completes
- focused tests cover voting rules and round transition behavior
- `bun run check` passes
- `bun run check-types` passes
- browser verification evidence exists for the multi-user happy path

### Explicitly out of scope

Do not include these in Milestone 2:

- Spotify playlist integration
- background schedulers or workers for automatic advancement
- generalized capability or workflow engines
- leave, remove, or rejoin flows
- transport work beyond the existing router-client path
- full hardening of every concurrency edge

---

## Milestone 3: Spotify integration and transport cleanup

_Provisional. Updated on 2026-03-09._

### Goal

Add the playlist integration boundary and clean up any transport concerns that remain after Milestone 2.

### In scope

- define a playlist adapter boundary in `@auxchamp/api`
- add fake and real Spotify implementations behind that boundary
- wire playlist creation into the submission -> voting transition path
- keep `appRouter` flat and game-specific
- only expand HTTP-facing transport surfaces when a real consumer needs them

### Done when

- Spotify integration works behind a clear adapter boundary
- transport concerns remain thin and do not duplicate game rules

### Shortcut cost

Inline playlist creation may orphan a playlist if the external call succeeds and the DB transaction fails.

### Replacement condition

Move playlist creation behind an outbox or retryable background flow when operational reliability becomes a requirement.

---

## Milestone 4: hardening and edge cases

_Provisional. Updated on 2026-03-09._

### Goal

Make the MVP resistant to concurrency, stale writes, and the first real wave of unhappy paths.

### In scope

- stronger transaction and locking patterns where current writes are too optimistic
- clearer domain error posture if current errors stop scaling
- leave and remove edge behavior
- too-few-submissions handling if the initial product choice needs revision
- concurrency tests
- DB-backed integration tests where unit-level checks are no longer enough

### Done when

- stale submit and vote writes are rejected reliably
- phase transitions are deterministic under concurrent access
- major unhappy paths are covered by tests

---

## Risks to control

_Updated on 2026-03-09._

1. **Rule duplication across transport layers**
   - Keep game rules in `packages/api/src/*` only.
2. **Over-abstracting transitions too early**
   - No generic FSM or workflow engine in Milestone 2.
3. **Premature integration work**
   - Do not build Spotify or scheduler infrastructure before round completion works.
4. **Concurrency regressions**
   - Keep writes transactional and raise the locking bar when the current approach stops being sufficient.

---

## Exit criteria

The app is ready to move beyond MVP slices when:

- draft game setup works end to end
- invite, join, start, submit, vote, and score rules are enforced
- rounds can advance and complete predictably
- the game can open the next round or complete cleanly
- first-party app flows work through the current SvelteKit structure
- shared game logic is not duplicated across transport layers
- verification commands pass
