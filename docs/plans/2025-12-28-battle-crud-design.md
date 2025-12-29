# Battle CRUD Design — Phase 1

## Overview

Phase 1 implements core CRUD operations for battles. Users can create, view, edit, and cancel battles. This establishes the foundation for the battles feature.

## Decisions

| Decision         | Choice                                          | Rationale                                            |
| ---------------- | ----------------------------------------------- | ---------------------------------------------------- |
| Battle ID format | 8-char nanoid                                   | Short URLs like `/b/x7Kp9mNq`, 2.8T combinations     |
| Creation flow    | Draft first                                     | Battle starts in draft, creator activates when ready |
| Editable fields  | name, visibility, maxPlayers, doubleSubmissions | Core settings; inviteCode deferred to invite phase   |
| Auth failures    | 403 via `error()`                               | Clear separation from validation errors              |
| Delete behavior  | Status-based ("cancelled")                      | Preserves data, avoids cascade complexity            |
| View access      | Unlisted model                                  | Private hides from discovery, URL grants access      |
| Home page        | Created + joined battles                        | Combined list, segmentation deferred                 |
| Validation       | Schema file refinements                         | Single source of truth via drizzle-valibot           |
| Async loading    | `<svelte:boundary>`                             | Proper loading/error states for query functions      |

## Schema Changes

```typescript
// src/lib/server/db/schema/public.ts
export const battle = pgTable("battle", {
  id: text("id").primaryKey(), // 8-char nanoid
  name: text().notNull(),
  creatorId: text().notNull(),
  status: text({ enum: ["draft", "active", "completed", "cancelled"] }).default(
    "draft",
  ),
  visibility: text({ enum: ["public", "private"] }).default("private"),
  maxPlayers: integer().default(8),
  doubleSubmissions: boolean().default(false),
  inviteCode: text(), // unused in Phase 1
  currentStageId: text(), // unused in Phase 1
  createdAt: timestamp().defaultNow().notNull(),
});

// Refinements for validation
export const battleInsertSchema = createInsertSchema(battle, {
  name: (schema) => v.pipe(schema, v.minLength(1, "Name is required")),
  maxPlayers: (schema) => v.pipe(schema, v.minValue(2), v.maxValue(32)),
});
```

## Remote Functions

**File:** `src/lib/remote/battle.remote.ts`

```typescript
import { error, redirect } from "@sveltejs/kit";
import { eq, or, exists } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as v from "valibot";

import { form, query, getRequestEvent } from "$app/server";
import { db } from "$lib/server/db";
import { battle, player, battleInsertSchema } from "$lib/server/db/schema";

const battleFormSchema = v.pick(battleInsertSchema, [
  "name",
  "visibility",
  "maxPlayers",
  "doubleSubmissions",
]);

// GET: User's battles (created + joined)
export const getBattles = query(async () => {
  const { locals } = getRequestEvent();
  if (!locals.user) error(401, "Not authenticated");

  return db.query.battle.findMany({
    where: or(
      eq(battle.creatorId, locals.user.id),
      exists(
        db
          .select()
          .from(player)
          .where(
            and(
              eq(player.battleId, battle.id),
              eq(player.userId, locals.user.id),
            ),
          ),
      ),
    ),
  });
});

// GET: Single battle by ID
export const getBattle = query(async (id: string) => {
  const result = await db.query.battle.findFirst({
    where: eq(battle.id, id),
  });
  if (!result) error(404, "Battle not found");
  return result;
});

// POST: Create battle
export const createBattle = form(battleFormSchema, async (data, invalid) => {
  const { locals } = getRequestEvent();
  if (!locals.user) error(401, "Not authenticated");

  const id = nanoid(8);
  await db.insert(battle).values({
    id,
    ...data,
    creatorId: locals.user.id,
    status: "draft",
  });

  redirect(302, `/b/${id}`);
});

// POST: Update battle
export const updateBattle = form(battleFormSchema, async (data, invalid) => {
  const { locals, url } = getRequestEvent();
  if (!locals.user) error(401, "Not authenticated");

  const id = url.searchParams.get("id");
  const existing = await db.query.battle.findFirst({
    where: eq(battle.id, id),
  });

  if (!existing) error(404, "Battle not found");
  if (existing.creatorId !== locals.user.id) error(403, "Not authorized");

  await db.update(battle).set(data).where(eq(battle.id, id));
  redirect(302, `/b/${id}`);
});

// POST: Cancel battle
export const deleteBattle = form(async (_, invalid) => {
  const { locals, url } = getRequestEvent();
  if (!locals.user) error(401, "Not authenticated");

  const id = url.searchParams.get("id");
  const existing = await db.query.battle.findFirst({
    where: eq(battle.id, id),
  });

  if (!existing) error(404, "Battle not found");
  if (existing.creatorId !== locals.user.id) error(403, "Not authorized");

  await db.update(battle).set({ status: "cancelled" }).where(eq(battle.id, id));
  redirect(302, "/home");
});
```

