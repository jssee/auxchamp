import { error, redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import * as z from "zod";

import { form, getRequestEvent } from "$app/server";
import { auth } from "$lib/auth";
import { db } from "$lib/server/db";
import { user } from "$lib/server/db/schema";

export const signUp = form(
  z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
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
  z.object({
    email: z.email().min(1, "Email is required"),
    password: z.string().min(1, "Password is required"),
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
