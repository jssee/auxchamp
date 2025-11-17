import { error, redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import * as v from "valibot";

import { form, query, getRequestEvent } from "$app/server";
import { auth } from "$lib/auth";
import { db } from "$lib/server/db";
import { user } from "$lib/server/db/schema";

export const signUp = form(
  v.object({
    username: v.pipe(
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
    const { username, email, password } = data;

    try {
      const existingUsername = await db.query.user.findFirst({
        where: eq(user.name, username),
      });

      if (existingUsername) {
        invalid(invalid.username("Username already taken"));
      }

      await auth.api.signUpEmail({ body: { name: username, email, password } });
    } catch (err) {
      console.error(err);
      invalid(err.body.message);
    }

    redirect(302, "/");
  },
);

export const signOut = form(async () => {
  const { request } = getRequestEvent();
  try {
    await auth.api.signOut({
      headers: request.headers,
    });
  } catch (err) {
    console.error(err);
    return error(500, { message: "Something went wrong" });
  }
  redirect(302, "/signin");
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
    try {
      await auth.api.signInEmail({ body: { email, password } });
    } catch (err) {
      console.error(err);
      invalid(err.body.message);
    }

    redirect(302, "/");
  },
);
