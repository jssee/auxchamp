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

  // Redirect existing players directly to battle
  if (locals.user) {
    const existingPlayer = await db.query.player.findFirst({
      where: and(
        eq(player.battleId, result.id),
        eq(player.userId, locals.user.id),
      ),
    });

    if (existingPlayer) {
      redirect(302, `/b/${result.id}`);
    }
  }

  return {
    battle: { id: result.id, name: result.name },
    isFull,
    user: locals.user,
  };
};
