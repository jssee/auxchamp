import { redirect } from "@sveltejs/kit";

import { auth } from "$lib/auth";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, request }) => {
  if (locals.session) {
    await auth.api.signOut({ headers: request.headers });
  }
  redirect(302, "/signin");
};
