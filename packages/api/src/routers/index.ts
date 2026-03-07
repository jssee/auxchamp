import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { addRoundProcedure, createGameProcedure } from "../game/procedures";
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
  },
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
