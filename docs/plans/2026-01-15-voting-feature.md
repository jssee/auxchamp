# Voting Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 3-star voting system where players award stars to submissions, with results tracking and battle standings.

**Architecture:** Players select 3 different submissions during voting phase, batch submit. Stats aggregate at stage close via QStash transition. Results visible after voting or when stage closes.

**Tech Stack:** SvelteKit, Drizzle ORM, Valibot, Svelte 5 runes, shadcn-svelte components

---

## Task 1: Add userStats table (ticket a-f991)

**Files:**

- Modify: `src/lib/server/db/schema/public.ts`

**Step 1: Add userStats table schema**

Add after `spotifyCredentials` table:

```typescript
export const userStats = pgTable("user_stats", {
  id: text("id").primaryKey(),
  userId: text()
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  lifetimeStarsEarned: integer().default(0).notNull(),
  lifetimeStagesWon: integer().default(0).notNull(),
  battlesCompleted: integer().default(0).notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});

export const userStatsRelations = relations(userStats, ({ one }) => ({
  user: one(user, {
    fields: [userStats.userId],
    references: [user.id],
  }),
}));
```

**Step 2: Push schema to database**

Run: `bun run db:push`
Expected: Schema changes applied successfully

**Step 3: Commit**

```bash
git add src/lib/server/db/schema/public.ts
git commit -m "feat: add userStats table for lifetime player statistics"
```

---

## Task 2: Modify star table constraints (ticket a-f352)

**Files:**

- Modify: `src/lib/server/db/schema/public.ts`

**Step 1: Add unique constraint to star table**

Replace star table definition:

```typescript
export const star = pgTable(
  "star",
  {
    id: text("id").primaryKey(),
    stageId: text().notNull(),
    voterId: text().notNull(),
    submissionId: text().notNull(),
    votedAt: integer(),
  },
  (t) => ({
    uniqueVote: unique().on(t.stageId, t.voterId, t.submissionId),
  }),
);
```

**Step 2: Push schema to database**

Run: `bun run db:push`
Expected: Schema changes applied successfully

**Step 3: Commit**

```bash
git add src/lib/server/db/schema/public.ts
git commit -m "feat: add unique constraint to star table preventing duplicate votes"
```

---

## Task 3: Implement castVotes handler (ticket a-70e8)

**Files:**

- Modify: `src/lib/schemas/stage.ts`
- Modify: `src/lib/remote/stage.remote.ts`
- Modify: `src/lib/remote/stage.remote.test.ts`

**Step 1: Write failing test for castVotesSchema**

Add to `src/lib/remote/stage.remote.test.ts`:

```typescript
import { submitSchema, castVotesSchema } from "$lib/schemas/stage";

describe("castVotesSchema", () => {
  it("accepts valid vote with exactly 3 submission IDs", () => {
    const result = v.safeParse(castVotesSchema, {
      stageId: "stage123",
      submissionIds: ["sub1", "sub2", "sub3"],
    });

    expect(result.success).toBe(true);
  });

  it("rejects fewer than 3 submission IDs", () => {
    const result = v.safeParse(castVotesSchema, {
      stageId: "stage123",
      submissionIds: ["sub1", "sub2"],
    });

    expect(result.success).toBe(false);
  });

  it("rejects more than 3 submission IDs", () => {
    const result = v.safeParse(castVotesSchema, {
      stageId: "stage123",
      submissionIds: ["sub1", "sub2", "sub3", "sub4"],
    });

    expect(result.success).toBe(false);
  });

  it("rejects duplicate submission IDs", () => {
    const result = v.safeParse(castVotesSchema, {
      stageId: "stage123",
      submissionIds: ["sub1", "sub1", "sub2"],
    });

    expect(result.success).toBe(false);
  });

  it("requires stageId", () => {
    const result = v.safeParse(castVotesSchema, {
      submissionIds: ["sub1", "sub2", "sub3"],
    });

    expect(result.success).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test:unit src/lib/remote/stage.remote.test.ts`
Expected: FAIL - castVotesSchema not exported

**Step 3: Add castVotesSchema**

Add to `src/lib/schemas/stage.ts`:

```typescript
export const castVotesSchema = v.pipe(
  v.object({
    stageId: v.string(),
    submissionIds: v.pipe(
      v.array(v.string()),
      v.length(3, "Must select exactly 3 submissions"),
    ),
  }),
  v.forward(
    v.check(
      (input) => new Set(input.submissionIds).size === 3,
      "Cannot vote for the same submission twice",
    ),
    ["submissionIds"],
  ),
);
```

**Step 4: Run test to verify it passes**

Run: `bun run test:unit src/lib/remote/stage.remote.test.ts`
Expected: PASS

**Step 5: Commit schema**

```bash
git add src/lib/schemas/stage.ts src/lib/remote/stage.remote.test.ts
git commit -m "feat: add castVotesSchema with 3-submission validation"
```

**Step 6: Implement castVotes handler**

Add to `src/lib/remote/stage.remote.ts`:

