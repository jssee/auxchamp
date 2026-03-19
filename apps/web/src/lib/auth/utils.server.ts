import { auth } from "@auxchamp/auth";
import { redirect } from "@sveltejs/kit";

import type { AuthMessageCode } from "./messages";

/**
 * Require an authenticated session. Redirects to /signin if
 * unauthenticated, preserving the original URL as a return path.
 *
 * `messageCode` is a key into AUTH_MESSAGES — the client resolves it
 * to a static display string so arbitrary text never reaches the UI.
 */
export async function requireSession(request: Request, url: URL, messageCode?: AuthMessageCode) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    const params = new URLSearchParams({
      redirectTo: `${url.pathname}${url.search}`,
      ...(messageCode && { message: messageCode }),
    });
    redirect(303, `/signin?${params}`);
  }

  return session;
}
