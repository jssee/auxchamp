import { error, redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import * as v from "valibot";

import { form, getRequestEvent } from "$app/server";
import { auth } from "$lib/auth";
import { db } from "$lib/server/db";
import { user } from "$lib/server/db/schema";

const sanitizeRedirect = (
  redirectTo: string | null,
  baseUrl: URL,
  fallback: string,
) => {
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

export const signUp = form(
  v.object({
    name: v.pipe(
      v.string(),
      v.minLength(3, "Username must be at least 3 characters"),
    ),
    email: v.pipe(v.string(), v.email()),
    password: v.pipe(
      v.string(),
      v.minLength(8, "Password must be at least 8 characters"),
    ),
  }),
  async (data, invalid) => {
    const { name, email, password } = data;
    const { url } = getRequestEvent();

    try {
      const existingUsername = await db.query.user.findFirst({
        where: eq(user.name, name),
      });

      if (existingUsername) {
        invalid("Username already taken");
      }

      await auth.api.signUpEmail({ body: { name, email, password } });
    } catch (err) {
      console.error(err);
      invalid((err as any)?.body?.message || "Signup failed");
    }
    const redirectTo = url.searchParams.get("redirectTo");
    const safeRedirect = sanitizeRedirect(redirectTo, url, "/home");

    redirect(302, safeRedirect);
  },
);

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

export const signIn = form(
  v.object({
    email: v.pipe(v.string(), v.email()),
    password: v.pipe(
      v.string(),
      v.minLength(8, "Password must be at least 8 characters"),
    ),
  }),
  async (data, invalid) => {
    const { email, password } = data;
    const { url } = getRequestEvent();

    try {
      await auth.api.signInEmail({ body: { email, password } });
    } catch (err) {
      console.error(err);
      invalid((err as any)?.body?.message || "Sign in failed");
    }
    const redirectTo = url.searchParams.get("redirectTo");
    const safeRedirect = sanitizeRedirect(redirectTo, url, "/home");

    redirect(302, safeRedirect);
  },
);

export const updatePassword = form(
  v.object({
    newPassword: v.pipe(
      v.string(),
      v.minLength(8, "Password must be at least 8 characters"),
    ),
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
      invalid((err as any)?.body?.message || "Password change failed");
    }

    redirect(302, "/signout");
  },
);