```typescript
import { castVotesSchema } from "$lib/schemas/stage";
import { sql } from "drizzle-orm";

export const castVotes = form(castVotesSchema, async (data, invalid) => {
  const { locals } = getRequestEvent();
  if (!locals.user) error(401, "Not authenticated");

  const currentStage = await db.query.stage.findFirst({
    where: eq(stage.id, data.stageId),
    with: { battle: true },
  });

  if (!currentStage) error(404, "Stage not found");

  if (currentStage.battle.status !== "active") {
    invalid("Battle is not active");
    return;
  }

  if (currentStage.battle.currentStageId !== currentStage.id) {
    invalid("This stage is not active");
    return;
  }

  const now = new Date();
  if (now < currentStage.submissionDeadline) {
    invalid("Voting has not started yet");
    return;
  }
  if (now >= currentStage.votingDeadline) {
    invalid("Voting deadline has passed");
    return;
  }

  // Check minimum submissions (4 required)
  const submissionCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(submission)
    .where(eq(submission.stageId, data.stageId));

  if (submissionCount[0].count < 4) {
    invalid("Not enough submissions for voting");
    return;
  }

  // Verify all submissions exist and none are user's own
  const targetSubmissions = await db.query.submission.findMany({
    where: and(
      eq(submission.stageId, data.stageId),
      sql`${submission.id} IN ${data.submissionIds}`,
    ),
  });

  if (targetSubmissions.length !== 3) {
    invalid("One or more submissions not found");
    return;
  }

  const ownSubmission = targetSubmissions.find(
    (s) => s.userId === locals.user!.id,
  );
  if (ownSubmission) {
    invalid("Cannot vote for your own submission");
    return;
  }

  // Check if already voted
  const existingVotes = await db.query.star.findFirst({
    where: and(
      eq(star.stageId, data.stageId),
      eq(star.voterId, locals.user.id),
    ),
  });

  if (existingVotes) {
    invalid("You have already voted in this stage");
    return;
  }

  // Insert all 3 votes atomically
  const votedAt = Math.floor(Date.now() / 1000);
  await db.transaction(async (tx) => {
    for (const submissionId of data.submissionIds) {
      await tx.insert(star).values({
        id: nanoid(8),
        stageId: data.stageId,
        voterId: locals.user!.id,
        submissionId,
        votedAt,
      });

      await tx
        .update(submission)
        .set({
          starsReceived: sql`COALESCE(${submission.starsReceived}, 0) + 1`,
        })
        .where(eq(submission.id, submissionId));
    }
  });

  return { success: true };
});
```

**Step 7: Commit handler**

```bash
git add src/lib/remote/stage.remote.ts
git commit -m "feat: implement castVotes handler for batch 3-star voting"
```

---

## Task 4: Add voting eligibility to stage loader (ticket a-fe3a)

**Files:**

- Modify: `src/routes/b/[id]/s/[id]/+page.server.ts`

**Step 1: Add voting-related data to loader**

Replace loader in `src/routes/b/[id]/s/[id]/+page.server.ts`:

```typescript
import { error, redirect } from "@sveltejs/kit";
import { eq, and, sql } from "drizzle-orm";

import { db } from "$lib/server/db";
import { stage, submission, player, star } from "$lib/server/db/schema";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) redirect(302, "/signin");

  const currentStage = await db.query.stage.findFirst({
    where: eq(stage.id, params.id),
    with: { battle: true },
  });

  if (!currentStage) error(404, "Stage not found");

  const isCreator = currentStage.battle.creatorId === locals.user.id;
  const isPlayer = isCreator
    ? true
    : await db.query.player
        .findFirst({
          where: and(
            eq(player.battleId, currentStage.battleId),
            eq(player.userId, locals.user.id),
          ),
        })
        .then((p) => !!p);

  if (!isPlayer) error(403, "Not a participant in this battle");

  const userSubmissions = await db.query.submission.findMany({
    where: and(
      eq(submission.stageId, params.id),
      eq(submission.userId, locals.user.id),
    ),
  });

  const showOtherSubmissions =
    currentStage.phase === "voting" || currentStage.phase === "closed";

  const otherSubmissions = showOtherSubmissions
    ? await db.query.submission.findMany({
        where: eq(submission.stageId, params.id),
        with: { user: true },
      })
    : [];

  // Voting eligibility
  const userVotes = await db.query.star.findMany({
    where: and(eq(star.stageId, params.id), eq(star.voterId, locals.user.id)),
  });

  const hasVoted = userVotes.length > 0;
  const votedSubmissionIds = userVotes.map((v) => v.submissionId);

  const submissionCount = otherSubmissions.length;
  const votableSubmissions = otherSubmissions.filter(
    (s) => s.userId !== locals.user!.id,
  );

  const now = new Date();
  const inVotingPhase =
    currentStage.phase === "voting" ||
    (now >= currentStage.submissionDeadline &&
      now < currentStage.votingDeadline);

  const canVote =
    inVotingPhase &&
    !hasVoted &&
    submissionCount >= 4 &&
    votableSubmissions.length >= 3;

  // Vote results (only if user voted or stage closed)
  let voteResults: Array<{
    submission: (typeof otherSubmissions)[0];
    starsReceived: number;
    rank: number;
    voters: Array<{ id: string; name: string | null }>;
  }> = [];

  if (hasVoted || currentStage.phase === "closed") {
    const allStars = await db.query.star.findMany({
      where: eq(star.stageId, params.id),
      with: { voter: true },
    });

    const starsBySubmission = new Map<string, typeof allStars>();
    for (const s of allStars) {
      const existing = starsBySubmission.get(s.submissionId) || [];
      existing.push(s);
      starsBySubmission.set(s.submissionId, existing);
    }

    const ranked = otherSubmissions
      .map((sub) => ({
        submission: sub,
        starsReceived: sub.starsReceived || 0,
        voters: (starsBySubmission.get(sub.id) || []).map((s) => ({
          id: s.voter.id,
          name: s.voter.name,
        })),
      }))
      .sort((a, b) => b.starsReceived - a.starsReceived);

    let currentRank = 1;
    let previousStars = -1;
    voteResults = ranked.map((item, index) => {
      if (item.starsReceived !== previousStars) {
        currentRank = index + 1;
        previousStars = item.starsReceived;
      }
      return { ...item, rank: currentRank };
    });
  }

  const maxSubmissions = currentStage.battle.doubleSubmissions ? 2 : 1;
  const canSubmit =
    currentStage.phase === "submission" &&
    now < currentStage.submissionDeadline &&
    userSubmissions.length < maxSubmissions;

  const canCreatePlaylist =
    isCreator &&
    currentStage.phase === "submission" &&
    !currentStage.spotifyPlaylistId;

  return {
    stage: currentStage,
    battle: currentStage.battle,
    userSubmissions,
    otherSubmissions,
    canSubmit,
    maxSubmissions,
    user: locals.user,
    isCreator,
    canCreatePlaylist,
    // Voting data
    hasVoted,
    votedSubmissionIds,
    canVote,
    voteResults,
    votableSubmissions,
  };
};
```

