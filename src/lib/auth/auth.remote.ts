import { error, redirect } from "@sveltejs/kit";
import * as z from "zod";

import { form } from "$app/server";
import { auth } from "$lib/auth";

export const signUp = form(
  z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
  }),
  async (data) => {
    const { username, email, password } = data;
    try {
      await auth.api.signUpEmail({ body: { name: username, email, password } });
    } catch (err) {
      console.error(err);
      return error(500, { message: "Something went wrong" });
    }

    redirect(302, "/");
  },
);
