import { requireSession } from "$lib/auth/utils.server";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ request, url }) => {
  await requireSession(request, url, "Sign in to create a game");
};
