import * as v from "valibot";

import { protectedProcedure } from "../index";
import { createGame, addRound } from "./commands";

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
