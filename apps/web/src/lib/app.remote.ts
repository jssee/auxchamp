import { command, getRequestEvent } from "$app/server";

import { signInSchema, signUpSchema } from "./auth-schemas";
import { auth } from "./auth";

export const signIn = command(signInSchema, async (credentials) => {
  try {
    await auth.api.signInEmail({
      body: credentials,
      headers: getRequestEvent().request.headers,
    });

    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      message: getAuthErrorMessage(error, "Sign in failed. Please try again."),
    };
  }
});

export const signUp = command(signUpSchema, async (payload) => {
  try {
    await auth.api.signUpEmail({
      body: payload,
      headers: getRequestEvent().request.headers,
    });

    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      message: getAuthErrorMessage(error, "Sign up failed. Please try again."),
    };
  }
});

function getAuthErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const maybeMessage =
      "body" in error &&
      typeof error.body === "object" &&
      error.body !== null &&
      "message" in error.body &&
      typeof error.body.message === "string"
        ? error.body.message
        : "message" in error && typeof error.message === "string"
          ? error.message
          : null;

    if (maybeMessage) {
      return maybeMessage;
    }
  }

  return fallback;
}