## Routes

```
src/routes/
├── home/
│   ├── +page.server.ts   # Load user's battles via getBattles()
│   └── +page.svelte      # List with Empty state, "New Battle" button
├── b/
│   ├── new/
│   │   ├── +page.svelte  # Create page
│   │   └── form.svelte   # Create form component
│   └── [id]/
│       ├── +page.server.ts   # Load battle via getBattle(id)
│       ├── +page.svelte      # Info card, edit button for owner
│       └── edit/
│           ├── +page.server.ts  # Load + ownership check
│           ├── +page.svelte     # Edit page
│           └── form.svelte      # Edit form + delete button
```

## UI Components

### Battle Form (create/edit)

Uses Field components from `$lib/components/ui/field`:

- `Field.Set`, `Field.Legend`, `Field.Field`, `Field.Label`, `Field.Error`
- Inputs: text (name), select (visibility), number (maxPlayers), checkbox (doubleSubmissions)
- Remote function spread: `<form {...createBattle}>`
- Field binding: `{...createBattle.fields.name.as("text")}`
- Errors: `{#each createBattle.fields.name.issues() as issue}`

### Battle Detail Page

Card component showing:

- Name (title)
- Visibility + status (description)
- Max players, double submissions, created date (content)
- Edit button in footer (owner only)

### Home Page

- Header with "My Battles" title + "New Battle" button
- Empty state using `Empty.*` components when no battles
- Card list linking to `/b/[id]` when battles exist

### Async Loading Pattern

All pages using query functions wrap content in `<svelte:boundary>` with `pending` and `failed` snippets:

```svelte
<script lang="ts">
  import { getBattles } from "$lib/remote/battle.remote";
  import * as Empty from "$lib/components/ui/empty";
</script>

<svelte:boundary>
  {@const battles = await getBattles()}

  {#if battles.length === 0}
    <Empty.Root>...</Empty.Root>
  {:else}
    <!-- battle list -->
  {/if}

  {#snippet pending()}
    <div class="animate-pulse">Loading...</div>
  {/snippet}

  {#snippet failed(error, reset)}
    <Empty.Root>
      <Empty.Content>
        <Empty.Title>Something went wrong</Empty.Title>
        <Empty.Description>{error.message}</Empty.Description>
        <Button onclick={reset}>Try again</Button>
      </Empty.Content>
    </Empty.Root>
  {/snippet}
</svelte:boundary>
```

This pattern applies to:

- `/home` — `getBattles()`
- `/b/[id]` — `getBattle(id)`
- `/b/[id]/edit` — `getBattle(id)`

## Out of Scope

Deferred to future phases:

- Player join flow
- Invite codes generation/validation
- Stages, submissions, voting
- Public discovery/explore page
- Battle activation (draft → active)

## Unresolved Questions

None.
