import { oc } from "@orpc/contract";
import * as v from "valibot";

import { isSpotifyTrackUrl } from "./util";

const createGameInputSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "Name is required")),
  description: v.optional(v.nullable(v.string())),
  submissionWindowDays: v.pipe(v.number(), v.integer(), v.minValue(1)),
  votingWindowDays: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

const createGameOutputSchema = v.object({
  gameId: v.string(),
  creatorPlayerId: v.string(),
});

const addRoundInputSchema = v.object({
  gameId: v.string(),
  theme: v.pipe(v.string(), v.minLength(1, "Theme is required")),
  description: v.optional(v.nullable(v.string())),
});

const addRoundOutputSchema = v.object({
  roundId: v.string(),
  gameId: v.string(),
  number: v.number(),
  theme: v.string(),
  description: v.nullable(v.string()),
});

const invitePlayerInputSchema = v.object({
  gameId: v.string(),
  targetUserEmail: v.pipe(v.string(), v.email()),
});

const invitePlayerOutputSchema = v.object({
  playerId: v.string(),
  gameId: v.string(),
  userId: v.string(),
  status: v.literal("invited"),
});

const acceptInviteInputSchema = v.object({
  gameId: v.string(),
});

const acceptInviteOutputSchema = v.object({
  playerId: v.string(),
  gameId: v.string(),
  userId: v.string(),
  status: v.literal("active"),
});

const startGameInputSchema = v.object({
  gameId: v.string(),
});

const startGameOutputSchema = v.object({
  gameId: v.string(),
  state: v.literal("active"),
  startedAt: v.date(),
  openRoundId: v.string(),
});

const upsertSubmissionInputSchema = v.object({
  gameId: v.string(),
  spotifyTrackUrl: v.pipe(
    v.string(),
    v.url(),
    v.check(isSpotifyTrackUrl, "Must be a Spotify track URL"),
  ),
  note: v.optional(v.nullable(v.string())),
});

const upsertSubmissionOutputSchema = v.object({
  submissionId: v.string(),
  playerId: v.string(),
  roundId: v.string(),
  gameId: v.string(),
  spotifyTrackUrl: v.string(),
  note: v.nullable(v.string()),
});

const playerSchema = v.object({
  id: v.string(),
  userId: v.string(),
  userName: v.string(),
  userImage: v.nullable(v.string()),
  role: v.picklist(["creator", "player"]),
  status: v.picklist(["invited", "active", "left", "removed"]),
});

const roundSchema = v.object({
  id: v.string(),
  number: v.number(),
  theme: v.string(),
  description: v.nullable(v.string()),
  phase: v.picklist(["pending", "submitting", "voting", "scored"]),
  submissionOpensAt: v.nullable(v.date()),
  submissionClosesAt: v.nullable(v.date()),
  submissionCount: v.number(),
});

const activeRoundSchema = v.object({
  id: v.string(),
  number: v.number(),
  theme: v.string(),
  description: v.nullable(v.string()),
  phase: v.picklist(["pending", "submitting", "voting", "scored"]),
  submissionOpensAt: v.nullable(v.date()),
  submissionClosesAt: v.nullable(v.date()),
});

const actorPlayerSchema = v.object({
  id: v.string(),
  role: v.picklist(["creator", "player"]),
  status: v.picklist(["invited", "active", "left", "removed"]),
});

const actorSubmissionSchema = v.object({
  id: v.string(),
  spotifyTrackUrl: v.string(),
  note: v.nullable(v.string()),
  submittedAt: v.date(),
});

const getGameDetailInputSchema = v.object({
  gameId: v.string(),
});

const getGameDetailOutputSchema = v.nullable(
  v.object({
    id: v.string(),
    name: v.string(),
    description: v.nullable(v.string()),
    state: v.picklist(["draft", "active", "completed"]),
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
  }),
);

export const contract = {
  healthCheck: oc.output(v.literal("OK")),
  createGame: oc.input(createGameInputSchema).output(createGameOutputSchema),
  addRound: oc.input(addRoundInputSchema).output(addRoundOutputSchema),
  invitePlayer: oc.input(invitePlayerInputSchema).output(invitePlayerOutputSchema),
  acceptInvite: oc.input(acceptInviteInputSchema).output(acceptInviteOutputSchema),
  startGame: oc.input(startGameInputSchema).output(startGameOutputSchema),
  upsertSubmission: oc.input(upsertSubmissionInputSchema).output(upsertSubmissionOutputSchema),
  getGameDetail: oc.input(getGameDetailInputSchema).output(getGameDetailOutputSchema),
};
