import { command, form, getRequestEvent } from "$app/server";
import { redirect } from "@sveltejs/kit";

import {
  acceptInviteInputSchema,
  addRoundInputSchema,
  createGameInputSchema,
  invitePlayerInputSchema,
  saveSubmissionInputSchema,
  startGameInputSchema,
} from "@auxchamp/api/schema";
import { createApi } from "$lib/server/api";
import { rethrowAsIssue } from "$lib/server/rethrow-as-issue";

// Reuse the API input schemas so form validation and router validation drift together or not at all.

export const createGame = form(createGameInputSchema, async (input, issue) => {
  const api = createApi(getRequestEvent().request);

  try {
    const result = await api.createGame(input);
    redirect(303, `/games/${result.gameId}`);
  } catch (thrown) {
    rethrowAsIssue(thrown, issue.name("Unable to create game."));
  }
});

export const addRound = form(addRoundInputSchema, async (input, issue) => {
  const api = createApi(getRequestEvent().request);

  try {
    return await api.addRound(input);
  } catch (thrown) {
    rethrowAsIssue(thrown, issue.theme("Unable to add round."));
  }
});

export const invitePlayer = form(invitePlayerInputSchema, async (input, issue) => {
  const api = createApi(getRequestEvent().request);

  try {
    return await api.invitePlayer(input);
  } catch (thrown) {
    rethrowAsIssue(thrown, issue.targetUserEmail("Unable to invite player."));
  }
});

export const acceptInvite = command(acceptInviteInputSchema, async (input) => {
  const api = createApi(getRequestEvent().request);
  return api.acceptInvite(input);
});

export const startGame = command(startGameInputSchema, async (input) => {
  const api = createApi(getRequestEvent().request);
  return api.startGame(input);
});

export const saveSubmission = form(saveSubmissionInputSchema, async (input, issue) => {
  const api = createApi(getRequestEvent().request);

  try {
    return await api.saveSubmission(input);
  } catch (thrown) {
    rethrowAsIssue(thrown, issue.spotifyTrackUrl("Unable to submit this track right now."));
  }
});
