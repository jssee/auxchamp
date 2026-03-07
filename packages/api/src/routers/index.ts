import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import {
  acceptInviteProcedure,
  addRoundProcedure,
  createGameProcedure,
  invitePlayerProcedure,
  startGameProcedure,
  upsertSubmissionProcedure,
} from "../game/procedures";
import { getHealthCheck, getPrivateData } from "../queries";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return getHealthCheck();
  }),
  privateData: protectedProcedure.handler(({ context }) => {
    return getPrivateData(context.session);
  }),
  game: {
    create: createGameProcedure,
    addRound: addRoundProcedure,
    invitePlayer: invitePlayerProcedure,
    acceptInvite: acceptInviteProcedure,
    start: startGameProcedure,
    upsertSubmission: upsertSubmissionProcedure,
  },
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
