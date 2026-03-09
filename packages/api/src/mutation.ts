import { ORPCError } from "@orpc/server";
import { and, asc, count, desc, eq } from "drizzle-orm";

import { db } from "@auxchamp/db";
import { game, player, round, submission } from "@auxchamp/db/schema/game";
import { nanoid } from "nanoid";
import type {
  AcceptInviteInput,
  AcceptInviteOutput,
  AddRoundInput,
  AddRoundOutput,
  CreateGameInput,
  CreateGameOutput,
  InvitePlayerOutput,
  SaveSubmissionInput,
  SaveSubmissionOutput,
  StartGameInput,
  StartGameOutput,
} from "./schema";

/**
 * Internal after the router resolves the invitee's email to a concrete user id.
 * This is domain input, not a public API payload.
 */
export type InvitePlayerInput = {
  gameId: string;
  targetUserId: string;
};

export async function createGame(
  actorUserId: string,
  input: CreateGameInput,
): Promise<CreateGameOutput> {
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

export async function addRound(actorUserId: string, input: AddRoundInput): Promise<AddRoundOutput> {
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
      throw new ORPCError("FORBIDDEN", {
        message: "Only the creator can add rounds to a draft game.",
      });
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

export async function invitePlayer(
  actorUserId: string,
  input: InvitePlayerInput,
): Promise<InvitePlayerOutput> {
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
      throw new ORPCError("FORBIDDEN", {
        message: "Only the creator can invite players to a draft game.",
      });
    }

    const [existing] = await tx
      .select({ id: player.id })
      .from(player)
      .where(and(eq(player.gameId, input.gameId), eq(player.userId, input.targetUserId)))
      .limit(1);

    if (existing) {
      throw new ORPCError("CONFLICT", { message: "Player is already in this game." });
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
      status: "invited",
    };
  });
}

export async function acceptInvite(
  actorUserId: string,
  input: AcceptInviteInput,
): Promise<AcceptInviteOutput> {
  return db.transaction(async (tx) => {
    const [invitedPlayer] = await tx
      .select({ id: player.id, status: player.status })
      .from(player)
      .where(and(eq(player.gameId, input.gameId), eq(player.userId, actorUserId)))
      .limit(1);

    if (invitedPlayer?.status !== "invited") {
      throw new ORPCError("NOT_FOUND", { message: "No pending invite found." });
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
      status: "active",
    };
  });
}

export async function startGame(
  actorUserId: string,
  input: StartGameInput,
): Promise<StartGameOutput> {
  return db.transaction(async (tx) => {
    const [draftGame] = await tx
      .select({
        state: game.state,
        submissionWindowDays: game.submissionWindowDays,
      })
      .from(game)
      .where(eq(game.id, input.gameId))
      .limit(1);
    const [creatorPlayer] = await tx
      .select({ role: player.role })
      .from(player)
      .where(and(eq(player.gameId, input.gameId), eq(player.userId, actorUserId)))
      .limit(1);

    if (draftGame?.state !== "draft" || creatorPlayer?.role !== "creator") {
      throw new ORPCError("FORBIDDEN", { message: "Only the creator can start a draft game." });
    }

    const [firstRound] = await tx
      .select({ id: round.id })
      .from(round)
      .where(eq(round.gameId, input.gameId))
      .orderBy(asc(round.number))
      .limit(1);

    if (!firstRound) {
      throw new ORPCError("PRECONDITION_FAILED", { message: "Game must have at least one round." });
    }

    const [playerCount] = await tx
      .select({ activePlayers: count() })
      .from(player)
      .where(and(eq(player.gameId, input.gameId), eq(player.status, "active")));

    if (!playerCount || playerCount.activePlayers < 4) {
      throw new ORPCError("PRECONDITION_FAILED", {
        message: "Game must have at least four active players.",
      });
    }

    const now = new Date();
    const submissionClosesAt = new Date(now);
    submissionClosesAt.setDate(submissionClosesAt.getDate() + draftGame.submissionWindowDays);

    await tx.update(game).set({ state: "active", startedAt: now }).where(eq(game.id, input.gameId));

    await tx
      .update(round)
      .set({
        phase: "submitting",
        submissionOpensAt: now,
        submissionClosesAt,
      })
      .where(eq(round.id, firstRound.id));

    return {
      gameId: input.gameId,
      state: "active",
      startedAt: now,
      openRoundId: firstRound.id,
    };
  });
}

export async function saveSubmission(
  actorUserId: string,
  input: SaveSubmissionInput,
): Promise<SaveSubmissionOutput> {
  return db.transaction(async (tx) => {
    const [activePlayer] = await tx
      .select({ id: player.id })
      .from(player)
      .where(
        and(
          eq(player.gameId, input.gameId),
          eq(player.userId, actorUserId),
          eq(player.status, "active"),
        ),
      )
      .limit(1);

    if (!activePlayer) {
      throw new ORPCError("FORBIDDEN", { message: "Only active players can submit." });
    }

    const [submittingRound] = await tx
      .select({
        id: round.id,
        submissionClosesAt: round.submissionClosesAt,
      })
      .from(round)
      .where(and(eq(round.gameId, input.gameId), eq(round.phase, "submitting")))
      .limit(1);

    if (!submittingRound) {
      throw new ORPCError("PRECONDITION_FAILED", {
        message: "No round is currently accepting submissions.",
      });
    }

    if (submittingRound.submissionClosesAt && submittingRound.submissionClosesAt < new Date()) {
      throw new ORPCError("PRECONDITION_FAILED", { message: "The submission window has closed." });
    }

    const submissionId = nanoid();
    const now = new Date();

    const [saved] = await tx
      .insert(submission)
      .values({
        id: submissionId,
        roundId: submittingRound.id,
        playerId: activePlayer.id,
        spotifyTrackUrl: input.spotifyTrackUrl,
        note: input.note ?? null,
        submittedAt: now,
      })
      .onConflictDoUpdate({
        target: [submission.roundId, submission.playerId],
        set: {
          spotifyTrackUrl: input.spotifyTrackUrl,
          note: input.note ?? null,
          submittedAt: now,
        },
      })
      .returning();

    return {
      submissionId: saved!.id,
      playerId: activePlayer.id,
      roundId: submittingRound.id,
      gameId: input.gameId,
      spotifyTrackUrl: saved!.spotifyTrackUrl,
      note: saved!.note,
    };
  });
}
