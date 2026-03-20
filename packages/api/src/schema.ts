import * as v from "valibot";

import { isSpotifyTrackUrl } from "./util";

/**
 * API payload schemas are the source of truth for this package.
 *
 * Keep only transport shapes here: procedure inputs and outputs that clients can send or receive.
 * Domain-only shapes that exist after router translation stay in the module that uses them.
 */

const gameStateValues = ["draft", "active", "completed"] as const;
const playerRoleValues = ["creator", "player"] as const;
const playerStatusValues = ["invited", "active", "left", "removed"] as const;
const roundPhaseValues = ["pending", "submitting", "voting", "scored"] as const;

export const healthOutputSchema = v.literal("OK");
export type HealthOutput = v.InferOutput<typeof healthOutputSchema>;

export const getPublicProfileInputSchema = v.object({
  username: v.pipe(v.string(), v.minLength(1, "Username is required")),
});
export type GetPublicProfileInput = v.InferOutput<typeof getPublicProfileInputSchema>;

export const getPublicProfileOutputSchema = v.nullable(
  v.object({
    id: v.string(),
    username: v.string(),
    displayUsername: v.string(),
    name: v.string(),
    image: v.nullable(v.string()),
    createdAt: v.date(),
  }),
);
export type GetPublicProfileOutput = v.InferOutput<typeof getPublicProfileOutputSchema>;

export const createGameInputSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "Name is required")),
  description: v.optional(v.string()),
  submissionWindowDays: v.pipe(v.number(), v.integer(), v.minValue(1)),
  votingWindowDays: v.pipe(v.number(), v.integer(), v.minValue(1)),
});
export type CreateGameInput = v.InferOutput<typeof createGameInputSchema>;

export const createGameOutputSchema = v.object({
  gameId: v.string(),
  creatorPlayerId: v.string(),
});
export type CreateGameOutput = v.InferOutput<typeof createGameOutputSchema>;

export const addRoundInputSchema = v.object({
  gameId: v.string(),
  theme: v.pipe(v.string(), v.minLength(1, "Theme is required")),
  description: v.optional(v.string()),
});
export type AddRoundInput = v.InferOutput<typeof addRoundInputSchema>;

export const addRoundOutputSchema = v.object({
  roundId: v.string(),
  gameId: v.string(),
  number: v.number(),
  theme: v.string(),
  description: v.nullable(v.string()),
});
export type AddRoundOutput = v.InferOutput<typeof addRoundOutputSchema>;

export const invitePlayerInputSchema = v.object({
  gameId: v.string(),
  targetUserEmail: v.pipe(v.string(), v.email("Invalid email")),
});
export type InvitePlayerInput = v.InferOutput<typeof invitePlayerInputSchema>;

export const invitePlayerOutputSchema = v.object({
  playerId: v.string(),
  gameId: v.string(),
  userId: v.string(),
  status: v.literal("invited"),
});
export type InvitePlayerOutput = v.InferOutput<typeof invitePlayerOutputSchema>;

export const acceptInviteInputSchema = v.object({
  gameId: v.string(),
});
export type AcceptInviteInput = v.InferOutput<typeof acceptInviteInputSchema>;

export const acceptInviteOutputSchema = v.object({
  playerId: v.string(),
  gameId: v.string(),
  userId: v.string(),
  status: v.literal("active"),
});
export type AcceptInviteOutput = v.InferOutput<typeof acceptInviteOutputSchema>;

export const startGameInputSchema = v.object({
  gameId: v.string(),
});
export type StartGameInput = v.InferOutput<typeof startGameInputSchema>;

export const startGameOutputSchema = v.object({
  gameId: v.string(),
  state: v.literal("active"),
  startedAt: v.date(),
  openRoundId: v.string(),
});
export type StartGameOutput = v.InferOutput<typeof startGameOutputSchema>;

export const saveSubmissionInputSchema = v.object({
  gameId: v.string(),
  spotifyTrackUrl: v.pipe(
    v.string(),
    v.url("Must be a valid URL"),
    v.check(isSpotifyTrackUrl, "Must be a Spotify track URL"),
  ),
  note: v.optional(v.string()),
});
export type SaveSubmissionInput = v.InferOutput<typeof saveSubmissionInputSchema>;

export const saveSubmissionOutputSchema = v.object({
  submissionId: v.string(),
  playerId: v.string(),
  roundId: v.string(),
  gameId: v.string(),
  spotifyTrackUrl: v.string(),
  note: v.nullable(v.string()),
});
export type SaveSubmissionOutput = v.InferOutput<typeof saveSubmissionOutputSchema>;

const playerSchema = v.object({
  id: v.string(),
  userId: v.string(),
  userName: v.string(),
  userImage: v.nullable(v.string()),
  role: v.picklist(playerRoleValues),
  status: v.picklist(playerStatusValues),
});

type Player = v.InferOutput<typeof playerSchema>;

