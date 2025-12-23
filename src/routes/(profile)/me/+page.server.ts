import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ locals, url }) => {
  if (!locals.session) {
    const redirectTo = encodeURIComponent(url.pathname);
    redirect(307, `/signin?redirectTo=${redirectTo}`);
  }

  return {
    user: locals.user,
  };
};
