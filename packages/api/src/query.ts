import { and, asc, count, eq, inArray } from "drizzle-orm";

import { db } from "@auxchamp/db";
import { user } from "@auxchamp/db/schema/auth";
import { game, submission } from "@auxchamp/db/schema/game";
import type { GetGameOutput, GetPublicProfileOutput } from "./schema";

export async function getPublicProfile(username: string): Promise<GetPublicProfileOutput> {
  const profile = await db.query.user.findFirst({
    where: eq(user.username, username),
    columns: {
      id: true,
      username: true,
      displayUsername: true,
      name: true,
      image: true,
      createdAt: true,
    },
  });

  return profile ?? null;
}

export async function getGame(actorUserId: string, gameId: string): Promise<GetGameOutput> {
  const row = await db.query.game.findFirst({
    where: eq(game.id, gameId),
    with: {
      players: {
        columns: {
          id: true,
          userId: true,
          role: true,
          status: true,
        },
        with: {
          user: { columns: { name: true, image: true } },
        },
      },
      rounds: {
        columns: {
          id: true,
          number: true,
          theme: true,
          description: true,
          phase: true,
          submissionOpensAt: true,
          submissionClosesAt: true,
        },
        orderBy: (round) => [asc(round.number)],
      },
    },
  });

  if (!row) return null;

  const actorPlayer = row.players.find((p) => p.userId === actorUserId) ?? null;

  // Only game members can view game detail.
  if (!actorPlayer) return null;

  const submissionCountByRoundId =
    row.rounds.length === 0
      ? new Map<string, number>()
      : new Map(
          (
            await db
              .select({
                roundId: submission.roundId,
                submissionCount: count(),
              })
              .from(submission)
              .where(
                inArray(
                  submission.roundId,
                  row.rounds.map((round) => round.id),
                ),
              )
              .groupBy(submission.roundId)
          ).map((entry) => [entry.roundId, entry.submissionCount]),
        );

  const activeRound = row.rounds.find((round) => round.phase === "submitting") ?? null;
  const actorSubmission =
    activeRound === null
      ? null
      : await db.query.submission.findFirst({
          where: and(
            eq(submission.roundId, activeRound.id),
            eq(submission.playerId, actorPlayer.id),
          ),
          columns: {
            id: true,
            spotifyTrackUrl: true,
            note: true,
            submittedAt: true,
          },
        });

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    state: row.state,
    submissionWindowDays: row.submissionWindowDays,
    votingWindowDays: row.votingWindowDays,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,

    players: row.players.map((player) => ({
      id: player.id,
      userId: player.userId,
      userName: player.user.name,
      userImage: player.user.image,
      role: player.role,
      status: player.status,
    })),

    rounds: row.rounds.map((round) => ({
      id: round.id,
      number: round.number,
      theme: round.theme,
      description: round.description,
      phase: round.phase,
      submissionOpensAt: round.submissionOpensAt,
      submissionClosesAt: round.submissionClosesAt,
      submissionCount: submissionCountByRoundId.get(round.id) ?? 0,
    })),

    activeRound: activeRound
      ? {
          id: activeRound.id,
          number: activeRound.number,
          theme: activeRound.theme,
          description: activeRound.description,
          phase: activeRound.phase,
          submissionOpensAt: activeRound.submissionOpensAt,
          submissionClosesAt: activeRound.submissionClosesAt,
        }
      : null,

    actorPlayer: {
      id: actorPlayer.id,
      role: actorPlayer.role,
      status: actorPlayer.status,
    },

    actorSubmission: actorSubmission
      ? {
          id: actorSubmission.id,
          spotifyTrackUrl: actorSubmission.spotifyTrackUrl,
          note: actorSubmission.note,
          submittedAt: actorSubmission.submittedAt,
        }
      : null,
  };
}
