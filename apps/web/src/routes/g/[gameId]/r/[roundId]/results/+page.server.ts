import { error, redirect } from "@sveltejs/kit";
import { ORPCError } from "@orpc/server";

import { createApi } from "$lib/server/api";

export const load = async ({ params, request }) => {
  const api = createApi(request);

  try {
    const round = await api.getRound({
      gameId: params.gameId,
      roundId: params.roundId,
    });

    if (!round) {
      error(404, "Round not found");
    }

    if (round.phase !== "scored") {
      redirect(303, `/g/${params.gameId}/r/${params.roundId}`);
    }

    return { round };
  } catch (thrown) {
    if (thrown instanceof ORPCError && thrown.code === "UNAUTHORIZED") {
      redirect(303, "/signin");
    }

    throw thrown;
  }
};
