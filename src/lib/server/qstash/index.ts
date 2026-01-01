// Required env vars:
// QSTASH_TOKEN - from Upstash console
// QSTASH_CURRENT_SIGNING_KEY - for signature verification
// QSTASH_NEXT_SIGNING_KEY - for key rotation

import { Client } from "@upstash/qstash";
import { env } from "$env/dynamic/private";

if (!env.QSTASH_TOKEN) throw new Error("QSTASH_TOKEN is not set");

export const qstash = new Client({
  token: env.QSTASH_TOKEN,
});
