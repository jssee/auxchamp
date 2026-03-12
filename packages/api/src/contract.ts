import { oc } from "@orpc/contract";

import {
  acceptInviteInputSchema,
  acceptInviteOutputSchema,
  addRoundInputSchema,
  addRoundOutputSchema,
  createGameInputSchema,
  createGameOutputSchema,
  getGameInputSchema,
  getGameOutputSchema,
  getPublicProfileInputSchema,
  getPublicProfileOutputSchema,
  healthOutputSchema,
  invitePlayerInputSchema,
  invitePlayerOutputSchema,
  saveSubmissionInputSchema,
  saveSubmissionOutputSchema,
  startGameInputSchema,
  startGameOutputSchema,
} from "./schema";

/**
 * Keep the contract definition small and declarative.
 *
 * `schema.ts` owns payload shapes so one source of truth can drive runtime validation,
 * inferred TypeScript types, and shared remote-function validation.
 * That split keeps public API review focused: procedure names change here, payload shapes change there.
 */
export const contract = {
  health: oc.output(healthOutputSchema),
  getPublicProfile: oc.input(getPublicProfileInputSchema).output(getPublicProfileOutputSchema),
  createGame: oc.input(createGameInputSchema).output(createGameOutputSchema),
  addRound: oc.input(addRoundInputSchema).output(addRoundOutputSchema),
  invitePlayer: oc.input(invitePlayerInputSchema).output(invitePlayerOutputSchema),
  acceptInvite: oc.input(acceptInviteInputSchema).output(acceptInviteOutputSchema),
  startGame: oc.input(startGameInputSchema).output(startGameOutputSchema),
  saveSubmission: oc.input(saveSubmissionInputSchema).output(saveSubmissionOutputSchema),
  getGame: oc.input(getGameInputSchema).output(getGameOutputSchema),
};
