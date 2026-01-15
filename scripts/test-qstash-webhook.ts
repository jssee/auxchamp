/**
 * QStash webhook test simulator
 *
 * Signs payloads like QStash does (JWT) and POSTs to local endpoint.
 * Usage: bun scripts/test-qstash-webhook.ts <action> <stageId> [battleId]
 *
 * Actions: voting_open, stage_closed, battle_completed, submission_open
 */

import * as jose from "jose";

const ENDPOINT = "http://127.0.0.1:5173/api/qstash/stage-transition";

type StageAction =
  | "voting_open"
  | "stage_closed"
  | "battle_completed"
  | "submission_open";

async function createQStashSignature(
  signingKey: string,
  body: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = encoder.encode(signingKey);

  const jwt = await new jose.SignJWT({
    iss: "Upstash",
    sub: ENDPOINT,
    exp: Math.floor(Date.now() / 1000) + 300, // 5 min expiry
    nbf: Math.floor(Date.now() / 1000),
    iat: Math.floor(Date.now() / 1000),
    jti: crypto.randomUUID(),
    body: await hashBody(body),
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .sign(key);

  return jwt;
}

async function hashBody(body: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(body);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  // Base64url encode (no padding)
  const base64 = Buffer.from(hashBuffer).toString("base64url");
  return base64;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.log("Usage: bun scripts/test-qstash-webhook.ts <action> <stageId> <battleId> [stageNumber]");
    console.log("Actions: voting_open, stage_closed, battle_completed, submission_open");
    process.exit(1);
  }

  const action = args[0] as StageAction;
  const stageId = args[1];
  const battleId = args[2];
  const stageNumber = parseInt(args[3] || "1", 10);

  const signingKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  if (!signingKey) {
    console.error("Error: QSTASH_CURRENT_SIGNING_KEY not set");
    console.log("Set it in your .env file or pass via environment");
    process.exit(1);
  }

  const payload = {
    battleId,
    stageId,
    stageNumber,
    action,
    expectedDeadline: new Date().toISOString(),
    idempotencyHash: crypto.randomUUID(),
  };

  const body = JSON.stringify(payload);
  const signature = await createQStashSignature(signingKey, body);

  console.log("Sending webhook to:", ENDPOINT);
  console.log("Action:", action);
  console.log("Payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "upstash-signature": signature,
      },
      body,
    });

    const text = await response.text();
    console.log("\nResponse:", response.status, text);
  } catch (err) {
    console.error("Request failed:", err);
    process.exit(1);
  }
}

main();
