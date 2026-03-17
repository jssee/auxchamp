import * as v from "valibot";

import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH, USERNAME_PATTERN } from "./username";

const usernameSchema = v.pipe(
  v.string(),
  v.minLength(USERNAME_MIN_LENGTH, `Username must be at least ${USERNAME_MIN_LENGTH} characters`),
  v.maxLength(USERNAME_MAX_LENGTH, `Username must be at most ${USERNAME_MAX_LENGTH} characters`),
  v.regex(USERNAME_PATTERN, "Username can only contain letters, numbers, underscores, and periods"),
);

const nameSchema = v.pipe(
  v.string(),
  v.check(
    (value) => value.trim().length === 0 || value.trim().length >= 2,
    "Name must be at least 2 characters",
  ),
);

const emailSchema = v.pipe(v.string(), v.email("Invalid email address"));

const passwordSchema = v.pipe(v.string(), v.minLength(8, "Password must be at least 8 characters"));

export const signInSchema = v.object({
  email: emailSchema,
  password: v.pipe(v.string(), v.minLength(1, "Password is required")),
});

export const signUpSchema = v.object({
  username: usernameSchema,
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const updateProfileSchema = v.object({
  username: usernameSchema,
  name: nameSchema,
});

export const changeEmailSchema = v.object({
  email: emailSchema,
});

export const changePasswordSchema = v.object({
  currentPassword: v.pipe(v.string(), v.minLength(1, "Current password is required")),
  newPassword: passwordSchema,
});
