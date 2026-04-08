import { createEnv } from "@t3-oss/env-core";
import * as v from "valibot";

export const env = createEnv({
  clientPrefix: "PUBLIC_",
  client: {
    PUBLIC_SERVER_URL: v.pipe(v.string(), v.url()),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