**Step 2: Run type check**

Run: `bun run check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/routes/b/[id]/s/[id]/+page.server.ts
git commit -m "feat: add voting eligibility and results to stage loader"
```

---

## Task 5: Build voting UI components (ticket a-f628)

**Files:**

- Modify: `src/routes/b/[id]/s/[id]/+page.svelte`

**Step 1: Add voting UI to stage page**

Replace `src/routes/b/[id]/s/[id]/+page.svelte`:

```svelte
<script lang="ts">
  import Star from "@lucide/svelte/icons/star";
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import * as Field from "$lib/components/ui/field";
  import {
    submitTrack,
    createPlaylist,
    castVotes,
  } from "$lib/remote/stage.remote";
  import type { PageProps } from "./$types";

  let creatingPlaylist = $state(false);
  let playlistError = $state<string | null>(null);
  let selectedSubmissions = $state<Set<string>>(new Set());
  let votingError = $state<string | null>(null);
  let submittingVotes = $state(false);

  async function handleCreatePlaylist(stageId: string) {
    creatingPlaylist = true;
    playlistError = null;
    try {
      const result = await createPlaylist({ stageId });
      if (result.playlistUrl) {
        window.location.reload();
      }
    } catch (err) {
      playlistError =
        err instanceof Error ? err.message : "Failed to create playlist";
    } finally {
      creatingPlaylist = false;
    }
  }

  function toggleSelection(submissionId: string) {
    const newSet = new Set(selectedSubmissions);
    if (newSet.has(submissionId)) {
      newSet.delete(submissionId);
    } else if (newSet.size < 3) {
      newSet.add(submissionId);
    }
    selectedSubmissions = newSet;
  }

  async function handleSubmitVotes() {
    if (selectedSubmissions.size !== 3) return;

    submittingVotes = true;
    votingError = null;
    try {
      const result = await castVotes({
        stageId: data.stage.id,
        submissionIds: Array.from(selectedSubmissions),
      });
      if (result.success) {
        window.location.reload();
      }
    } catch (err) {
      votingError =
        err instanceof Error ? err.message : "Failed to submit votes";
    } finally {
      submittingVotes = false;
    }
  }

  let { data }: PageProps = $props();

  function extractTrackId(url: string): string | null {
    const match = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  function formatDeadline(date: Date): string {
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  const phaseVariant = {
    upcoming: "secondary",
    submission: "default",
    voting: "outline",
    closed: "destructive",
  } as const;
</script>

<main class="col-content space-y-6">
  <Card.Root>
    <Card.Header>
      <div class="flex items-center justify-between">
        <Card.Title
          >Stage {data.stage.stageNumber}: {data.stage.vibe}</Card.Title
        >
        <Badge variant={phaseVariant[data.stage.phase]}
          >{data.stage.phase}</Badge
        >
      </div>
      {#if data.stage.description}
        <Card.Description>{data.stage.description}</Card.Description>
      {/if}
    </Card.Header>
    <Card.Content>
      <dl class="grid gap-2 text-sm">
        <div class="flex justify-between">
          <dt class="text-muted-foreground">Submission deadline</dt>
          <dd>{formatDeadline(data.stage.submissionDeadline)}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-muted-foreground">Voting deadline</dt>
          <dd>{formatDeadline(data.stage.votingDeadline)}</dd>
        </div>
      </dl>
    </Card.Content>
    {#if data.stage.playlistUrl}
      <Card.Footer>
        <a
          href={data.stage.playlistUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm text-primary hover:underline"
        >
          Listen to Stage Playlist on Spotify
        </a>
      </Card.Footer>
    {:else if data.canCreatePlaylist}
      <Card.Footer class="flex-col items-start gap-2">
        <Button
          variant="outline"
          onclick={() => handleCreatePlaylist(data.stage.id)}
          disabled={creatingPlaylist}
        >
          {creatingPlaylist ? "Creating..." : "Create Playlist Early"}
        </Button>
        {#if playlistError}
          <p class="text-sm text-destructive">{playlistError}</p>
        {/if}
      </Card.Footer>
    {/if}
  </Card.Root>

  {#if data.canSubmit}
    <Card.Root>
      <Card.Header>
        <Card.Title>Submit a Track</Card.Title>
        <Card.Description>
          {data.userSubmissions.length} of {data.maxSubmissions} submission{data.maxSubmissions >
          1
            ? "s"
            : ""} used
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <form {...submitTrack} class="space-y-4">
          <input type="hidden" name="stageId" value={data.stage.id} />
          <Field.Group>
            <Field.Field>
              <Field.Label for="spotifyUrl">Spotify URL</Field.Label>
              {#each submitTrack.fields.spotifyUrl.issues() as issue}
                <Field.Error>{issue.message}</Field.Error>
              {/each}
              <Input
                id="spotifyUrl"
                {...submitTrack.fields.spotifyUrl.as("url")}
                placeholder="https://open.spotify.com/track/..."
              />
            </Field.Field>
            <Field.Field>
              <Field.Label for="note">Note (optional)</Field.Label>
              {#each submitTrack.fields.note.issues() as issue}
                <Field.Error>{issue.message}</Field.Error>
              {/each}
              <Textarea
                id="note"
                name="note"
                maxlength={280}
                placeholder="Why does this track fit the vibe?"
              />
            </Field.Field>
            <Button type="submit">Submit Track</Button>
          </Field.Group>
        </form>
      </Card.Content>
    </Card.Root>
  {/if}

  {#if data.userSubmissions.length > 0}
    <Card.Root>
      <Card.Header>
        <Card.Title>Your Submissions</Card.Title>
      </Card.Header>
      <Card.Content class="space-y-4">
        {#each data.userSubmissions as sub}
          {@const trackId = sub.spotifyUrl
            ? extractTrackId(sub.spotifyUrl)
            : null}
          <div class="space-y-2">
            {#if trackId}
              <iframe
                title="Spotify embed"
                src="https://open.spotify.com/embed/track/{trackId}"
                width="100%"
                height="80"
                allow="encrypted-media"
                style="border-radius: 12px"
              ></iframe>
            {:else}
              <p class="text-sm text-muted-foreground">{sub.spotifyUrl}</p>
            {/if}
            {#if sub.note}
              <p class="text-sm text-muted-foreground">{sub.note}</p>
            {/if}
          </div>
        {/each}
      </Card.Content>
    </Card.Root>
  {/if}

  {#if data.canVote}
    <Card.Root>
      <Card.Header>
        <Card.Title>Cast Your Votes</Card.Title>
        <Card.Description>
          Select 3 submissions to award your stars ({selectedSubmissions.size}/3
          selected)
        </Card.Description>
      </Card.Header>
      <Card.Content class="space-y-4">
        {#each data.votableSubmissions as sub}
          {@const trackId = sub.spotifyUrl
            ? extractTrackId(sub.spotifyUrl)
            : null}
          {@const isSelected = selectedSubmissions.has(sub.id)}
          <button
            type="button"
            class="w-full space-y-2 rounded-lg border-2 p-3 text-left transition-colors {isSelected
              ? 'border-primary bg-primary/5'
              : 'border-transparent hover:border-muted'}"
            onclick={() => toggleSelection(sub.id)}
          >
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium">{sub.user.name}</p>
              <Star
                class="size-5 {isSelected
                  ? 'fill-primary text-primary'
                  : 'text-muted-foreground'}"
              />
            </div>
            {#if trackId}
              <iframe
                title="Spotify embed"
                src="https://open.spotify.com/embed/track/{trackId}"
                width="100%"
                height="80"
                allow="encrypted-media"
                style="border-radius: 12px; pointer-events: none;"
              ></iframe>
            {:else}
              <p class="text-sm text-muted-foreground">{sub.spotifyUrl}</p>
            {/if}
            {#if sub.note}
              <p class="text-sm text-muted-foreground">{sub.note}</p>
            {/if}
          </button>
        {/each}
      </Card.Content>
      <Card.Footer class="flex-col items-start gap-2">
        <Button
          onclick={handleSubmitVotes}
          disabled={selectedSubmissions.size !== 3 || submittingVotes}
        >
          {submittingVotes ? "Submitting..." : "Submit Votes"}
        </Button>
        {#if votingError}
          <p class="text-sm text-destructive">{votingError}</p>
        {/if}
      </Card.Footer>
    </Card.Root>
  {:else if data.stage.phase === "voting" && data.otherSubmissions.length < 4}
    <Card.Root>
      <Card.Header>
        <Card.Title>Voting Unavailable</Card.Title>
        <Card.Description>
          Not enough submissions for voting (minimum 4 required)
        </Card.Description>
      </Card.Header>
    </Card.Root>
  {/if}

  {#if data.hasVoted || data.stage.phase === "closed"}
    {#if data.voteResults.length > 0}
      <Card.Root>
        <Card.Header>
          <Card.Title>Results</Card.Title>
          {#if data.hasVoted && data.stage.phase !== "closed"}
            <Card.Description
              >You voted! Results will be final when voting closes.</Card.Description
            >
          {/if}
        </Card.Header>
        <Card.Content class="space-y-6">
          {#each data.voteResults as result}
            {@const trackId = result.submission.spotifyUrl
              ? extractTrackId(result.submission.spotifyUrl)
              : null}
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <Badge variant={result.rank === 1 ? "default" : "secondary"}>
                  {result.rank === 1
                    ? "1st"
                    : result.rank === 2
                      ? "2nd"
                      : result.rank === 3
                        ? "3rd"
                        : `${result.rank}th`}
                </Badge>
                <span class="text-sm font-medium"
                  >{result.submission.user.name}</span
                >
                <span class="ml-auto text-sm text-muted-foreground">
                  {result.starsReceived} star{result.starsReceived !== 1
                    ? "s"
                    : ""}
                </span>
              </div>
              {#if trackId}
                <iframe
                  title="Spotify embed"
                  src="https://open.spotify.com/embed/track/{trackId}"
                  width="100%"
                  height="80"
                  allow="encrypted-media"
                  style="border-radius: 12px"
                ></iframe>
              {:else}
                <p class="text-sm text-muted-foreground">
                  {result.submission.spotifyUrl}
                </p>
              {/if}
              {#if result.submission.note}
                <p class="text-sm text-muted-foreground">
                  {result.submission.note}
                </p>
              {/if}
              {#if result.voters.length > 0}
                <div
                  class="flex items-center gap-1 text-xs text-muted-foreground"
                >
                  <span>Voted by:</span>
                  {#each result.voters as voter, i}
                    <span
                      >{voter.name}{i < result.voters.length - 1
                        ? ","
                        : ""}</span
                    >
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </Card.Content>
        <Card.Footer>
          <a
            href="/b/{data.battle.id}/s/{data.stage.id}/results"
            class="text-sm text-primary hover:underline"
          >
            View Full Results
          </a>
        </Card.Footer>
      </Card.Root>
    {/if}
  {:else if data.otherSubmissions.length > 0 && !data.canVote && data.stage.phase !== "submission"}
    <Card.Root>
      <Card.Header>
        <Card.Title>All Submissions</Card.Title>
      </Card.Header>
      <Card.Content class="space-y-4">
        {#each data.otherSubmissions as sub}
          {@const trackId = sub.spotifyUrl
            ? extractTrackId(sub.spotifyUrl)
            : null}
          <div class="space-y-2">
            <p class="text-sm font-medium">{sub.user.name}</p>
            {#if trackId}
              <iframe
                title="Spotify embed"
                src="https://open.spotify.com/embed/track/{trackId}"
                width="100%"
                height="80"
                allow="encrypted-media"
                style="border-radius: 12px"
              ></iframe>
            {:else}
              <p class="text-sm text-muted-foreground">{sub.spotifyUrl}</p>
            {/if}
            {#if sub.note}
              <p class="text-sm text-muted-foreground">{sub.note}</p>
            {/if}
          </div>
        {/each}
      </Card.Content>
    </Card.Root>
  {/if}
</main>
```

