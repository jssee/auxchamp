import { ORPCError, type RouterClient } from "@orpc/server";
import { eq } from "drizzle-orm";

import { db } from "@auxchamp/db";
import { user } from "@auxchamp/db/schema/auth";
import {
  acceptInvite,
  addRound,
  createGame,
  invitePlayer,
  startGame,
  upsertSubmission,
} from "./mutation";
import { protectedProcedure, publicProcedure } from "./procedure";
import { getGameDetail } from "./query";

export const appRouter = publicProcedure.router({
  healthCheck: publicProcedure.healthCheck.handler(() => "OK"),
  createGame: protectedProcedure.createGame.handler(({ context, input }) => {
    return createGame(context.session.user.id, input);
  }),
  addRound: protectedProcedure.addRound.handler(({ context, input }) => {
    return addRound(context.session.user.id, input);
  }),
  invitePlayer: protectedProcedure.invitePlayer.handler(async ({ context, input }) => {
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
  }),
  acceptInvite: protectedProcedure.acceptInvite.handler(({ context, input }) => {
    return acceptInvite(context.session.user.id, input);
  }),
  startGame: protectedProcedure.startGame.handler(({ context, input }) => {
    return startGame(context.session.user.id, input);
  }),
  upsertSubmission: protectedProcedure.upsertSubmission.handler(({ context, input }) => {
    return upsertSubmission(context.session.user.id, input);
  }),
  getGameDetail: protectedProcedure.getGameDetail.handler(({ context, input }) => {
    return getGameDetail(context.session.user.id, input.gameId);
  }),
});

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
