// Required env vars:
// QSTASH_TOKEN - from Upstash console
// QSTASH_CURRENT_SIGNING_KEY - for signature verification
// QSTASH_NEXT_SIGNING_KEY - for key rotation

import { Client } from "@upstash/qstash";
import { env } from "$env/dynamic/private";
import { dev } from "$app/environment";
import type { QStashJobRef } from "$lib/server/db/schema";

if (!env.QSTASH_TOKEN) throw new Error("QSTASH_TOKEN is not set");

export const qstash = new Client({
  token: env.QSTASH_TOKEN,
});

type StageAction = "voting_open" | "stage_closed" | "battle_completed";

type ScheduleStageTransitionParams = {
  baseUrl: string;
  battleId: string;
  stageId: string;
  stageNumber: number;
  action: StageAction;
  scheduledFor: Date;
};

/**
 * Schedule a stage transition via QStash.
 * Returns null in dev mode (QStash can't reach localhost).
 */
export async function scheduleStageTransition({
  baseUrl,
  battleId,
  stageId,
  stageNumber,
  action,
  scheduledFor,
}: ScheduleStageTransitionParams): Promise<QStashJobRef | null> {
  if (dev) return null;

  const result = await qstash.publishJSON({
    url: `${baseUrl}/api/qstash/stage-transition`,
    notBefore: Math.floor(scheduledFor.getTime() / 1000),
    body: {
      battleId,
      stageId,
      stageNumber,
      action,
      expectedDeadline: scheduledFor.toISOString(),
      idempotencyHash: crypto.randomUUID(),
    },
  });

  return { action, messageId: result.messageId };
}

/**
 * Cancel a QStash job. Silently handles already-delivered jobs.
 */
export async function cancelJob(messageId: string): Promise<void> {
  if (dev) return;

  try {
    await qstash.messages.delete(messageId);
  } catch (err) {
    // Job may already be delivered or not exist
    console.warn(`Failed to cancel QStash job ${messageId}:`, err);
  }
}
