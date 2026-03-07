import * as v from "valibot";

import { protectedProcedure } from "../index";
import {
  acceptInvite,
  addRound,
  createGame,
  invitePlayer,
  startGame,
  upsertSubmission,
} from "./commands";

const createGameSchema = v.object({
  name: v.string(),
  description: v.optional(v.nullable(v.string())),
  submissionWindowDays: v.pipe(v.number(), v.integer(), v.minValue(1)),
  votingWindowDays: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

const addRoundSchema = v.object({
  gameId: v.string(),
  theme: v.string(),
  description: v.optional(v.nullable(v.string())),
});

export const createGameProcedure = protectedProcedure
  .input(createGameSchema)
  .handler(({ context, input }) => {
    return createGame(context.session.user.id, input);
  });

export const addRoundProcedure = protectedProcedure
  .input(addRoundSchema)
  .handler(({ context, input }) => {
    return addRound(context.session.user.id, input);
  });

const invitePlayerSchema = v.object({
  gameId: v.string(),
  targetUserId: v.string(),
});

export const invitePlayerProcedure = protectedProcedure
  .input(invitePlayerSchema)
  .handler(({ context, input }) => {
    return invitePlayer(context.session.user.id, input);
  });

const acceptInviteSchema = v.object({
  gameId: v.string(),
});

export const acceptInviteProcedure = protectedProcedure
  .input(acceptInviteSchema)
  .handler(({ context, input }) => {
    return acceptInvite(context.session.user.id, input);
  });

const startGameSchema = v.object({
  gameId: v.string(),
});

export const startGameProcedure = protectedProcedure
  .input(startGameSchema)
  .handler(({ context, input }) => {
    return startGame(context.session.user.id, input);
  });

const upsertSubmissionSchema = v.object({
  gameId: v.string(),
  spotifyTrackUrl: v.pipe(v.string(), v.url()),
  note: v.optional(v.nullable(v.string())),
});

export const upsertSubmissionProcedure = protectedProcedure
  .input(upsertSubmissionSchema)
  .handler(({ context, input }) => {
    return upsertSubmission(context.session.user.id, input);
  });
