import { form, getRequestEvent } from "$app/server";
import { error, invalid } from "@sveltejs/kit";

import { auth } from "$lib/auth";
import {
  EMAIL_AUTH_ERROR_CODES,
  USERNAME_AUTH_ERROR_CODES,
  getAuthErrorCode,
  getAuthErrorMessage,
} from "@auxchamp/auth/errors";
import {
  changeEmailSchema,
  changePasswordSchema,
  updateProfileSchema,
} from "@auxchamp/auth/schema";
import { normalizeOptionalString } from "$lib/auth/utils.server";

export const updateProfile = form(updateProfileSchema, async (data, issue) => {
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

    if (code && USERNAME_AUTH_ERROR_CODES.has(code)) {
      invalid(issue.username(message));
    }

    invalid(message);
  }

  return {
    message: "Profile updated.",
    username: data.username,
    displayUsername: data.username,
    name: normalizedName ?? data.username,
  };
});

export const updateEmail = form(changeEmailSchema, async (data, issue) => {
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

    if (code && EMAIL_AUTH_ERROR_CODES.has(code)) {
      invalid(issue.email(message));
    }

    invalid(message);
  }

  return {
    message: "Email updated.",
    email: data.email,
  };
});

export const updatePassword = form(changePasswordSchema, async (data) => {
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
