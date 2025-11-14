import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { sveltekitCookies } from "better-auth/svelte-kit";

import { getRequestEvent } from "$app/server";
import { db } from "$lib/server/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  // NOTE: sveltekitCookies() should always be the last plugin
  plugins: [sveltekitCookies(getRequestEvent)],
});

export type Session = typeof auth.$Infer.Session;
