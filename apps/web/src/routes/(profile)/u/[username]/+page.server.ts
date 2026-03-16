import { error } from "@sveltejs/kit";

import { createApi } from "$lib/server/api";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, request }) => {
  const api = createApi(request);
  const profile = await api.getPublicProfile({ username: params.username });

  if (!profile) {
    error(404, "Profile not found");
  }

  return {
    profile,
  };
};
