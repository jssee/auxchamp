import { and, asc, count, eq, inArray, sql } from "drizzle-orm";

import { normalizeUsername } from "@auxchamp/auth/utils";
import { db } from "@auxchamp/db";
import { user } from "@auxchamp/db/schema/auth";
import { ballot, game, round, star, submission } from "@auxchamp/db/schema/game";
import type { CapabilityContext } from "./capability";
import { getAllowedActions } from "./capability";
import type {
  GetGameOutput,
  GetPublicProfileOutput,
  GetRoundOutput,
  RoundResult,
  Standing,
} from "./schema";

/** Submissions with star counts for one or more rounds. */
function submissionsWithStarCounts(roundIds: string[]) {
  return db
    .select({
      submissionId: submission.id,
      roundId: submission.roundId,
      playerId: submission.playerId,
      spotifyTrackUrl: submission.spotifyTrackUrl,
      starCount: sql<number>`cast(count(${star.id}) as int)`,
    })
    .from(submission)
    .leftJoin(star, eq(star.submissionId, submission.id))
    .where(inArray(submission.roundId, roundIds))
    .groupBy(submission.id, submission.roundId, submission.playerId, submission.spotifyTrackUrl);
}

/** Build capability context and return allowed actions. */
function computeActions(ctx: Omit<CapabilityContext, "now">) {
  return getAllowedActions({ ...ctx, now: new Date() });
}

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

  // Active round is needed for capability context but not returned.
  const activeRound =
    row.rounds.find((r) => r.phase === "submitting" || r.phase === "voting") ?? null;

  // Round results and standings for scored rounds.
  const scoredRounds = row.rounds.filter((r) => r.phase === "scored");
  let roundResults: RoundResult[] = [];
  let standings: Standing[] = [];

  if (scoredRounds.length > 0) {
    const rows = await submissionsWithStarCounts(scoredRounds.map((r) => r.id));
    const byRound = Map.groupBy(rows, (s) => s.roundId);

    roundResults = scoredRounds.map((sr) => ({
      roundId: sr.id,
      roundNumber: sr.number,
      submissions: (byRound.get(sr.id) ?? [])
        .map((s) => ({
          submissionId: s.submissionId,
          playerId: s.playerId,
          spotifyTrackUrl: s.spotifyTrackUrl,
          starCount: s.starCount,
        }))
        .sort((a, b) => b.starCount - a.starCount),
    }));

    // Derive cumulative standings from the same data (no extra query).
    const starsByPlayer = new Map<string, number>();
    for (const s of rows) {
      starsByPlayer.set(s.playerId, (starsByPlayer.get(s.playerId) ?? 0) + s.starCount);
    }
    standings = [...starsByPlayer.entries()]
      .map(([playerId, totalStars]) => ({ playerId, totalStars }))
      .sort((a, b) => b.totalStars - a.totalStars);
  }

  const actions = computeActions({
    gameState: row.state,
    activeRoundPhase: (activeRound?.phase as "submitting" | "voting") ?? null,
    actorRole: actorPlayer.role,
    actorStatus: actorPlayer.status,
    activePlayerCount: row.players.filter((p) => p.status === "active").length,
    roundCount: row.rounds.length,
    submissionClosesAt: activeRound?.submissionClosesAt ?? null,
    votingClosesAt: activeRound?.votingClosesAt ?? null,
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

    actorPlayer: {
      id: actorPlayer.id,
      role: actorPlayer.role,
      status: actorPlayer.status,
    },

    roundResults,
    standings,
    actions,
  };
}

export async function getRound(
  actorUserId: string,
  gameId: string,
  roundId: string,
): Promise<GetRoundOutput> {
  // Load the game shell: state, players, all rounds (for round count).
  const gameRow = await db.query.game.findFirst({
    where: eq(game.id, gameId),
    columns: { id: true, state: true },
    with: {
      players: {
        columns: { id: true, userId: true, role: true, status: true },
      },
      rounds: {
        columns: { id: true, phase: true },
      },
    },
  });

  if (!gameRow) return null;

  const actorPlayer = gameRow.players.find((p) => p.userId === actorUserId) ?? null;
  if (!actorPlayer) return null;

  // Load the requested round.
  const roundRow = await db.query.round.findFirst({
    where: and(eq(round.id, roundId), eq(round.gameId, gameId)),
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
  });

  if (!roundRow) return null;

  // Phase-specific data.
  type RoundDetail = NonNullable<GetRoundOutput>;
  let actorSubmission: RoundDetail["actorSubmission"] = null;
  let actorBallot: RoundDetail["actorBallot"] = null;
  let votingSubmissions: RoundDetail["votingSubmissions"] = null;
  let results: RoundDetail["results"] = null;

  if (roundRow.phase === "submitting") {
    const sub = await db.query.submission.findFirst({
      where: and(eq(submission.roundId, roundId), eq(submission.playerId, actorPlayer.id)),
      columns: { id: true, spotifyTrackUrl: true, note: true, submittedAt: true },
    });
    actorSubmission = sub ?? null;
  }

  if (roundRow.phase === "voting") {
    const ballotRow = await db.query.ballot.findFirst({
      where: and(eq(ballot.roundId, roundId), eq(ballot.playerId, actorPlayer.id)),
      columns: { id: true },
      with: { stars: { columns: { submissionId: true } } },
    });

    if (ballotRow) {
      actorBallot = {
        ballotId: ballotRow.id,
        submissionIds: ballotRow.stars.map((s) => s.submissionId),
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
      .where(eq(submission.roundId, roundId));
  }

  if (roundRow.phase === "scored") {
    const rows = await submissionsWithStarCounts([roundId]);

    results = {
      submissions: rows
        .map((s) => ({
          submissionId: s.submissionId,
          playerId: s.playerId,
          spotifyTrackUrl: s.spotifyTrackUrl,
          starCount: s.starCount,
        }))
        .sort((a, b) => b.starCount - a.starCount),
    };
  }

  // Only active rounds (submitting/voting) produce round-relevant actions.
  const activeRoundPhase =
    roundRow.phase === "submitting" || roundRow.phase === "voting" ? roundRow.phase : null;

  const actions = computeActions({
    gameState: gameRow.state,
    activeRoundPhase,
    actorRole: actorPlayer.role,
    actorStatus: actorPlayer.status,
    activePlayerCount: gameRow.players.filter((p) => p.status === "active").length,
    roundCount: gameRow.rounds.length,
    submissionClosesAt: roundRow.submissionClosesAt,
    votingClosesAt: roundRow.votingClosesAt,
  });

  return {
    id: roundRow.id,
    number: roundRow.number,
    theme: roundRow.theme,
    description: roundRow.description,
    phase: roundRow.phase,
    submissionOpensAt: roundRow.submissionOpensAt,
    submissionClosesAt: roundRow.submissionClosesAt,
    votingOpensAt: roundRow.votingOpensAt,
    votingClosesAt: roundRow.votingClosesAt,

    actorPlayer: {
      id: actorPlayer.id,
      role: actorPlayer.role,
      status: actorPlayer.status,
    },
    actorSubmission,
    actorBallot,
    votingSubmissions,
    results,
    actions,
  };
}
