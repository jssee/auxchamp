import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import {
  acceptInviteProcedure,
  addRoundProcedure,
  createGameProcedure,
  invitePlayerProcedure,
  startGameProcedure,
  upsertSubmissionProcedure,
} from "../game/procedures";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
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
