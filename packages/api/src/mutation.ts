import { ORPCError } from "@orpc/server";
import { and, asc, count, desc, eq, inArray, or } from "drizzle-orm";

import { db } from "@auxchamp/db";
import {
  ballot,
  game,
  player,
  round,
  star,
  submission,
} from "@auxchamp/db/schema/game";
import { nanoid } from "nanoid";
import type {
  AcceptInviteInput,
  AcceptInviteOutput,
  AddRoundInput,
  AddRoundOutput,
  AdvanceRoundInput,
  AdvanceRoundOutput,
  CreateGameInput,
  CreateGameOutput,
  InvitePlayerOutput,
  SaveBallotInput,
  SaveBallotOutput,
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

export async function addRound(
  actorUserId: string,
  input: AddRoundInput,
): Promise<AddRoundOutput> {
  return db.transaction(async (tx) => {
    const [draftGame] = await tx
      .select({ state: game.state })
      .from(game)
      .where(eq(game.id, input.gameId))
      .limit(1);
    const [creatorPlayer] = await tx
      .select({ role: player.role })
      .from(player)
      .where(
        and(eq(player.gameId, input.gameId), eq(player.userId, actorUserId)),
      )
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
      .where(
        and(eq(player.gameId, input.gameId), eq(player.userId, actorUserId)),
      )
      .limit(1);

    if (draftGame?.state !== "draft" || creatorPlayer?.role !== "creator") {
      throw new ORPCError("FORBIDDEN", {
        message: "Only the creator can invite players to a draft game.",
      });
    }

    const [existing] = await tx
      .select({ id: player.id })
      .from(player)
      .where(
        and(
          eq(player.gameId, input.gameId),
          eq(player.userId, input.targetUserId),
        ),
      )
      .limit(1);

    if (existing) {
      throw new ORPCError("CONFLICT", {
        message: "Player is already in this game.",
      });
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
      .where(
        and(eq(player.gameId, input.gameId), eq(player.userId, actorUserId)),
      )
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
      .where(
        and(eq(player.gameId, input.gameId), eq(player.userId, actorUserId)),
      )
      .limit(1);

    if (draftGame?.state !== "draft" || creatorPlayer?.role !== "creator") {
      throw new ORPCError("FORBIDDEN", {
        message: "Only the creator can start a draft game.",
      });
    }

    const [firstRound] = await tx
      .select({ id: round.id })
      .from(round)
      .where(eq(round.gameId, input.gameId))
      .orderBy(asc(round.number))
      .limit(1);

    if (!firstRound) {
      throw new ORPCError("PRECONDITION_FAILED", {
        message: "Game must have at least one round.",
      });
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
    submissionClosesAt.setDate(
      submissionClosesAt.getDate() + draftGame.submissionWindowDays,
    );

    await tx
      .update(game)
      .set({ state: "active", startedAt: now })
      .where(eq(game.id, input.gameId));

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
      throw new ORPCError("FORBIDDEN", {
        message: "Only active players can submit.",
      });
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

    if (
      submittingRound.submissionClosesAt &&
      submittingRound.submissionClosesAt < new Date()
    ) {
      throw new ORPCError("PRECONDITION_FAILED", {
        message: "The submission window has closed.",
      });
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

export async function saveBallot(
  actorUserId: string,
  input: SaveBallotInput,
): Promise<SaveBallotOutput> {
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
      throw new ORPCError("FORBIDDEN", {
        message: "Only active players can vote.",
      });
    }

    const [votingRound] = await tx
      .select({
        id: round.id,
        votingClosesAt: round.votingClosesAt,
      })
      .from(round)
      .where(and(eq(round.gameId, input.gameId), eq(round.phase, "voting")))
      .limit(1);

    if (!votingRound) {
      throw new ORPCError("PRECONDITION_FAILED", {
        message: "No round is currently accepting votes.",
      });
    }

    if (votingRound.votingClosesAt && votingRound.votingClosesAt < new Date()) {
      throw new ORPCError("PRECONDITION_FAILED", {
        message: "The voting window has closed.",
      });
    }

    // Validate distinctness.
    const uniqueIds = new Set(input.submissionIds);
    if (uniqueIds.size !== 3) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Must star 3 distinct submissions.",
      });
    }

    // Validate all submissions belong to the voting round.
    const targetSubmissions = await tx
      .select({ id: submission.id, playerId: submission.playerId })
      .from(submission)
      .where(
        and(
          eq(submission.roundId, votingRound.id),
          inArray(submission.id, input.submissionIds),
        ),
      );

    if (targetSubmissions.length !== 3) {
      throw new ORPCError("BAD_REQUEST", {
        message:
          "All starred submissions must belong to the current voting round.",
      });
    }

    // Validate no self-voting.
    if (targetSubmissions.some((s) => s.playerId === activePlayer.id)) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Cannot star your own submission.",
      });
    }

    // Upsert ballot: delete existing stars and replace.
    const [existing] = await tx
      .select({ id: ballot.id })
      .from(ballot)
      .where(
        and(
          eq(ballot.roundId, votingRound.id),
          eq(ballot.playerId, activePlayer.id),
        ),
      )
      .limit(1);

    let ballotId: string;

    if (existing) {
      ballotId = existing.id;
      await tx.delete(star).where(eq(star.ballotId, ballotId));
    } else {
      ballotId = nanoid();
      await tx.insert(ballot).values({
        id: ballotId,
        roundId: votingRound.id,
        playerId: activePlayer.id,
      });
    }

    await tx.insert(star).values(
      input.submissionIds.map((submissionId) => ({
        id: nanoid(),
        ballotId,
        submissionId,
      })),
    );

    return {
      ballotId,
      roundId: votingRound.id,
      playerId: activePlayer.id,
      gameId: input.gameId,
      submissionIds: input.submissionIds,
    };
  });
}

