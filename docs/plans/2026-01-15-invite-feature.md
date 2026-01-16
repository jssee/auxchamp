# Invite Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow battle creators to share invite links so others can join their battles.

**Architecture:** Single invite code per battle (stored in existing `inviteCode` field). Invite page handles auth states and redirects. Creator auto-added as player on battle creation.

**Tech Stack:** SvelteKit, Drizzle ORM, Valibot, remote functions

---

### Task 1: Add creator as player on battle creation

**Files:**

- Modify: `src/lib/remote/battle.remote.ts:168-178`

**Step 1: Update createBattle to generate inviteCode and add creator as player**

In `createBattle`, after the battle insert (line 170-178), add inviteCode generation and player insert:

```typescript
// Insert battle
await db.insert(battle).values({
  id: battleId,
  ...battleData,
  authoritativeTimezone,
  stagesCount: parsedStages.length,
  currentStageId: stageIds[0],
  creatorId: locals.user.id,
  status: "active",
  inviteCode: nanoid(12),
});

// Add creator as first player
await db.insert(player).values({
  id: nanoid(8),
  battleId,
  userId: locals.user.id,
  joinedAt: Date.now(),
});
```

**Step 2: Run type check**

Run: `bun run check`
Expected: No errors

**Step 3: Manual test**

- Create a new battle
- Check database: battle should have inviteCode, player table should have creator

**Step 4: Commit**

```bash
git add src/lib/remote/battle.remote.ts
git commit -m "Add creator as player and generate inviteCode on battle creation"
```

---

### Task 2: Create joinBattle remote function

**Files:**

- Modify: `src/lib/remote/battle.remote.ts` (add at end)
- Create: `src/lib/remote/invite.remote.ts`

**Step 1: Create invite remote module with joinBattle**

Create `src/lib/remote/invite.remote.ts`:

```typescript
import { error, redirect } from "@sveltejs/kit";
import { eq, and, count } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as v from "valibot";

import { form, getRequestEvent } from "$app/server";
import { db } from "$lib/server/db";
import { battle, player } from "$lib/server/db/schema";

const joinBattleSchema = v.object({
  battleId: v.string(),
});

export const joinBattle = form(joinBattleSchema, async (data, invalid) => {
  const { locals } = getRequestEvent();
  if (!locals.user) error(401, "Not authenticated");

  const existing = await db.query.battle.findFirst({
    where: eq(battle.id, data.battleId),
  });

  if (!existing) {
    invalid("Battle not found");
    return;
  }

  if (existing.status !== "draft" && existing.status !== "active") {
    invalid("This battle is no longer accepting players");
    return;
  }

  // Check if already a player
  const existingPlayer = await db.query.player.findFirst({
    where: and(
      eq(player.battleId, data.battleId),
      eq(player.userId, locals.user.id),
    ),
  });

  if (existingPlayer) {
    redirect(302, `/b/${data.battleId}`);
  }

  // Check player count
  const [{ value: playerCount }] = await db
    .select({ value: count() })
    .from(player)
    .where(eq(player.battleId, data.battleId));

  if (playerCount >= existing.maxPlayers) {
    invalid("This battle is full");
    return;
  }

  // Add player
  await db.insert(player).values({
    id: nanoid(8),
    battleId: data.battleId,
    userId: locals.user.id,
    joinedAt: Date.now(),
  });

  redirect(302, `/b/${data.battleId}`);
});
```

**Step 2: Run type check**

Run: `bun run check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/remote/invite.remote.ts
git commit -m "Add joinBattle remote function with validation"
```

---

### Task 3: Create invite page server load

**Files:**

- Modify: `src/routes/invite/[code]/+page.server.ts`

**Step 1: Implement load function**