**Step 2: Run type check**

Run: `bun run check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/routes/b/[id]/s/[id]/+page.svelte
git commit -m "feat: add voting UI with star selection and results display"
```

---

## Task 6: Create results page (ticket a-e4ac)

**Files:**

- Create: `src/routes/b/[id]/s/[id]/results/+page.server.ts`
- Create: `src/routes/b/[id]/s/[id]/results/+page.svelte`

**Step 1: Create results page loader**

Create `src/routes/b/[id]/s/[id]/results/+page.server.ts`:

```typescript
import { error, redirect } from "@sveltejs/kit";
import { eq, and } from "drizzle-orm";

import { db } from "$lib/server/db";
import { stage, submission, player, star } from "$lib/server/db/schema";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) redirect(302, "/signin");

  const currentStage = await db.query.stage.findFirst({
    where: eq(stage.id, params.id),
    with: { battle: { with: { stages: true } } },
  });

  if (!currentStage) error(404, "Stage not found");

  const isCreator = currentStage.battle.creatorId === locals.user.id;
  const isPlayer = isCreator
    ? true
    : await db.query.player
        .findFirst({
          where: and(
            eq(player.battleId, currentStage.battleId),
            eq(player.userId, locals.user.id),
          ),
        })
        .then((p) => !!p);

  if (!isPlayer) error(403, "Not a participant in this battle");

  // Check if user can view results
  const userVoted = await db.query.star.findFirst({
    where: and(eq(star.stageId, params.id), eq(star.voterId, locals.user.id)),
  });

  const canViewResults = !!userVoted || currentStage.phase === "closed";

  if (!canViewResults) {
    redirect(302, `/b/${currentStage.battleId}/s/${params.id}`);
  }

  // Get all submissions with user info
  const submissions = await db.query.submission.findMany({
    where: eq(submission.stageId, params.id),
    with: { user: true },
  });

  // Get all stars with voter info
  const allStars = await db.query.star.findMany({
    where: eq(star.stageId, params.id),
    with: { voter: true },
  });

  const starsBySubmission = new Map<string, typeof allStars>();
  for (const s of allStars) {
    const existing = starsBySubmission.get(s.submissionId) || [];
    existing.push(s);
    starsBySubmission.set(s.submissionId, existing);
  }

  const ranked = submissions
    .map((sub) => ({
      submission: sub,
      starsReceived: sub.starsReceived || 0,
      voters: (starsBySubmission.get(sub.id) || []).map((s) => ({
        id: s.voter.id,
        name: s.voter.name,
      })),
    }))
    .sort((a, b) => b.starsReceived - a.starsReceived);

  let currentRank = 1;
  let previousStars = -1;
  const results = ranked.map((item, index) => {
    if (item.starsReceived !== previousStars) {
      currentRank = index + 1;
      previousStars = item.starsReceived;
    }
    return { ...item, rank: currentRank };
  });

  // Navigation
  const sortedStages = currentStage.battle.stages.sort(
    (a, b) => a.stageNumber - b.stageNumber,
  );
  const currentIndex = sortedStages.findIndex((s) => s.id === params.id);
  const prevStage = currentIndex > 0 ? sortedStages[currentIndex - 1] : null;
  const nextStage =
    currentIndex < sortedStages.length - 1
      ? sortedStages[currentIndex + 1]
      : null;

  return {
    stage: currentStage,
    battle: currentStage.battle,
    results,
    prevStage,
    nextStage,
  };
};
```

