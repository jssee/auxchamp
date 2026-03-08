import { error, redirect } from "@sveltejs/kit";
import { ORPCError } from "@orpc/server";

import { createApi } from "$lib/server/api";

export const load = async ({ params, request }) => {
  const api = createApi(request);

  try {
    const game = await api.game.detail({ gameId: params.id });

    if (!game) {
      error(404, "Game not found");
    }

    return { game };
  } catch (thrown) {
    if (thrown instanceof ORPCError && thrown.code === "UNAUTHORIZED") {
      redirect(303, "/login");
    }

    throw thrown;
  }
};
