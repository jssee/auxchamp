import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import * as v from "valibot";

import { db } from "@auxchamp/db";
import { user } from "@auxchamp/db/schema/auth";
import { protectedProcedure } from "../index";
import {
  acceptInvite,
  addRound,
  createGame,
  invitePlayer,
  startGame,
  upsertSubmission,
} from "./commands";
import { getGameDetail } from "./queries";

const createGameSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "Name is required")),
  description: v.optional(v.nullable(v.string())),
  submissionWindowDays: v.pipe(v.number(), v.integer(), v.minValue(1)),
  votingWindowDays: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

const addRoundSchema = v.object({
  gameId: v.string(),
  theme: v.pipe(v.string(), v.minLength(1, "Theme is required")),
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
  targetUserEmail: v.pipe(v.string(), v.email()),
});

export const invitePlayerProcedure = protectedProcedure
  .input(invitePlayerSchema)
  .handler(async ({ context, input }) => {
    const [targetUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, input.targetUserEmail))
      .limit(1);

    if (!targetUser) {
      throw new ORPCError("NOT_FOUND", { message: "No user found with that email." });
    }

    return invitePlayer(context.session.user.id, {
      gameId: input.gameId,
      targetUserId: targetUser.id,
    });
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
  spotifyTrackUrl: v.pipe(
    v.string(),
    v.url(),
    v.check(isSpotifyTrackUrl, "Must be a Spotify track URL"),
  ),
  note: v.optional(v.nullable(v.string())),
});

function isSpotifyTrackUrl(input: string) {
  try {
    const url = new URL(input);
    const pathSegments = url.pathname.split("/").filter(Boolean);

    return (
      url.protocol === "https:" &&
      url.hostname === "open.spotify.com" &&
      pathSegments[0] === "track" &&
      typeof pathSegments[1] === "string" &&
      pathSegments[1].length > 0
    );
  } catch {
    return false;
  }
}

export const upsertSubmissionProcedure = protectedProcedure
  .input(upsertSubmissionSchema)
  .handler(({ context, input }) => {
    return upsertSubmission(context.session.user.id, input);
  });

const getGameDetailSchema = v.object({
  gameId: v.string(),
});

export const getGameDetailProcedure = protectedProcedure
  .input(getGameDetailSchema)
  .handler(({ context, input }) => {
    return getGameDetail(context.session.user.id, input.gameId);
  });
