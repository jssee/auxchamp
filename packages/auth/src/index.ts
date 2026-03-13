import { db } from "@auxchamp/db";
import * as schema from "@auxchamp/db/schema/auth";
import { env } from "@auxchamp/env/server";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins/username";

import {
  normalizeUsername,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from "./config";

type CreateAuthOptions = Pick<BetterAuthOptions, "plugins">;

export function createAuth({ plugins = [] }: CreateAuthOptions = {}) {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
    }),
    trustedOrigins: [env.CORS_ORIGIN],
    emailAndPassword: {
      enabled: true,
    },
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },
    plugins: [
      username({
        minUsernameLength: USERNAME_MIN_LENGTH,
        maxUsernameLength: USERNAME_MAX_LENGTH,
        usernameNormalization: normalizeUsername,
        usernameValidator: (candidate) => USERNAME_PATTERN.test(candidate),
      }),
      ...plugins,
    ],
  });
}

export const auth = createAuth();
