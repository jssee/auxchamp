import { getRequestEvent } from "$app/server";
import { createAuth } from "@auxchamp/auth";
import { sveltekitCookies } from "better-auth/svelte-kit";

export const auth = createAuth({
  // Keep SvelteKit coupling in the app; shared auth stays framework-agnostic.
  plugins: [sveltekitCookies(getRequestEvent)],
});
