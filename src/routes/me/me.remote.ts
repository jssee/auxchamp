import { eq } from "drizzle-orm";
import * as v from "valibot";

import { getRequestEvent, form } from "$app/server";
import { db } from "$lib/server/db";
import { user } from "$lib/server/db/schema";

export const deleteMe = form(async (invalid) => {
  const { locals } = getRequestEvent();

  try {
    await db.delete(user).where(eq(user.id, locals.user.id));
  } catch (err) {
    console.error(err);
    invalid(err.message);
  }
});

const optionalString = (schema: v.GenericSchema<string>) =>
  v.pipe(
    v.string(),
    v.transform((s) => (s.trim() === "" ? undefined : s)),
    v.optional(schema),
  );

export const updateMe = form(
  v.pipe(
    v.object({
      name: optionalString(
        v.pipe(
          v.string(),
          v.minLength(3, "Username must be at least 3 characters"),
        ),
      ),
      email: optionalString(v.pipe(v.string(), v.email())),
    }),
    v.check(
      (input) => input.name !== undefined || input.email !== undefined,
      "At least one field must be provided",
    ),
  ),
  async (data, invalid) => {
    const { locals } = getRequestEvent();

    const updates = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined),
    );

    try {
      await db.update(user).set(updates).where(eq(user.id, locals.user.id));
    } catch (err) {
      console.error(err);
      invalid(err.message);
    }
  },
);
