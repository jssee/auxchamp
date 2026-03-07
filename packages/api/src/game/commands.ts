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

export type InvitePlayerInput = {
  gameId: string;
  targetUserId: string;
};

export type AcceptInviteInput = {
  gameId: string;
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

export async function invitePlayer(actorUserId: string, input: InvitePlayerInput) {
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
      throw new Error("Only the creator can invite players to a draft game.");
    }

    const [existing] = await tx
      .select({ id: player.id })
      .from(player)
      .where(and(eq(player.gameId, input.gameId), eq(player.userId, input.targetUserId)))
      .limit(1);

    if (existing) {
      throw new Error("Player is already in this game.");
    }

    const playerId = nanoid();

    await tx.insert(player).values({
      id: playerId,
      gameId: input.gameId,
      userId: input.targetUserId,
      role: "player",
      status: "invited",
    });

    return {
      playerId,
      gameId: input.gameId,
      userId: input.targetUserId,
      status: "invited" as const,
    };
  });
}

export async function acceptInvite(actorUserId: string, input: AcceptInviteInput) {
  return db.transaction(async (tx) => {
    const [invitedPlayer] = await tx
      .select({ id: player.id, status: player.status })
      .from(player)
      .where(and(eq(player.gameId, input.gameId), eq(player.userId, actorUserId)))
      .limit(1);

    if (invitedPlayer?.status !== "invited") {
      throw new Error("No pending invite found.");
    }

    const now = new Date();

    await tx
      .update(player)
      .set({ status: "active", joinedAt: now })
      .where(eq(player.id, invitedPlayer.id));

    return {
      playerId: invitedPlayer.id,
      gameId: input.gameId,
      userId: actorUserId,
      status: "active" as const,
    };
  });
}
