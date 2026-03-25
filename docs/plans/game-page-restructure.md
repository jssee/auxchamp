# Game page restructure

## Context

The game detail page (`/g/[id]`) is a 344-line monolith that renders every game state inline: draft setup, submission, voting, results, and standings. It uses `$effect` to sync ballot selections with server state. The single `getGame` API query returns everything — round-specific data, voting submissions, results — regardless of what the user is looking at.

Breaking this into route-based pages lets SvelteKit load functions fetch only the data each page needs, eliminates `$effect` for ballot state (load function provides it as props), and gives each concern a focused URL.

## Target routes

```
/g/[gameId]                    → game overview: header, players, rounds list, standings
  └── +layout.server.ts        → loads game shell (metadata, players, rounds, standings, actions)

/g/[gameId]/edit               → creator management: invite players, add rounds, start game
  ├── InvitePlayerForm
  ├── AddRoundForm
  └── start game / accept invite forms

/g/[gameId]/r/[roundId]        → round detail: theme, description, phase-specific forms
  ├── +page.server.ts          → loads round detail + phase data (submissions or ballot)
  ├── SubmissionForm           → during submitting phase
  └── BallotForm               → during voting phase

/g/[gameId]/r/[roundId]/results → round results: star counts per submission
  └── +page.server.ts          → loads round results
```

## Approach

### 1. Shared game layout

Add `+layout.server.ts` at `/g/[gameId]/` that loads game-level data shared by all child routes: game metadata, players, rounds summary, standings, and the actor's actions. Child pages access this via `data.game` from the parent layout.

This replaces the single `getGame` mega-query. The layout loads the "shell"; child pages load page-specific data.

### 2. Split the API

The current `getGame` query does too much. Split into focused queries:

- **`getGame`** (existing, trimmed) → game metadata, players, rounds summary, standings, roundResults, actions. Remove round-specific actor data (`actorSubmission`, `actorBallot`, `votingSubmissions`, `activeRound`).
- **`getRound`** (new) → single round detail with phase-specific data: round metadata, actor's submission (if submitting), actor's ballot + voting submissions (if voting), results (if scored). Takes `gameId` + `roundId`.

No separate `getRoundResults` query needed — `getRound` returns results when the round is scored, and the overview already has `roundResults` from `getGame`. The `/r/[roundId]/results` page loads the same `getRound` query and renders just the results section.

### 3. Eliminate `$effect` for ballot state

Currently the page uses `$effect` to sync `selectedSubmissions` from `game.actorBallot`. With the new structure, the round page's load function provides `actorBallot` as initial data. The `BallotForm` component initializes its local selection state from props — no effect needed.

### 4. Remote functions stay as `form()`

The `form()` remote functions in `game.remote.ts` stay. They work with the new routes unchanged — `gameId` comes from the route param (available in the page), forms submit to the same API procedures.

### 5. Route param rename: `[id]` → `[gameId]`

The current route uses `[id]`. Rename to `[gameId]` for clarity now that `[roundId]` is a sibling param.

## Files to modify

### API package (`packages/api`)