**Step 2: Create results page component**

Create `src/routes/b/[id]/s/[id]/results/+page.svelte`:

```svelte
<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import Star from "@lucide/svelte/icons/star";
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  function extractTrackId(url: string): string | null {
    const match = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  function getRankLabel(rank: number): string {
    if (rank === 1) return "1st";
    if (rank === 2) return "2nd";
    if (rank === 3) return "3rd";
    return `${rank}th`;
  }
</script>

<main class="col-content space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="font-display font-bold uppercase">
        Stage {data.stage.stageNumber} Results
      </h1>
      <p class="text-muted-foreground">{data.stage.vibe}</p>
    </div>
    <div class="flex gap-2">
      {#if data.prevStage}
        <Button
          variant="outline"
          size="sm"
          href="/b/{data.battle.id}/s/{data.prevStage.id}/results"
        >
          <ChevronLeft class="size-4" />
          Prev
        </Button>
      {/if}
      {#if data.nextStage}
        <Button
          variant="outline"
          size="sm"
          href="/b/{data.battle.id}/s/{data.nextStage.id}/results"
        >
          Next
          <ChevronRight class="size-4" />
        </Button>
      {/if}
    </div>
  </div>

  <Card.Root>
    <Card.Header>
      <Card.Title>Rankings</Card.Title>
      {#if data.stage.phase !== "closed"}
        <Card.Description
          >Voting still open — results may change</Card.Description
        >
      {/if}
    </Card.Header>
    <Card.Content class="space-y-6">
      {#each data.results as result}
        {@const trackId = result.submission.spotifyUrl
          ? extractTrackId(result.submission.spotifyUrl)
          : null}
        <div
          class="space-y-3 border-b pb-6 last:border-b-0 last:pb-0 {result.rank ===
          1
            ? '-mx-6 rounded-lg bg-gradient-to-r from-yellow-500/10 to-transparent px-6 py-4'
            : ''}"
        >
          <div class="flex items-center gap-3">
            <Badge
              variant={result.rank === 1 ? "default" : "secondary"}
              class={result.rank === 1 ? "bg-yellow-500 text-yellow-950" : ""}
            >
              {getRankLabel(result.rank)}
            </Badge>
            <span class="font-medium">{result.submission.user.name}</span>
            <span class="ml-auto flex items-center gap-1 text-sm">
              <Star
                class="size-4 {result.rank === 1
                  ? 'fill-yellow-500 text-yellow-500'
                  : 'text-muted-foreground'}"
              />
              {result.starsReceived}
            </span>
          </div>

          {#if trackId}
            <iframe
              title="Spotify embed"
              src="https://open.spotify.com/embed/track/{trackId}"
              width="100%"
              height="80"
              allow="encrypted-media"
              style="border-radius: 12px"
            ></iframe>
          {:else}
            <p class="text-sm text-muted-foreground">
              {result.submission.spotifyUrl}
            </p>
          {/if}

          {#if result.submission.note}
            <p class="text-sm text-muted-foreground italic">
              "{result.submission.note}"
            </p>
          {/if}

          {#if result.voters.length > 0}
            <div class="space-y-1 border-l-2 border-muted pl-4">
              {#each result.voters as voter}
                <p class="text-xs text-muted-foreground">{voter.name}</p>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </Card.Content>
  </Card.Root>

  <div class="flex gap-2">
    <Button variant="outline" href="/b/{data.battle.id}/s/{data.stage.id}">
      Back to Stage
    </Button>
    <Button variant="outline" href="/b/{data.battle.id}">
      Battle Overview
    </Button>
  </div>
</main>
```

