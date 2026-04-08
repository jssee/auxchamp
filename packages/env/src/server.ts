import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import * as v from "valibot";

export const env = createEnv({
  server: {
    DATABASE_URL: v.pipe(v.string(), v.minLength(1)),
    BETTER_AUTH_SECRET: v.pipe(v.string(), v.minLength(32)),
    BETTER_AUTH_URL: v.pipe(v.string(), v.url()),
    CORS_ORIGIN: v.pipe(v.string(), v.url()),
    NODE_ENV: v.optional(
      v.picklist(["development", "production", "test"]),
      "development",
    ),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