| File                | Change                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/query.ts`      | Trim `getGame` (remove `activeRound`, `actorSubmission`, `actorBallot`, `votingSubmissions`), add `getRound` |
| `src/schema.ts`     | Add `getRoundInput/OutputSchema`, trim `getGameOutputSchema`                                                 |
| `src/contract.ts`   | Add `getRound` contract                                                                                      |
| `src/router.ts`     | Wire `getRound` procedure                                                                                    |
| `src/query.test.ts` | Tests for `getRound`, update `getGame` tests                                                                 |

### Web app (`apps/web`)

| File                                                        | Change                                                                                 |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `src/routes/g/[gameId]/+layout.server.ts`                   | New — loads game shell                                                                 |
| `src/routes/g/[gameId]/+layout.svelte`                      | New — renders game header + nav, `{@render children()}`                                |
| `src/routes/g/[gameId]/+page.svelte`                        | Rewrite — overview: rounds list, standings                                             |
| `src/routes/g/[gameId]/edit/+page.svelte`                   | New — creator-only: invite, add rounds, start game                                     |
| `src/routes/g/[gameId]/edit/+page.server.ts`                | New — guard: redirect non-creators (checks `actorPlayer.role` from parent layout data) |
| `src/routes/g/[gameId]/r/[roundId]/+page.server.ts`         | New — loads round via `getRound`                                                       |
| `src/routes/g/[gameId]/r/[roundId]/+page.svelte`            | New — round detail: phase info, submission/ballot forms, advance control               |
| `src/routes/g/[gameId]/r/[roundId]/results/+page.server.ts` | New — loads round via `getRound`, guard: only scored rounds                            |
| `src/routes/g/[gameId]/r/[roundId]/results/+page.svelte`    | New — results display                                                                  |
| `src/routes/g/[gameId]/r/[roundId]/BallotForm.svelte`       | New — extracted from current page                                                      |
| `src/routes/g/[gameId]/edit/AddRoundForm.svelte`            | Move from current location                                                             |
| `src/routes/g/[gameId]/edit/InvitePlayerForm.svelte`        | Move from current location                                                             |
| `src/routes/g/[gameId]/r/[roundId]/SubmissionForm.svelte`   | Move from current location                                                             |
| `src/lib/game.remote.ts`                                    | Keep as-is, forms work unchanged                                                       |

### Delete

| File                                    | Reason                  |
| --------------------------------------- | ----------------------- |
| `src/routes/g/[id]/` (entire directory) | Replaced by `[gameId]/` |

## Reuse

- `createApi()` from `$lib/server/api` — all load functions use this
- `rethrowAsIssue()` from `$lib/server/rethrow-as-issue` — form error handling
- `getAllowedActions()` from `capability.ts` — stays in `getGame`, drives UI
- `Button`, `Field.*` from `$lib/components/ui/` — all form elements
- `form()` remote functions from `$lib/game.remote.ts` — unchanged

## Steps

- [ ] **API: `getRound`** — Add query, schema, contract, router wiring
- [ ] **API: Trim `getGame`** — Remove `activeRound`, `actorSubmission`, `actorBallot`, `votingSubmissions`
- [ ] **API: Tests** — Add `getRound` tests, update `getGame` tests for trimmed output
- [ ] **Layout** — Create `/g/[gameId]/+layout.server.ts` (loads game shell) and `+layout.svelte` (header, nav, accept-invite banner)
- [ ] **Overview page** — Rewrite `/g/[gameId]/+page.svelte` (rounds list with links, full results inline, standings)
- [ ] **Edit page** — Create `/g/[gameId]/edit/+page.server.ts` (creator guard) and `+page.svelte` (invite, add round, start game). Move `AddRoundForm` and `InvitePlayerForm` here.
- [ ] **Round detail** — Create `/g/[gameId]/r/[roundId]/+page.server.ts` and `+page.svelte` (phase info, SubmissionForm/BallotForm, advance control for creator)
- [ ] **BallotForm** — Extract from current page into `/r/[roundId]/BallotForm.svelte`, initialize selections from load data (no `$effect`)
- [ ] **Round results** — Create `/g/[gameId]/r/[roundId]/results/+page.server.ts` (scored guard) and `+page.svelte`
- [ ] **Links + redirects** — Update `startGame` redirect to point to opened round, add round links from overview
- [ ] **Cleanup** — Delete old `/g/[id]/` route directory
- [ ] **Verify** — API tests pass, `svelte-check` clean, manual walkthrough of game lifecycle

## Verification

- `bun test packages/api/src/` — all query/mutation tests pass
- `npx svelte-check` — zero new errors
- Manual: navigate game lifecycle (draft → active → scored → completed) through new routes
- Manual: verify each page loads only its data (check network/server logs)

## Design decisions

- **`/edit` is creator-only.** Accept-invite banner stays on the overview page.
- **Pending rounds show theme + description.** Minimal read-only view so players can see what's coming.
- **Advance round lives on the round detail page only.** Creator advances from `/r/[roundId]`, co-located with the round context.
- **Overview shows full results inline for scored rounds.** The `getGame` query keeps `roundResults` and `standings` data (no separate results fetch needed for the overview).
