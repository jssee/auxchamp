import { asc, eq } from "drizzle-orm";

import { db } from "@auxchamp/db";
import { game } from "@auxchamp/db/schema/game";

export async function getGameDetail(actorUserId: string, gameId: string) {
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
        with: {
          submissions: {
            columns: {
              id: true,
              playerId: true,
              spotifyTrackUrl: true,
              note: true,
              submittedAt: true,
            },
          },
        },
      },
    },
  });

  if (!row) return null;

  const actorPlayer = row.players.find((p) => p.userId === actorUserId) ?? null;
  const activeRound = row.rounds.find((r) => r.phase === "submitting") ?? null;
  const actorSubmission =
    activeRound && actorPlayer
      ? (activeRound.submissions.find((s) => s.playerId === actorPlayer.id) ?? null)
      : null;

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

    players: row.players.map((p) => ({
      id: p.id,
      userId: p.userId,
      userName: p.user.name,
      userImage: p.user.image,
      role: p.role,
      status: p.status,
    })),

    rounds: row.rounds.map((r) => ({
      id: r.id,
      number: r.number,
      theme: r.theme,
      description: r.description,
      phase: r.phase,
      submissionOpensAt: r.submissionOpensAt,
      submissionClosesAt: r.submissionClosesAt,
      submissionCount: r.submissions.length,
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

    actorPlayer: actorPlayer
      ? {
          id: actorPlayer.id,
          role: actorPlayer.role,
          status: actorPlayer.status,
        }
      : null,

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
