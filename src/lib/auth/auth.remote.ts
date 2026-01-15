import { error, redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import * as v from "valibot";

import { form, getRequestEvent } from "$app/server";
import { auth } from "$lib/auth";
import { db } from "$lib/server/db";
import { user } from "$lib/server/db/schema";

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
        invalid(invalid.name("Username already taken"));
      }

      await auth.api.signUpEmail({ body: { name, email, password } });
    } catch (err) {
      console.error(err);
      invalid(err.body.message);
    }
    const redirectTo = url.searchParams.get("redirectTo");
    const safeRedirect = redirectTo?.startsWith("/") ? redirectTo : "/home";

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
  const safeRedirect = redirectTo?.startsWith("/") ? redirectTo : "/";

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
      invalid(err.body.message);
    }
    const redirectTo = url.searchParams.get("redirectTo");
    const safeRedirect = redirectTo?.startsWith("/") ? redirectTo : "/home";

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
      invalid(err.body.message);
    }

    redirect(302, "/signout");
  },
);
