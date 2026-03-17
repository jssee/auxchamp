import { auth } from "@auxchamp/auth";
import { redirect } from "@sveltejs/kit";

/**
 * Require an authenticated session. Redirects to /signin if
 * unauthenticated, preserving the original URL as a return path.
 */
export async function requireSession(request: Request, url: URL, message?: string) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    const params = new URLSearchParams({
      redirectTo: `${url.pathname}${url.search}`,
      ...(message && { message }),
    });
    redirect(303, `/signin?${params}`);
  }

  return session;
}