/**
 * Creator-controlled phase advance. Moves the active round forward:
 *   submitting → voting
 *   voting → scored (then opens next round or completes game)
 *
 * No concurrency guard beyond the transaction; acceptable for this milestone
 * since only the creator triggers advances. Replace with SELECT … FOR UPDATE
 * if concurrent advance requests become possible.
 */
export async function advanceRound(
  actorUserId: string,
  input: AdvanceRoundInput,
): Promise<AdvanceRoundOutput> {
  return db.transaction(async (tx) => {
    // Verify creator.
    const [creatorPlayer] = await tx
      .select({ role: player.role })
      .from(player)
      .where(
        and(eq(player.gameId, input.gameId), eq(player.userId, actorUserId)),
      )
      .limit(1);

    if (creatorPlayer?.role !== "creator") {
      throw new ORPCError("FORBIDDEN", {
        message: "Only the creator can advance the round.",
      });
    }

    // Fetch game config and active round in parallel.
    const [[gameRow], [activeRound]] = await Promise.all([
      tx
        .select({
          submissionWindowDays: game.submissionWindowDays,
          votingWindowDays: game.votingWindowDays,
        })
        .from(game)
        .where(eq(game.id, input.gameId))
        .limit(1),
      tx
        .select({ id: round.id, number: round.number, phase: round.phase })
        .from(round)
        .where(
          and(
            eq(round.gameId, input.gameId),
            or(eq(round.phase, "submitting"), eq(round.phase, "voting")),
          ),
        )
        .limit(1),
    ]);

    if (!activeRound) {
      throw new ORPCError("PRECONDITION_FAILED", {
        message: "No round is currently in an advanceable phase.",
      });
    }

    if (activeRound.phase === "submitting") {
      return advanceSubmittingToVoting(
        tx,
        activeRound,
        gameRow!.votingWindowDays,
      );
    }

    return advanceVotingToScored(
      tx,
      input.gameId,
      activeRound,
      gameRow!.submissionWindowDays,
    );
  });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function advanceSubmittingToVoting(
  tx: Tx,
  activeRound: { id: string; number: number; phase: string },
  votingWindowDays: number,
): Promise<AdvanceRoundOutput> {
  const now = new Date();
  const votingClosesAt = new Date(now);
  votingClosesAt.setDate(votingClosesAt.getDate() + votingWindowDays);

  await tx
    .update(round)
    .set({ phase: "voting", votingOpensAt: now, votingClosesAt })
    .where(eq(round.id, activeRound.id));

  return {
    roundId: activeRound.id,
    fromPhase: "submitting",
    toPhase: "voting",
    nextRoundId: null,
    gameCompleted: false,
  };
}

async function advanceVotingToScored(
  tx: Tx,
  gameId: string,
  activeRound: { id: string; number: number; phase: string },
  submissionWindowDays: number,
): Promise<AdvanceRoundOutput> {
  // Mark the round as scored.
  await tx
    .update(round)
    .set({ phase: "scored" })
    .where(eq(round.id, activeRound.id));

  // Find the next pending round.
  const [nextRound] = await tx
    .select({ id: round.id })
    .from(round)
    .where(and(eq(round.gameId, gameId), eq(round.phase, "pending")))
    .orderBy(asc(round.number))
    .limit(1);

  if (nextRound) {
    const now = new Date();
    const submissionClosesAt = new Date(now);
    submissionClosesAt.setDate(
      submissionClosesAt.getDate() + submissionWindowDays,
    );

    await tx
      .update(round)
      .set({ phase: "submitting", submissionOpensAt: now, submissionClosesAt })
      .where(eq(round.id, nextRound.id));

    return {
      roundId: activeRound.id,
      fromPhase: "voting",
      toPhase: "scored",
      nextRoundId: nextRound.id,
      gameCompleted: false,
    };
  }

  // No more rounds — complete the game.
  await tx
    .update(game)
    .set({ state: "completed", completedAt: new Date() })
    .where(eq(game.id, gameId));

  return {
    roundId: activeRound.id,
    fromPhase: "voting",
    toPhase: "scored",
    nextRoundId: null,
    gameCompleted: true,
  };
}
