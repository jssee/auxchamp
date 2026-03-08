import { error } from "@sveltejs/kit";

import { createApi } from "$lib/server/api";

export const load = async ({ params, request }) => {
  const api = createApi(request);
  const game = await api.game.detail({ gameId: params.id });

  if (!game) {
    error(404, "Game not found");
  }

  return { game };
};
