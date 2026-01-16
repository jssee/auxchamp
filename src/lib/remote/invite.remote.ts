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
