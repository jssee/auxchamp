import { auth } from "@auxchamp/auth";
import { redirect } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ request, url }) => {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    const redirectTo = `${url.pathname}${url.search}`;
    const params = new URLSearchParams({
      redirectTo,
      message: "Sign in to create a game",
    });
    redirect(303, `/signin?${params}`);
  }
};
