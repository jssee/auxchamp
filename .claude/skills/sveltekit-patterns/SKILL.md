---
name: sveltekit-patterns
description: Project-specific SvelteKit patterns for forms, routes, and components. Use when creating pages, forms, or handling data. Covers remote functions, Valibot validation, Field components, and Svelte 5 runes.
---

# SvelteKit Patterns

This project uses SvelteKit's experimental remote functions. **DO NOT use traditional +page.server.ts form actions.**

## Remote Functions

Import from `$app/server`, define in `*.remote.ts` files alongside routes.

### Form Handler Pattern

```ts
// feature.remote.ts
import { getRequestEvent, form } from "$app/server";
import * as v from "valibot";
import { db } from "$lib/server/db";

export const createThing = form(
  v.object({
    name: v.pipe(v.string(), v.minLength(1, "Name required")),
    description: v.optional(v.string()),
  }),
  async (data, invalid) => {
    const { locals } = getRequestEvent();

    if (!locals.user) {
      return invalid("Not authenticated");
    }

    try {
      await db.insert(thing).values({
        id: nanoid(8),
        name: data.name,
        creatorId: locals.user.id,
      });
    } catch (err) {
      return invalid(err.message);
    }
  },
);
```

### Form Without Schema (Delete/Simple Actions)

```ts
export const deleteThing = form(async (invalid) => {
  const { locals } = getRequestEvent();

  try {
    await db.delete(thing).where(eq(thing.userId, locals.user.id));
  } catch (err) {
    invalid(err.message);
  }
});
```

### Optional String Helper

For fields that should be `undefined` when empty:

```ts
const optionalString = (schema: v.GenericSchema<string>) =>
  v.pipe(
    v.string(),
    v.transform((s) => (s.trim() === "" ? undefined : s)),
    v.optional(schema),
  );

// Usage
v.object({
  name: optionalString(v.pipe(v.string(), v.minLength(3))),
});
```

## Form Components

Use Field components from `$lib/components/ui/field`:

```svelte
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import * as Field from "$lib/components/ui/field";
  import { createThing } from "./feature.remote";

  let { initialData }: { initialData: SomeType } = $props();
  let id = $props.id(); // Unique ID for form field associations
</script>

<form {...createThing}>
  <Field.Set>
    <Field.Legend>Create Thing</Field.Legend>
    <Field.Description>Add a new thing to your collection.</Field.Description>
    <Field.Separator />

    <Field.Group>
      <Field.Field orientation="responsive">
        <Field.Content>
          <Field.Label for="name-{id}">Name</Field.Label>
          <Field.Description>What should we call it?</Field.Description>
          {#each createThing.fields.name.issues() as issue}
            <Field.Error>{issue.message}</Field.Error>
          {/each}
        </Field.Content>
        <Input
          id="name-{id}"
          placeholder="Enter name"
          {...createThing.fields.name.as("text")}
        />
      </Field.Field>

      <Field.Separator />

      <Field.Field orientation="responsive" class="justify-end">
        <Button type="reset" variant="outline">Reset</Button>
        <Button type="submit">Create</Button>
      </Field.Field>
    </Field.Group>
  </Field.Set>
</form>
```

### Key Form Bindings

| Pattern                                   | Purpose                        |
| ----------------------------------------- | ------------------------------ |
| `<form {...formHandler}>`                 | Bind form to remote function   |
| `{...formHandler.fields.name.as("text")}` | Bind input to field            |
| `formHandler.fields.name.issues()`        | Get validation errors          |
| `let id = $props.id()`                    | Generate unique IDs for labels |

### Field Component Hierarchy

```
Field.Set           // <fieldset> wrapper
  Field.Legend      // Section title
  Field.Description // Section description
  Field.Separator   // Visual divider
  Field.Group       // Groups fields together
    Field.Field     // Individual field wrapper (orientation="responsive"|"horizontal"|"vertical")
      Field.Content // Label + description + errors container
        Field.Label
        Field.Description
        Field.Error
      Input/Select/etc
```

## Svelte 5 Runes

Always use runes syntax:

```svelte
<script lang="ts">
  import type { PageProps } from "./$types";

  // Props
  let { data }: PageProps = $props();

  // Typed props
  let { user, items }: { user: User; items: Item[] } = $props();

  // Local state
  let count = $state(0);
  let selected = $state<string | null>(null);

  // Derived values
  let doubled = $derived(count * 2);
  let filtered = $derived(items.filter((i) => i.active));
</script>
```

## Async Boundaries

For loading states with async data:

```svelte
<svelte:boundary>
  {#snippet pending()}
    <LoadingSpinner />
  {/snippet}

  {#snippet failed(error, reset)}
    <p>Error: {error.message}</p>
    <button onclick={reset}>Retry</button>
  {/snippet}

  <AsyncContent data={await fetchData()} />
</svelte:boundary>
```

## Route Organization

```
src/routes/
├── (auth)/           # Auth pages (signin, signup)
│   └── [authtype=authtype]/
├── (profile)/        # User profile pages
│   └── me/
│       ├── +page.svelte
│       ├── +page.server.ts    # Load function ONLY
│       ├── me.remote.ts       # Form handlers
│       └── components/        # Page-specific components
├── (public)/         # Public pages
└── api/              # API endpoints
```

## Load Functions

Use `+page.server.ts` for load functions only (not form actions):

```ts
// +page.server.ts
import type { PageServerLoad } from "./$types";
import { redirect, error } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ locals, params, url }) => {
  // Auth check
  if (!locals.session) {
    redirect(307, `/signin?redirectTo=${encodeURIComponent(url.pathname)}`);
  }

  // Fetch data
  const item = await db.query.thing.findFirst({
    where: eq(thing.id, params.id),
    with: { creator: true },
  });

  if (!item) error(404, "Not found");

  return { item, user: locals.user };
};
```

## Anti-Patterns

| Don't                          | Do                                       |
| ------------------------------ | ---------------------------------------- |
| `+page.server.ts` form actions | `*.remote.ts` with `form()`              |
| Zod validation                 | Valibot (`import * as v from "valibot"`) |
| `use:enhance`                  | Spread form handler `{...formHandler}`   |
| `export let data`              | `let { data } = $props()`                |
| Generic `<input>`              | Field components + Input from ui lib     |
| Manual form state              | `formHandler.fields.x.as()` bindings     |
