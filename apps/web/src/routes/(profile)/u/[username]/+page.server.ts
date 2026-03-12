import { error, redirect } from "@sveltejs/kit";

import { createApi } from "$lib/server/api";

export const load = async ({ params, request }) => {
  const username = params.username.toLowerCase();

  if (username !== params.username) {
    redirect(308, `/u/${username}`);
  }

  const api = createApi(request);
  const profile = await api.getPublicProfile({ username });

  if (!profile) {
    error(404, "Profile not found");
  }

  return { profile };
};
