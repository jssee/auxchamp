import { form, getRequestEvent } from "$app/server";
import { error, invalid, redirect } from "@sveltejs/kit";

import { auth } from "$lib/auth";
import {
  EMAIL_AUTH_ERROR_CODES,
  USERNAME_AUTH_ERROR_CODES,
  getAuthErrorCode,
  getAuthErrorMessage,
} from "@auxchamp/auth/errors";
import { signInSchema, signUpSchema } from "@auxchamp/auth/schema";
import { normalizeOptionalString } from "$lib/auth/utils.server";

export const signUp = form(signUpSchema, async (data, issue) => {
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

    if (code && USERNAME_AUTH_ERROR_CODES.has(code)) {
      invalid(issue.username(message));
    }

    if (code && EMAIL_AUTH_ERROR_CODES.has(code)) {
      invalid(issue.email(message));
    }

    invalid(message);
  }

  const redirectTo = url.searchParams.get("redirectTo");
  const safeRedirect = sanitizeRedirect(redirectTo, url, "/");

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

export const signIn = form(signInSchema, async (data, _issue) => {
  const { email, password } = data;
  const { url } = getRequestEvent();

  try {
    await auth.api.signInEmail({ body: { email, password } });
  } catch (err) {
    console.error(err);
    invalid(getAuthErrorMessage(err, "Sign in failed. Please try again."));
  }

  const redirectTo = url.searchParams.get("redirectTo");
  const safeRedirect = sanitizeRedirect(redirectTo, url, "/");

  redirect(302, safeRedirect);
});

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