const roundSchema = v.object({
  id: v.string(),
  number: v.number(),
  theme: v.string(),
  description: v.nullable(v.string()),
  phase: v.picklist(roundPhaseValues),
  submissionOpensAt: v.nullable(v.date()),
  submissionClosesAt: v.nullable(v.date()),
  submissionCount: v.number(),
});

type Round = v.InferOutput<typeof roundSchema>;

const activeRoundSchema = v.object({
  id: v.string(),
  number: v.number(),
  theme: v.string(),
  description: v.nullable(v.string()),
  phase: v.picklist(roundPhaseValues),
  submissionOpensAt: v.nullable(v.date()),
  submissionClosesAt: v.nullable(v.date()),
  votingOpensAt: v.nullable(v.date()),
  votingClosesAt: v.nullable(v.date()),
});

type ActiveRound = v.InferOutput<typeof activeRoundSchema>;

const actorPlayerSchema = v.object({
  id: v.string(),
  role: v.picklist(playerRoleValues),
  status: v.picklist(playerStatusValues),
});

type ActorPlayer = v.InferOutput<typeof actorPlayerSchema>;

const actorSubmissionSchema = v.object({
  id: v.string(),
  spotifyTrackUrl: v.string(),
  note: v.nullable(v.string()),
  submittedAt: v.date(),
});

type ActorSubmission = v.InferOutput<typeof actorSubmissionSchema>;

const actorBallotSchema = v.object({
  ballotId: v.string(),
  submissionIds: v.array(v.string()),
});

type ActorBallot = v.InferOutput<typeof actorBallotSchema>;

const votingSubmissionSchema = v.object({
  id: v.string(),
  playerId: v.string(),
  spotifyTrackUrl: v.string(),
  note: v.nullable(v.string()),
});

type VotingSubmission = v.InferOutput<typeof votingSubmissionSchema>;

const roundResultSubmissionSchema = v.object({
  submissionId: v.string(),
  playerId: v.string(),
  spotifyTrackUrl: v.string(),
  starCount: v.number(),
});

const roundResultSchema = v.object({
  roundId: v.string(),
  roundNumber: v.number(),
  submissions: v.array(roundResultSubmissionSchema),
});

type RoundResult = v.InferOutput<typeof roundResultSchema>;

const standingSchema = v.object({
  playerId: v.string(),
  totalStars: v.number(),
});

type Standing = v.InferOutput<typeof standingSchema>;

export const getGameInputSchema = v.object({
  gameId: v.string(),
});
export type GetGameInput = v.InferOutput<typeof getGameInputSchema>;

export const getGameOutputSchema = v.nullable(
  v.object({
    id: v.string(),
    name: v.string(),
    description: v.nullable(v.string()),
    state: v.picklist(gameStateValues),
    submissionWindowDays: v.number(),
    votingWindowDays: v.number(),
    startedAt: v.nullable(v.date()),
    completedAt: v.nullable(v.date()),
    createdAt: v.date(),
    players: v.array(playerSchema),
    rounds: v.array(roundSchema),
    activeRound: v.nullable(activeRoundSchema),
    actorPlayer: actorPlayerSchema,
    actorSubmission: v.nullable(actorSubmissionSchema),
    actorBallot: v.nullable(actorBallotSchema),
    votingSubmissions: v.nullable(v.array(votingSubmissionSchema)),
    roundResults: v.array(roundResultSchema),
    standings: v.array(standingSchema),
  }),
);
export type GetGameOutput = v.InferOutput<typeof getGameOutputSchema>;

export const advanceRoundInputSchema = v.object({
  gameId: v.string(),
});
export type AdvanceRoundInput = v.InferOutput<typeof advanceRoundInputSchema>;

export const advanceRoundOutputSchema = v.object({
  roundId: v.string(),
  fromPhase: v.picklist(["submitting", "voting"]),
  toPhase: v.picklist(["voting", "scored"]),
  nextRoundId: v.nullable(v.string()),
  gameCompleted: v.boolean(),
});
export type AdvanceRoundOutput = v.InferOutput<typeof advanceRoundOutputSchema>;

export const saveBallotInputSchema = v.object({
  gameId: v.string(),
  submissionIds: v.pipe(v.array(v.string()), v.length(3, "Must star exactly 3 submissions")),
});
export type SaveBallotInput = v.InferOutput<typeof saveBallotInputSchema>;

export const saveBallotOutputSchema = v.object({
  ballotId: v.string(),
  roundId: v.string(),
  playerId: v.string(),
  gameId: v.string(),
  submissionIds: v.array(v.string()),
});
export type SaveBallotOutput = v.InferOutput<typeof saveBallotOutputSchema>;

export type {
  ActiveRound,
  ActorBallot,
  ActorPlayer,
  ActorSubmission,
  Player,
  Round,
  RoundResult,
  Standing,
  VotingSubmission,
};
