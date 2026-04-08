import { error, redirect } from "@sveltejs/kit";
import { ORPCError } from "@orpc/server";

import { createApi } from "$lib/server/api";

export const load = async ({ params, request, parent }) => {
  // Parent layout handles auth and game membership.
  const { game } = await parent();

  // Quick phase check from game data — avoids round fetch for non-scored rounds.
  const roundSummary = game.rounds.find(
    (r: { id: string }) => r.id === params.roundId,
  );

  if (!roundSummary) {
    error(404, "Round not found");
  }

  if (roundSummary.phase !== "scored") {
    redirect(303, `/g/${params.gameId}/r/${params.roundId}`);
  }

  // Fetch full round detail for scored results.
  const api = createApi(request);

  try {
    const round = await api.getRound({
      gameId: params.gameId,
      roundId: params.roundId,
    });

    if (!round) {
      error(404, "Round not found");
    }

    return { round };
  } catch (thrown) {
    if (thrown instanceof ORPCError && thrown.code === "UNAUTHORIZED") {
      redirect(303, "/signin");
    }

    throw thrown;
  }
};
