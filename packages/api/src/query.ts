import { and, asc, count, eq, inArray, sql } from "drizzle-orm";

import { normalizeUsername } from "@auxchamp/auth/utils";
import { db } from "@auxchamp/db";
import { user } from "@auxchamp/db/schema/auth";
import { ballot, game, star, submission } from "@auxchamp/db/schema/game";
import type { GetGameOutput, GetPublicProfileOutput } from "./schema";

export async function getPublicProfile(username: string): Promise<GetPublicProfileOutput> {
  const profile = await db.query.user.findFirst({
    where: eq(user.username, normalizeUsername(username)),
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
          votingOpensAt: true,
          votingClosesAt: true,
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

  const activeRound =
    row.rounds.find((r) => r.phase === "submitting" || r.phase === "voting") ?? null;

  const actorSubmission =
    activeRound === null || activeRound.phase !== "submitting"
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

  // Voting-phase data: actor's ballot and the submissions to vote on.
  let actorBallot: { ballotId: string; submissionIds: string[] } | null = null;
  let votingSubmissions:
    | {
        id: string;
        playerId: string;
        spotifyTrackUrl: string;
        note: string | null;
      }[]
    | null = null;

  if (activeRound?.phase === "voting") {
    const actorBallotRow = await db.query.ballot.findFirst({
      where: and(eq(ballot.roundId, activeRound.id), eq(ballot.playerId, actorPlayer.id)),
      columns: { id: true },
      with: {
        stars: { columns: { submissionId: true } },
      },
    });

    if (actorBallotRow) {
      actorBallot = {
        ballotId: actorBallotRow.id,
        submissionIds: actorBallotRow.stars.map((s) => s.submissionId),
      };
    }

    votingSubmissions = await db
      .select({
        id: submission.id,
        playerId: submission.playerId,
        spotifyTrackUrl: submission.spotifyTrackUrl,
        note: submission.note,
      })
      .from(submission)
      .where(eq(submission.roundId, activeRound.id));
  }

  // Round results for scored rounds: star counts per submission.
  const scoredRounds = row.rounds.filter((r) => r.phase === "scored");
  const roundResults: {
    roundId: string;
    roundNumber: number;
    submissions: {
      submissionId: string;
      playerId: string;
      spotifyTrackUrl: string;
      starCount: number;
    }[];
  }[] = [];

  if (scoredRounds.length > 0) {
    const scoredRoundIds = scoredRounds.map((r) => r.id);

    // Get all submissions for scored rounds with star counts.
    const submissionsWithStars = await db
      .select({
        submissionId: submission.id,
        roundId: submission.roundId,
        playerId: submission.playerId,
        spotifyTrackUrl: submission.spotifyTrackUrl,
        starCount: sql<number>`cast(count(${star.id}) as int)`,
      })
      .from(submission)
      .leftJoin(star, eq(star.submissionId, submission.id))
      .where(inArray(submission.roundId, scoredRoundIds))
      .groupBy(submission.id, submission.roundId, submission.playerId, submission.spotifyTrackUrl);

    // Group by round.
    const byRound = new Map<
      string,
      { submissionId: string; playerId: string; spotifyTrackUrl: string; starCount: number }[]
    >();

    for (const row of submissionsWithStars) {
      let list = byRound.get(row.roundId);
      if (!list) {
        list = [];
        byRound.set(row.roundId, list);
      }
      list.push({
        submissionId: row.submissionId,
        playerId: row.playerId,
        spotifyTrackUrl: row.spotifyTrackUrl,
        starCount: row.starCount,
      });
    }

    for (const sr of scoredRounds) {
      roundResults.push({
        roundId: sr.id,
        roundNumber: sr.number,
        submissions: (byRound.get(sr.id) ?? []).sort((a, b) => b.starCount - a.starCount),
      });
    }
  }

  // Cumulative standings across all scored rounds.
  const standings: { playerId: string; totalStars: number }[] = [];

  if (scoredRounds.length > 0) {
    const scoredRoundIds = scoredRounds.map((r) => r.id);

    const totals = await db
      .select({
        playerId: submission.playerId,
        totalStars: sql<number>`cast(count(${star.id}) as int)`,
      })
      .from(submission)
      .leftJoin(star, eq(star.submissionId, submission.id))
      .where(inArray(submission.roundId, scoredRoundIds))
      .groupBy(submission.playerId);

    for (const t of totals) {
      standings.push({ playerId: t.playerId, totalStars: t.totalStars });
    }

    standings.sort((a, b) => b.totalStars - a.totalStars);
  }

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
          votingOpensAt: activeRound.votingOpensAt,
          votingClosesAt: activeRound.votingClosesAt,
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

    actorBallot,
    votingSubmissions,
    roundResults,
    standings,
  };
}