**Step 3: Run type check**

Run: `bun run check`
Expected: No errors

**Step 4: Commit**

```bash
git add src/routes/b/[id]/s/[id]/results
git commit -m "feat: add results page with rankings and voter breakdown"
```

---

## Task 7: Add tally logic to stage_closed transition (ticket a-a3d5)

**Files:**

- Modify: `src/routes/api/qstash/stage-transition/+server.ts`

**Step 1: Add tally helper function**

Add before the POST handler:

```typescript
import {
  battle,
  stage,
  submission,
  star,
  player,
  userStats,
} from "$lib/server/db/schema";
import { sql, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

async function tallyStageResults(stageId: string, battleId: string) {
  // Get all submissions with their star counts
  const submissions = await db.query.submission.findMany({
    where: eq(submission.stageId, stageId),
  });

  if (submissions.length === 0) return;

  // Rank submissions
  const ranked = submissions
    .map((s) => ({ ...s, stars: s.starsReceived || 0 }))
    .sort((a, b) => b.stars - a.stars);

  // Find winner(s) - submissions with rank 1
  const topStars = ranked[0]?.stars || 0;
  const winners = ranked.filter((s) => s.stars === topStars && topStars > 0);

  // Get all players in the battle
  const players = await db.query.player.findMany({
    where: eq(player.battleId, battleId),
  });

  // Update player stats
  for (const p of players) {
    // Calculate total stars earned by this player in the battle
    const playerSubmissions = await db.query.submission.findMany({
      where: and(
        eq(submission.userId, p.userId),
        sql`${submission.stageId} IN (SELECT id FROM stage WHERE battle_id = ${battleId})`,
      ),
    });

    const totalStars = playerSubmissions.reduce(
      (sum, s) => sum + (s.starsReceived || 0),
      0,
    );

    // Check if player won this stage
    const wonThisStage = winners.some((w) => w.userId === p.userId);

    // Update player record
    await db
      .update(player)
      .set({
        totalStarsEarned: totalStars,
        stagesWon: wonThisStage
          ? sql`COALESCE(${player.stagesWon}, 0) + 1`
          : player.stagesWon,
      })
      .where(eq(player.id, p.id));

    // Update or create userStats
    const starsFromThisStage = playerSubmissions
      .filter((s) => s.stageId === stageId)
      .reduce((sum, s) => sum + (s.starsReceived || 0), 0);

    await db
      .insert(userStats)
      .values({
        id: nanoid(8),
        userId: p.userId,
        lifetimeStarsEarned: starsFromThisStage,
        lifetimeStagesWon: wonThisStage ? 1 : 0,
        battlesCompleted: 0,
      })
      .onConflictDoUpdate({
        target: userStats.userId,
        set: {
          lifetimeStarsEarned: sql`${userStats.lifetimeStarsEarned} + ${starsFromThisStage}`,
          lifetimeStagesWon: wonThisStage
            ? sql`${userStats.lifetimeStagesWon} + 1`
            : userStats.lifetimeStagesWon,
          updatedAt: new Date(),
        },
      });
  }
}
```

