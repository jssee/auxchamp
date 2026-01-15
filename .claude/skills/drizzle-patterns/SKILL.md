---
name: drizzle-patterns
description: Project-specific Drizzle ORM patterns for schema, queries, and mutations. Use when adding tables, writing queries, or modifying database logic. Covers Neon serverless, drizzle-valibot, and relation patterns.
---

# Drizzle ORM Patterns

## Schema Location

All schemas live in `src/lib/server/db/schema/`:

| File | Purpose |
|------|---------|
| `auth.ts` | better-auth tables (don't modify) |
| `public.ts` | Application domain tables |
| `index.ts` | Re-exports all schemas |

**After adding a table, update the re-export in `index.ts`.**

## Table Definition Pattern

```ts
// src/lib/server/db/schema/public.ts
import { pgTable, text, integer, timestamp, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";
import * as v from "valibot";
import { user } from "./auth";  // Reference auth tables

// 1. Table definition
export const comment = pgTable("comment", {
  id: text("id").primaryKey(),  // nanoid(8) generated in app
  battleId: text("battle_id").notNull(),
  userId: text("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// 2. Relations (ORM-only, no SQL foreign keys)
export const commentRelations = relations(comment, ({ one }) => ({
  battle: one(battle, {
    fields: [comment.battleId],
    references: [battle.id],
  }),
  user: one(user, {
    fields: [comment.userId],
    references: [user.id],
  }),
}));

// 3. Valibot schemas (automatically derived)
export const commentSelectSchema = createSelectSchema(comment);
export const commentInsertSchema = createInsertSchema(comment, {
  content: (schema) => v.pipe(schema, v.minLength(1, "Content required")),
});
export const commentUpdateSchema = createUpdateSchema(comment);
```

## ID Generation

Always use nanoid for IDs:

```ts
import { nanoid } from "nanoid";

await db.insert(comment).values({
  id: nanoid(8),  // 8-character ID
  // ...
});
```

## Database Import

```ts
import { db } from "$lib/server/db";
import { comment, battle, user } from "$lib/server/db/schema";
import { eq, and, or, ne, desc, asc, exists } from "drizzle-orm";
```

## Query Patterns

### Find with Relations

```ts
const result = await db.query.comment.findMany({
  where: eq(comment.battleId, battleId),
  with: { user: true },
  orderBy: desc(comment.createdAt),
});
```

### Find Single

```ts
const result = await db.query.comment.findFirst({
  where: eq(comment.id, id),
  with: { user: true, battle: true },
});

if (!result) error(404, "Not found");
```

### Column Projection

```ts
const result = await db.query.user.findFirst({
  where: eq(user.id, userId),
  columns: { id: true, name: true, image: true },
});
```

### Complex Conditions

```ts
// User's battles (created or joined)
const battles = await db.query.battle.findMany({
  where: or(
    eq(battle.creatorId, userId),
    exists(
      db.select().from(player).where(
        and(
          eq(player.battleId, battle.id),
          eq(player.userId, userId),
        )
      )
    ),
  ),
});
```

## Mutation Patterns

### Insert

```ts
await db.insert(comment).values({
  id: nanoid(8),
  battleId,
  userId: locals.user.id,
  content: data.content,
});
```

### Update

```ts
await db.update(comment)
  .set({ content: data.content })
  .where(eq(comment.id, id));

// Partial update from object
await db.update(user).set(updates).where(eq(user.id, userId));
```

### Delete

```ts
await db.delete(comment).where(eq(comment.id, id));
```

### Transactions

For multi-table atomic operations:

```ts
await db.transaction(async (tx) => {
  await tx.delete(comment).where(eq(comment.battleId, battleId));
  await tx.update(battle)
    .set({ commentCount: 0 })
    .where(eq(battle.id, battleId));
});
```

## Timestamp Patterns

| Pattern | Usage |
|---------|-------|
| `.defaultNow().notNull()` | Creation timestamp |
| `.$onUpdate(() => new Date()).notNull()` | Auto-update on change |
| `integer()` | Unix seconds (app converts) |

## JSON Columns

```ts
jobIds: json("job_ids").$type<JobRef[]>()

// Usage
await db.insert(stage).values({
  jobIds: [{ id: "job_123", type: "reminder" }],
});
```

## Enums

Define with pgEnum:

```ts
import { pgEnum } from "drizzle-orm/pg-core";

export const statusEnum = pgEnum("status", ["draft", "active", "completed", "cancelled"]);

// In table
status: statusEnum("status").default("draft").notNull(),
```

## After Schema Changes

```bash
bun run db:push      # Development (direct push)
bun run db:generate  # Generate migration files
bun run db:migrate   # Apply migrations
bun run db:studio    # Visual browser
```

## Anti-Patterns

| Don't | Do |
|-------|-----|
| SQL foreign key constraints | ORM-only relations |
| UUID for IDs | `nanoid(8)` |
| Raw SQL queries | Query builder API |
| Schema outside `src/lib/server/db/schema/` | Put in `public.ts` |
| Forget index.ts re-export | Always update exports |
| Date objects in integer columns | Convert: `Math.floor(Date.now() / 1000)` |
