import * as v from "valibot";
import { form, getRequestEvent } from "$app/server";
import { error, redirect } from "@sveltejs/kit";
import { BASE_ERROR_CODES } from "better-auth";
import { USERNAME_ERROR_CODES } from "better-auth/plugins/username";

import { auth } from "$lib/auth";
import { signInSchema, signUpSchema } from "@auxchamp/auth/schema";

export const signUp = form(signUpSchema, async (data, invalid) => {
  const { username, name, email, password } = data;
  const { url } = getRequestEvent();

  try {
    const normalizedName = normalizeOptionalString(name);

    await auth.api.signUpEmail({
      body: {
        username,
        name: normalizedName ?? username,
        email,
        password,
      },
    });
  } catch (err) {
    console.error(err);

    const code = getAuthErrorCode(err);
    const message = getAuthErrorMessage(err, "Sign up failed. Please try again.");

    if (code && SIGN_UP_USERNAME_ERROR_CODES.has(code)) {
      invalid.username(message);
    }

    if (code && SIGN_UP_EMAIL_ERROR_CODES.has(code)) {
      invalid.email(message);
    }

    invalid(message);
  }

  const redirectTo = url.searchParams.get("redirectTo");
  const safeRedirect = sanitizeRedirect(redirectTo, url, "/home");

  redirect(302, safeRedirect);
});

export const signOut = form(async () => {
  const { request, url } = getRequestEvent();

  try {
    await auth.api.signOut({
      headers: request.headers,
    });
  } catch (err) {
    console.error(err);
    return error(500, { message: "Something went wrong" });
  }

  const redirectTo = url.searchParams.get("redirectTo");
  const safeRedirect = sanitizeRedirect(redirectTo, url, "/");

  redirect(302, safeRedirect);
});

export const signIn = form(signInSchema, async (data, invalid) => {
  const { email, password } = data;
  const { url } = getRequestEvent();

  try {
    await auth.api.signInEmail({ body: { email, password } });
  } catch (err) {
    console.error(err);
    invalid(getAuthErrorMessage(err, "Sign in failed. Please try again."));
  }

  const redirectTo = url.searchParams.get("redirectTo");
  const safeRedirect = sanitizeRedirect(redirectTo, url, "/home");

  redirect(302, safeRedirect);
});

export const updatePassword = form(
  v.object({
    newPassword: v.pipe(v.string(), v.minLength(8, "Password must be at least 8 characters")),
    currentPassword: v.pipe(v.string()),
  }),
  async (data, invalid) => {
    const { newPassword, currentPassword } = data;
    const { request } = getRequestEvent();

    try {
      await auth.api.changePassword({
        body: { newPassword, currentPassword, revokeOtherSessions: true },
        headers: request.headers,
      });
    } catch (err) {
      console.error(err);
      invalid(getAuthErrorMessage(err, "Sign up failed. Please try again."));
    }

    redirect(302, "/signout");
  },
);

const SIGN_UP_USERNAME_ERROR_CODES: ReadonlySet<string> = new Set([
  USERNAME_ERROR_CODES.USERNAME_IS_ALREADY_TAKEN.code,
  USERNAME_ERROR_CODES.USERNAME_TOO_SHORT.code,
  USERNAME_ERROR_CODES.USERNAME_TOO_LONG.code,
  USERNAME_ERROR_CODES.INVALID_USERNAME.code,
]);

const SIGN_UP_EMAIL_ERROR_CODES: ReadonlySet<string> = new Set([
  BASE_ERROR_CODES.USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL.code,
  BASE_ERROR_CODES.INVALID_EMAIL.code,
]);

function getAuthErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  if ("body" in error && typeof error.body === "object" && error.body !== null) {
    const code = "code" in error.body ? error.body.code : null;

    if (typeof code === "string") {
      return code;
    }
  }

  const code = "code" in error ? error.code : null;
  return typeof code === "string" ? code : null;
}

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

function normalizeOptionalString(value: string | undefined) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

const sanitizeRedirect = (redirectTo: string | null, baseUrl: URL, fallback: string) => {
  if (!redirectTo) {
    return fallback;
  }
  if (redirectTo.startsWith("//") || redirectTo.startsWith("\\\\")) {
    return fallback;
  }

  try {
    const target = new URL(redirectTo, baseUrl);
    if (target.origin !== baseUrl.origin) {
      return fallback;
    }
    if (!target.pathname.startsWith("/")) {
      return fallback;
    }
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
};