**Step 2: Call tally in stage_closed handler**

Update the `stage_closed` case:

```typescript
case "stage_closed": {
  // Idempotency: skip if already closed
  if (currentStage.phase === "closed") {
    console.log(
      `Stage transition: Stage ${payload.stageNumber} already closed`,
    );
    return new Response("OK", { status: 200 });
  }

  // Tally results before closing
  await tallyStageResults(payload.stageId, payload.battleId);

  await db
    .update(stage)
    .set({ phase: "closed" })
    .where(eq(stage.id, payload.stageId));

  // Find next stage
  const nextStage = currentBattle.stages.find(
    (s) => s.stageNumber === payload.stageNumber + 1,
  );
  if (nextStage) {
    // Advance to next stage
    await db
      .update(battle)
      .set({ currentStageId: nextStage.id })
      .where(eq(battle.id, payload.battleId));
    await db
      .update(stage)
      .set({ phase: "submission" })
      .where(eq(stage.id, nextStage.id));
  }
  console.log(
    `Stage ${payload.stageNumber} closed for battle ${payload.battleId}`,
  );
  break;
}
```

**Step 3: Run type check**

Run: `bun run check`
Expected: No errors

**Step 4: Commit**

```bash
git add src/routes/api/qstash/stage-transition/+server.ts
git commit -m "feat: add tally logic to stage_closed transition"
```

---

## Task 8: Add battle standings to overview page (ticket a-2803)

**Files:**

- Modify: `src/routes/b/[id]/+page.server.ts`
- Modify: `src/routes/b/[id]/+page.svelte`

**Step 1: Add standings to loader**

Update `src/routes/b/[id]/+page.server.ts`:

```typescript
import { error } from "@sveltejs/kit";
import { eq, desc } from "drizzle-orm";

import { db } from "$lib/server/db";
import { battle, player, stage } from "$lib/server/db/schema";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
  const result = await db.query.battle.findFirst({
    where: eq(battle.id, params.id),
    with: { stages: true },
  });

  if (!result) error(404, "Battle not found");

  const sortedStages = result.stages.sort(
    (a, b) => a.stageNumber - b.stageNumber,
  );

  // Check if any stages are closed (results available)
  const hasClosedStages = sortedStages.some((s) => s.phase === "closed");

  // Get standings if stages have closed
  let standings: Array<{
    rank: number;
    user: { id: string; name: string | null; image: string | null };
    totalStarsEarned: number;
    stagesWon: number;
  }> = [];

  if (hasClosedStages) {
    const players = await db.query.player.findMany({
      where: eq(player.battleId, params.id),
      with: { user: true },
      orderBy: [desc(player.totalStarsEarned), desc(player.stagesWon)],
    });

    let currentRank = 1;
    let previousStars = -1;
    let previousWins = -1;

    standings = players.map((p, index) => {
      const stars = p.totalStarsEarned || 0;
      const wins = p.stagesWon || 0;

      if (stars !== previousStars || wins !== previousWins) {
        currentRank = index + 1;
        previousStars = stars;
        previousWins = wins;
      }

      return {
        rank: currentRank,
        user: {
          id: p.user.id,
          name: p.user.name,
          image: p.user.image,
        },
        totalStarsEarned: stars,
        stagesWon: wins,
      };
    });
  }

  return {
    battle: result,
    stages: sortedStages,
    user: locals.user,
    standings,
    hasClosedStages,
  };
};
```

