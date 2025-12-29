import { error, redirect } from "@sveltejs/kit";
import { eq, or, and, exists } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as v from "valibot";

import { form, query, getRequestEvent } from "$app/server";
import { db } from "$lib/server/db";
import {
  battle,
  player,
  battleInsertSchema,
  battleUpdateSchema,
} from "$lib/server/db/schema";

// Pick fields from drizzle schema and make them required (removes optional/null)
const battleFormSchema = v.required(
  v.pick(battleInsertSchema, [
    "name",
    "visibility",
    "maxPlayers",
    "doubleSubmissions",
  ]),
);

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
export const getBattle = query(v.string(), async (id) => {
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

  try {
    await db.insert(battle).values({
      id,
      ...data,
      creatorId: locals.user.id,
      status: "draft",
    });
  } catch (err) {
    console.error(err);
    invalid((err as Error).message);
    return;
  }

  redirect(302, `/b/${id}`);
});

// Pick update fields from drizzle schema
const battleUpdateFormSchema = v.pick(battleUpdateSchema, [
  "name",
  "visibility",
  "maxPlayers",
  "doubleSubmissions",
]);

// POST: Update battle (id from URL params)
export const updateBattle = form(
  battleUpdateFormSchema,
  async (data, invalid) => {
    const { locals, url } = getRequestEvent();
    if (!locals.user) error(401, "Not authenticated");

    const id = url.searchParams.get("id");
    if (!id) error(400, "Missing battle ID");

    const existing = await db.query.battle.findFirst({
      where: eq(battle.id, id),
    });

    if (!existing) error(404, "Battle not found");
    if (existing.creatorId !== locals.user.id) error(403, "Not authorized");

    try {
      await db.update(battle).set(data).where(eq(battle.id, id));
    } catch (err) {
      console.error(err);
      invalid((err as Error).message);
      return;
    }

    redirect(302, `/b/${id}`);
  },
);

// POST: Cancel battle (id from hidden input)
export const deleteBattle = form(
  v.object({ id: v.string() }),
  async (data, invalid) => {
    const { locals } = getRequestEvent();
    if (!locals.user) error(401, "Not authenticated");

    const existing = await db.query.battle.findFirst({
      where: eq(battle.id, data.id),
    });

    if (!existing) error(404, "Battle not found");
    if (existing.creatorId !== locals.user.id) error(403, "Not authorized");

    try {
      await db
        .update(battle)
        .set({ status: "cancelled" })
        .where(eq(battle.id, data.id));
    } catch (err) {
      console.error(err);
      invalid((err as Error).message);
      return;
    }

    redirect(302, "/home");
  },
);
