import { eq, and } from "drizzle-orm";

import { db } from "$lib/server/db";
import { player } from "$lib/server/db/schema";

/**
 * Checks if a user is a participant in a battle.
 * Returns true if user is the creator OR has joined as a player.
 */
export async function isParticipant(
  userId: string,
  battleId: string,
  creatorId: string,
): Promise<boolean> {
  if (creatorId === userId) return true;

  const playerRecord = await db.query.player.findFirst({
    where: and(eq(player.battleId, battleId), eq(player.userId, userId)),
  });

  return !!playerRecord;
}