```typescript
import { redirect } from "@sveltejs/kit";
import { eq, and, count } from "drizzle-orm";

import { db } from "$lib/server/db";
import { battle, player } from "$lib/server/db/schema";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
  const result = await db.query.battle.findFirst({
    where: eq(battle.inviteCode, params.code),
  });

  if (!result) {
    return { error: "invalid" as const };
  }

  if (result.status !== "draft" && result.status !== "active") {
    return { error: "closed" as const };
  }

  // Get player count
  const [{ value: playerCount }] = await db
    .select({ value: count() })
    .from(player)
    .where(eq(player.battleId, result.id));

  const isFull = playerCount >= result.maxPlayers;

  // Not logged in
  if (!locals.user) {
    return {
      battle: { id: result.id, name: result.name },
      isPlayer: false,
      isFull,
    };
  }

  // Check if already a player
  const existingPlayer = await db.query.player.findFirst({
    where: and(
      eq(player.battleId, result.id),
      eq(player.userId, locals.user.id),
    ),
  });

  if (existingPlayer) {
    redirect(302, `/b/${result.id}`);
  }

  return {
    battle: { id: result.id, name: result.name },
    isPlayer: false,
    isFull,
    user: locals.user,
  };
};
```

**Step 2: Run type check**

Run: `bun run check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/routes/invite/\\[code\\]/+page.server.ts
git commit -m "Add invite page server load with state detection"
```

---

### Task 4: Create invite page UI

**Files:**

- Modify: `src/routes/invite/[code]/+page.svelte`

**Step 1: Implement page component**

```svelte
<script lang="ts">
  import { page } from "$app/state";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { joinBattle } from "$lib/remote/invite.remote";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  const redirectTo = $derived(`/invite/${page.params.code}`);
</script>

<main class="col-content grid h-full place-items-center">
  <Card.Root class="w-full max-w-md">
    {#if "error" in data}
      <Card.Header>
        <Card.Title class="text-xl">
          {#if data.error === "invalid"}
            Invalid Invite
          {:else}
            Battle Closed
          {/if}
        </Card.Title>
      </Card.Header>
      <Card.Content>
        {#if data.error === "invalid"}
          <p class="text-muted-foreground">
            This invite link is invalid or has expired.
          </p>
        {:else}
          <p class="text-muted-foreground">
            This battle is no longer accepting new players.
          </p>
        {/if}
      </Card.Content>
      <Card.Footer>
        <Button href="/" variant="outline">Go Home</Button>
      </Card.Footer>
    {:else if data.isFull}
      <Card.Header>
        <Card.Title class="text-xl">Battle Full</Card.Title>
      </Card.Header>
      <Card.Content>
        <p class="text-muted-foreground">
          <strong>{data.battle.name}</strong> has reached its player limit.
        </p>
      </Card.Content>
      <Card.Footer>
        <Button href="/" variant="outline">Go Home</Button>
      </Card.Footer>
    {:else if !data.user}
      <Card.Header>
        <Card.Title class="text-xl">Join Battle</Card.Title>
      </Card.Header>
      <Card.Content>
        <p class="text-muted-foreground">
          You've been invited to join <strong>{data.battle.name}</strong>.
        </p>
        <p class="mt-2 text-muted-foreground">
          Sign in or create an account to join.
        </p>
      </Card.Content>
      <Card.Footer class="flex gap-2">
        <Button href="/signin?redirectTo={encodeURIComponent(redirectTo)}">
          Sign In
        </Button>
        <Button
          href="/signup?redirectTo={encodeURIComponent(redirectTo)}"
          variant="outline"
        >
          Sign Up
        </Button>
      </Card.Footer>
    {:else}
      <Card.Header>
        <Card.Title class="text-xl">Join Battle</Card.Title>
      </Card.Header>
      <Card.Content>
        <p class="text-muted-foreground">
          You've been invited to join <strong>{data.battle.name}</strong>.
        </p>
      </Card.Content>
      <Card.Footer>
        <form {...joinBattle}>
          <input type="hidden" name="battleId" value={data.battle.id} />
          <Button type="submit">Join Battle</Button>
        </form>
      </Card.Footer>
    {/if}
  </Card.Root>
</main>
```

**Step 2: Run type check**

Run: `bun run check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/routes/invite/\\[code\\]/+page.svelte
git commit -m "Add invite page UI with auth state handling"
```

---

### Task 5: Preserve redirectTo in auth page links

**Files:**

- Modify: `src/routes/(auth)/[authtype=authtype]/+page.svelte:29,36`

**Step 1: Update switchAuthType snippet to preserve redirectTo**

Add redirect handling to the auth page. Change the snippet to include redirectTo:

```svelte
<script lang="ts">
  import { page } from "$app/state";
  import * as Card from "$lib/components/ui/card";
  import SigninForm from "$lib/components/auth/signin-form.svelte";
  import SignupForm from "$lib/components/auth/signup-form.svelte";

  const isSignUp = $derived(page.params.authtype === "signup");
  const redirectTo = $derived(page.url.searchParams.get("redirectTo"));
</script>

<main class="col-content grid h-full place-items-center">
  <Card.Root class="w-full max-w-md">
    <Card.Header>
      <Card.Title class="text-xl">{isSignUp ? "Sign up" : "Sign in"}</Card.Title
      >
    </Card.Header>

    <Card.Content>
      {#if isSignUp}
        <SignupForm />
      {:else}
        <SigninForm />
      {/if}
    </Card.Content>

    <Card.Footer>
      {#if isSignUp}
        {@render switchAuthType({
          question: "Already have an account? ",
          href: redirectTo
            ? `/signin?redirectTo=${encodeURIComponent(redirectTo)}`
            : "/signin",
          cta: "Sign in",
          postscript: " instead.",
        })}
      {:else}
        {@render switchAuthType({
          question: "Don't have an account? ",
          href: redirectTo
            ? `/signup?redirectTo=${encodeURIComponent(redirectTo)}`
            : "/signup",
          cta: "Sign up",
          postscript: " for free.",
        })}
      {/if}
    </Card.Footer>
  </Card.Root>
</main>

{#snippet switchAuthType({
  question,
  href,
  cta,
  postscript,
}: {
  question: string;
  href: string;
  cta: string;
  postscript: string;
})}
  <p class="mt-4 text-center text-sm text-gray-600 dark:text-zinc-400">
    {question}
    <a
      {href}
      class="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
    >
      {cta}
    </a>
    {postscript}
  </p>
{/snippet}
```

**Step 2: Run type check**

Run: `bun run check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/routes/\\(auth\\)/\\[authtype=authtype\\]/+page.svelte
git commit -m "Preserve redirectTo param when switching between signin/signup"
```

---

### Task 6: Add invite link display to battle edit page

**Files:**

- Modify: `src/routes/b/[id]/edit/+page.svelte`

**Step 1: Read current edit page**

Need to understand current structure before adding invite link section.

**Step 2: Add invite link section**

Add a section showing the invite link with copy functionality. Location: after the battle details form.

```svelte
{#if data.battle.inviteCode}
  <Card.Root>
    <Card.Header>
      <Card.Title>Invite Link</Card.Title>
    </Card.Header>
    <Card.Content>
      <div class="flex gap-2">
        <Input
          readonly
          value="{window.location.origin}/invite/{data.battle.inviteCode}"
          class="font-mono text-sm"
        />
        <Button
          variant="outline"
          onclick={() => {
            navigator.clipboard.writeText(
              `${window.location.origin}/invite/${data.battle.inviteCode}`,
            );
          }}
        >
          Copy
        </Button>
      </div>
    </Card.Content>
  </Card.Root>
{/if}
```

**Step 3: Run type check**

Run: `bun run check`
Expected: No errors

**Step 4: Commit**

```bash
git add src/routes/b/\\[id\\]/edit/+page.svelte
git commit -m "Display invite link on battle edit page"
```

---

### Task 7: End-to-end manual test

**No files changed - verification only**

**Step 1: Test full flow**

1. Create a new battle → verify inviteCode generated, creator in players table
2. Copy invite link from edit page
3. Open in incognito → see "Sign in to join" UI
4. Click Sign Up → create account → redirected back to invite page
5. Click Join Battle → redirected to battle page
6. Try visiting invite link again while logged in → redirect to battle page (already a player)
7. Create another user, join until maxPlayers → verify "battle full" message

**Step 2: Commit any fixes if needed**

---

## Summary

| Task | Description                                                      |
| ---- | ---------------------------------------------------------------- |
| 1    | Generate inviteCode and add creator as player on battle creation |
| 2    | Create joinBattle remote function with validation                |
| 3    | Create invite page server load with state detection              |
| 4    | Create invite page UI with auth/join handling                    |
| 5    | Preserve redirectTo in auth page signin/signup links             |
| 6    | Display invite link on battle edit page                          |
| 7    | End-to-end verification                                          |
