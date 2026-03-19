import { requireSession } from "$lib/auth/utils.server";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ request, url }) => {
  const session = await requireSession(request, url, "sign-in-profile");

  return {
    user: session.user,
  };
};
