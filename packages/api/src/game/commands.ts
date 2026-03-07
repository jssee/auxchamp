import { and, desc, eq } from "drizzle-orm";

import { db } from "@auxchamp/db";
import { game, player, round } from "@auxchamp/db/schema/game";
import { nanoid } from "nanoid";

export type CreateGameInput = {
  name: string;
  description?: string | null;
  submissionWindowDays: number;
  votingWindowDays: number;
};

export type AddRoundInput = {
  gameId: string;
  theme: string;
  description?: string | null;
};

export async function createGame(actorUserId: string, input: CreateGameInput) {
  return db.transaction(async (tx) => {
    const gameId = nanoid();
    const creatorPlayerId = nanoid();

    await tx.insert(game).values({
      id: gameId,
      name: input.name,
      description: input.description ?? null,
      submissionWindowDays: input.submissionWindowDays,
      votingWindowDays: input.votingWindowDays,
    });

    await tx.insert(player).values({
      id: creatorPlayerId,
      gameId,
      userId: actorUserId,
      role: "creator",
      status: "active",
    });

    return {
      gameId,
      creatorPlayerId,
    };
  });
}

export async function addRound(actorUserId: string, input: AddRoundInput) {
  return db.transaction(async (tx) => {
    const [draftGame] = await tx
      .select({ state: game.state })
      .from(game)
      .where(eq(game.id, input.gameId))
      .limit(1);
    const [creatorPlayer] = await tx
      .select({ role: player.role })
      .from(player)
      .where(and(eq(player.gameId, input.gameId), eq(player.userId, actorUserId)))
      .limit(1);

    if (draftGame?.state !== "draft" || creatorPlayer?.role !== "creator") {
      throw new Error("Only the creator can add rounds to a draft game.");
    }

    const [lastRound] = await tx
      .select({ number: round.number })
      .from(round)
      .where(eq(round.gameId, input.gameId))
      .orderBy(desc(round.number))
      .limit(1);

    const nextNumber = (lastRound?.number ?? 0) + 1;
    const roundId = nanoid();

    await tx.insert(round).values({
      id: roundId,
      gameId: input.gameId,
      number: nextNumber,
      theme: input.theme,
      description: input.description ?? null,
    });

    return {
      roundId,
      gameId: input.gameId,
      number: nextNumber,
      theme: input.theme,
      description: input.description ?? null,
    };
  });
}