**Step 2: Add standings UI**

Update `src/routes/b/[id]/+page.svelte`:

```svelte
<script lang="ts">
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import Star from "@lucide/svelte/icons/star";
  import Trophy from "@lucide/svelte/icons/trophy";
  import * as Item from "$lib/components/ui/item";
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  function getRankLabel(rank: number): string {
    if (rank === 1) return "1st";
    if (rank === 2) return "2nd";
    if (rank === 3) return "3rd";
    return `${rank}th`;
  }
</script>

<main class="col-content space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="font-display font-bold uppercase">{data.battle.name}</h1>
      <Badge variant="secondary">{data.battle.visibility}</Badge>
      <Badge variant="secondary">Players: {data.battle.maxPlayers}</Badge>
      <Badge variant="secondary">{data.battle.status}</Badge>
    </div>
    {#if data.battle.creatorId === data.user?.id && data.battle.status !== "cancelled"}
      <Button href="/b/{data.battle.id}/edit">Edit</Button>
    {/if}
  </div>

  {#if data.hasClosedStages && data.standings.length > 0}
    <Card.Root>
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Trophy class="size-5" />
          Battle Standings
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="space-y-2">
          {#each data.standings as standing}
            <div
              class="flex items-center gap-3 rounded-lg p-2 {standing.rank === 1
                ? 'bg-yellow-500/10'
                : ''}"
            >
              <Badge
                variant={standing.rank === 1 ? "default" : "secondary"}
                class={standing.rank === 1
                  ? "bg-yellow-500 text-yellow-950"
                  : ""}
              >
                {getRankLabel(standing.rank)}
              </Badge>
              <span class="flex-1 font-medium">{standing.user.name}</span>
              <span
                class="flex items-center gap-1 text-sm text-muted-foreground"
              >
                <Star class="size-4" />
                {standing.totalStarsEarned}
              </span>
              {#if standing.stagesWon > 0}
                <span class="text-xs text-muted-foreground">
                  ({standing.stagesWon} stage{standing.stagesWon !== 1
                    ? "s"
                    : ""} won)
                </span>
              {/if}
            </div>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  {#if data.stages.length > 0}
    <Card.Root>
      <Card.Header>
        <Card.Title>Stages</Card.Title>
      </Card.Header>
      <Card.Content>
        <ul class="space-y-2">
          {#each data.stages as stage}
            <Item.Root>
              {#snippet child({ props })}
                <a href="/b/{data.battle.id}/s/{stage.id}" {...props}>
                  <Item.Media
                    class="size-10 rounded-md bg-muted font-display text-sm font-bold"
                  >
                    {stage.stageNumber}
                  </Item.Media>
                  <Item.Content>
                    <Item.Title>
                      {stage.vibe}
                    </Item.Title>
                    <Item.Description>
                      {stage.phase}
                    </Item.Description>
                  </Item.Content>
                  <Item.Actions>
                    <ChevronRight class="size-4" />
                  </Item.Actions>
                </a>
              {/snippet}
            </Item.Root>
          {/each}
        </ul>
      </Card.Content>
    </Card.Root>
  {/if}
</main>
```

**Step 3: Run type check**

Run: `bun run check`
Expected: No errors

**Step 4: Commit**

```bash
git add src/routes/b/[id]/+page.server.ts src/routes/b/[id]/+page.svelte
git commit -m "feat: add battle standings to overview page"
```

---

## Task 9: Update battle_completed transition for userStats (ticket a-db6b)

**Files:**

- Modify: `src/routes/api/qstash/stage-transition/+server.ts`

**Step 1: Add battlesCompleted increment**

Update the `battle_completed` case:

```typescript
case "battle_completed": {
  // Idempotency handled by guard: non-active battles (including completed) already returned

  // Increment battlesCompleted for all players
  const players = await db.query.player.findMany({
    where: eq(player.battleId, payload.battleId),
  });

  for (const p of players) {
    await db
      .insert(userStats)
      .values({
        id: nanoid(8),
        userId: p.userId,
        lifetimeStarsEarned: 0,
        lifetimeStagesWon: 0,
        battlesCompleted: 1,
      })
      .onConflictDoUpdate({
        target: userStats.userId,
        set: {
          battlesCompleted: sql`${userStats.battlesCompleted} + 1`,
          updatedAt: new Date(),
        },
      });
  }

  await db
    .update(battle)
    .set({ status: "completed" })
    .where(eq(battle.id, payload.battleId));
  console.log(`Battle ${payload.battleId} completed`);
  break;
}
```

**Step 2: Run type check**

Run: `bun run check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/routes/api/qstash/stage-transition/+server.ts
git commit -m "feat: increment battlesCompleted in userStats on battle completion"
```

---

## Final: Run all tests and verify

**Step 1: Run type check**

Run: `bun run check`
Expected: No errors

**Step 2: Run tests**

Run: `bun run test`
Expected: All tests pass

**Step 3: Final commit if any changes**

If formatting or minor fixes needed:

```bash
bun run format
git add -A
git commit -m "chore: format and cleanup"
```
