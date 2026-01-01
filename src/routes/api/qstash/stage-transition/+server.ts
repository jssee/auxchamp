import { Receiver } from "@upstash/qstash";
import { env } from "$env/dynamic/private";
import { db } from "$lib/server/db";
import { battle, stage } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

type StageTransitionPayload = {
  battleId: string;
  stageId: string;
  stageNumber: number;
  action:
    | "submission_open"
    | "voting_open"
    | "stage_closed"
    | "battle_completed";
  expectedDeadline: string; // ISO timestamp
  idempotencyHash: string;
};

export const POST: RequestHandler = async ({ request }) => {
  if (!env.QSTASH_CURRENT_SIGNING_KEY || !env.QSTASH_NEXT_SIGNING_KEY) {
    console.error("QStash signing keys not configured");
    return new Response("Server configuration error", { status: 500 });
  }

  const receiver = new Receiver({
    currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
  });

  const body = await request.text();
  const signature = request.headers.get("upstash-signature");

  if (!signature) {
    return new Response("Missing signature", { status: 401 });
  }

  try {
    const isValid = await receiver.verify({
      signature,
      body,
    });

    if (!isValid) {
      return new Response("Invalid signature", { status: 401 });
    }
  } catch (err) {
    console.error("Signature verification failed:", err);
    return new Response("Signature verification failed", { status: 401 });
  }

  let payload: StageTransitionPayload;
  try {
    payload = JSON.parse(body) as StageTransitionPayload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  try {
    // Fetch battle with stages
    const currentBattle = await db.query.battle.findFirst({
      where: eq(battle.id, payload.battleId),
      with: { stages: true },
    });

    // Guard: Battle must exist and be active
    if (!currentBattle) {
      console.log(`Stage transition: Battle ${payload.battleId} not found`);
      return new Response("OK", { status: 200 });
    }
    if (currentBattle.status !== "active") {
      console.log(
        `Stage transition: Battle ${payload.battleId} not active (status: ${currentBattle.status})`,
      );
      return new Response("OK", { status: 200 });
    }

    // Guard: Stage must exist and match stageNumber
    const currentStage = currentBattle.stages.find(
      (s) => s.id === payload.stageId,
    );
    if (!currentStage) {
      console.log(`Stage transition: Stage ${payload.stageId} not found`);
      return new Response("OK", { status: 200 });
    }
    if (currentStage.stageNumber !== payload.stageNumber) {
      console.log(
        `Stage transition: Stage number mismatch (expected ${payload.stageNumber}, got ${currentStage.stageNumber})`,
      );
      return new Response("OK", { status: 200 });
    }

    // Guard: Don't process before deadline
    const now = new Date();
    const expectedDeadline = new Date(payload.expectedDeadline);
    if (now < expectedDeadline) {
      console.log(
        `Stage transition: Too early (now: ${now.toISOString()}, expected: ${payload.expectedDeadline})`,
      );
      return new Response("OK", { status: 200 });
    }

    // Handle each action
    switch (payload.action) {
      case "voting_open": {
        // Idempotency: skip if already in voting or later phase
        if (
          currentStage.phase === "voting" ||
          currentStage.phase === "closed"
        ) {
          console.log(
            `Stage transition: Stage ${payload.stageNumber} already in phase ${currentStage.phase}`,
          );
          return new Response("OK", { status: 200 });
        }
        await db
          .update(stage)
          .set({ phase: "voting" })
          .where(eq(stage.id, payload.stageId));
        console.log(
          `Stage ${payload.stageNumber} voting opened for battle ${payload.battleId}`,
        );
        break;
      }

      case "stage_closed": {
        // Idempotency: skip if already closed
        if (currentStage.phase === "closed") {
          console.log(
            `Stage transition: Stage ${payload.stageNumber} already closed`,
          );
          return new Response("OK", { status: 200 });
        }
        await db
          .update(stage)
          .set({ phase: "closed" })
          .where(eq(stage.id, payload.stageId));

        // Find next stage
        const nextStage = currentBattle.stages.find(
          (s) => s.stageNumber === payload.stageNumber + 1,
        );
        if (nextStage) {
          // Advance to next stage
          await db
            .update(battle)
            .set({ currentStageId: nextStage.id })
            .where(eq(battle.id, payload.battleId));
          await db
            .update(stage)
            .set({ phase: "submission" })
            .where(eq(stage.id, nextStage.id));
        }
        console.log(
          `Stage ${payload.stageNumber} closed for battle ${payload.battleId}`,
        );
        break;
      }

      case "battle_completed": {
        // Idempotency handled by guard: non-active battles (including completed) already returned
        await db
          .update(battle)
          .set({ status: "completed" })
          .where(eq(battle.id, payload.battleId));
        console.log(`Battle ${payload.battleId} completed`);
        break;
      }

      case "submission_open": {
        // Idempotency: skip if already in submission or later phase
        if (currentStage.phase !== "upcoming") {
          console.log(
            `Stage transition: Stage ${payload.stageNumber} already past upcoming phase`,
          );
          return new Response("OK", { status: 200 });
        }
        await db
          .update(stage)
          .set({ phase: "submission" })
          .where(eq(stage.id, payload.stageId));
        console.log(
          `Stage ${payload.stageNumber} submission opened for battle ${payload.battleId}`,
        );
        break;
      }
    }
  } catch (err) {
    // Log errors but still return 200 to prevent QStash retries for permanent failures
    console.error("Stage transition error:", err);
  }

  return new Response("OK", { status: 200 });
};
