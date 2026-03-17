import { requireSession } from "$lib/server/auth";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ request, url }) => {
  const session = await requireSession(request, url);

  return {
    user: session.user,
  };
};
