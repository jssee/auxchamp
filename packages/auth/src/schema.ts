import * as v from "valibot";

import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH, USERNAME_PATTERN } from "./config";

export const signInSchema = v.object({
  email: v.pipe(v.string(), v.email("Invalid email address")),
  password: v.pipe(v.string(), v.minLength(1, "Password is required")),
});

export const signUpSchema = v.object({
  username: v.pipe(
    v.string(),
    v.minLength(USERNAME_MIN_LENGTH, `Username must be at least ${USERNAME_MIN_LENGTH} characters`),
    v.maxLength(USERNAME_MAX_LENGTH, `Username must be at most ${USERNAME_MAX_LENGTH} characters`),
    v.regex(
      USERNAME_PATTERN,
      "Username can only contain letters, numbers, underscores, and periods",
    ),
  ),
  name: v.pipe(
    v.string(),
    v.check(
      (value) => value.trim().length === 0 || value.trim().length >= 2,
      "Name must be at least 2 characters",
    ),
  ),
  email: v.pipe(v.string(), v.email("Invalid email address")),
  password: v.pipe(v.string(), v.minLength(8, "Password must be at least 8 characters")),
});
