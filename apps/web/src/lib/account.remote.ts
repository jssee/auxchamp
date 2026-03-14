import { form, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { BASE_ERROR_CODES } from "@better-auth/core/error";
import { USERNAME_ERROR_CODES } from "better-auth/plugins/username";

import { auth } from "$lib/auth";
import {
  changeEmailSchema,
  changePasswordSchema,
  updateProfileSchema,
} from "@auxchamp/auth/schema";
import { getAuthErrorCode, getAuthErrorMessage, normalizeOptionalString } from "$lib/auth/utils";

const PROFILE_USERNAME_ERROR_CODES: ReadonlySet<string> = new Set([
  USERNAME_ERROR_CODES.USERNAME_IS_ALREADY_TAKEN.code,
  USERNAME_ERROR_CODES.USERNAME_TOO_SHORT.code,
  USERNAME_ERROR_CODES.USERNAME_TOO_LONG.code,
  USERNAME_ERROR_CODES.INVALID_USERNAME.code,
]);

const EMAIL_ERROR_CODES: ReadonlySet<string> = new Set([
  BASE_ERROR_CODES.USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL.code,
  BASE_ERROR_CODES.INVALID_EMAIL.code,
]);

export const updateProfile = form(updateProfileSchema, async (data, invalid) => {
  const { request } = getRequestEvent();
  const normalizedName = normalizeOptionalString(data.name);

  try {
    await auth.api.updateUser({
      body: {
        username: data.username,
        name: normalizedName ?? data.username,
      },
      headers: request.headers,
    });
  } catch (err) {
    console.error(err);

    const code = getAuthErrorCode(err);
    const message = getAuthErrorMessage(err, "Profile update failed. Please try again.");

    if (code && PROFILE_USERNAME_ERROR_CODES.has(code)) {
      invalid.username(message);
    }

    invalid(message);
  }

  return {
    message: "Profile updated.",
    username: data.username,
    name: normalizedName ?? data.username,
  };
});

export const updateEmail = form(changeEmailSchema, async (data, invalid) => {
  const { request } = getRequestEvent();
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    error(401, { message: "You must be signed in to change your email." });
  }

  if (session.user.emailVerified) {
    invalid(
      "Email changes require verification. Replace this minimal flow once email delivery exists.",
    );
  }

  try {
    await auth.api.changeEmail({
      body: {
        newEmail: data.email,
      },
      headers: request.headers,
    });
  } catch (err) {
    console.error(err);

    const code = getAuthErrorCode(err);
    const message = getAuthErrorMessage(err, "Email update failed. Please try again.");

    if (code && EMAIL_ERROR_CODES.has(code)) {
      invalid.email(message);
    }

    invalid(message);
  }

  return {
    message: "Email updated.",
    email: data.email,
  };
});

export const updatePassword = form(changePasswordSchema, async (data, invalid) => {
  const { request } = getRequestEvent();

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        revokeOtherSessions: true,
      },
      headers: request.headers,
    });
  } catch (err) {
    console.error(err);
    invalid(getAuthErrorMessage(err, "Password update failed. Please try again."));
  }

  return {
    message: "Password updated.",
  };
});
