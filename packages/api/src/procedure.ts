import { ORPCError, implement } from "@orpc/server";

import { contract } from "./contract";
import type { Context } from "./context";

export const publicProcedure = implement(contract).$context<Context>();

const requireAuth = publicProcedure.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return next({
    context: {
      session: context.session,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth);
