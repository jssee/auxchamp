import { createAuthClient } from "better-auth/svelte";
import { Context } from "runed";
import type { Session } from ".";

export const authClient = createAuthClient();

/**
 * Auth context for sharing session state across components.
 * Set in root layout, access anywhere via `authContext.get()`.
 */
export const authContext = new Context<ReturnType<typeof authClient.useSession>>("auth");

export type { Session };
