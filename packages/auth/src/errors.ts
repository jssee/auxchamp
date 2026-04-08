import { BASE_ERROR_CODES } from "@better-auth/core/error";
import { USERNAME_ERROR_CODES } from "better-auth/plugins/username";

export const USERNAME_AUTH_ERROR_CODES: ReadonlySet<string> = new Set([
  USERNAME_ERROR_CODES.USERNAME_IS_ALREADY_TAKEN.code,
  USERNAME_ERROR_CODES.USERNAME_TOO_SHORT.code,
  USERNAME_ERROR_CODES.USERNAME_TOO_LONG.code,
  USERNAME_ERROR_CODES.INVALID_USERNAME.code,
]);

export const EMAIL_AUTH_ERROR_CODES: ReadonlySet<string> = new Set([
  BASE_ERROR_CODES.USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL.code,
  BASE_ERROR_CODES.INVALID_EMAIL.code,
]);

export function getAuthErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  if (
    "body" in error &&
    typeof error.body === "object" &&
    error.body !== null
  ) {
    const code = "code" in error.body ? error.body.code : null;

    if (typeof code === "string") {
      return code;
    }
  }

  const code = "code" in error ? error.code : null;
  return typeof code === "string" ? code : null;
}

export function getAuthErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const maybeMessage =
      "body" in error &&
      typeof error.body === "object" &&
      error.body !== null &&
      "message" in error.body &&
      typeof error.body.message === "string"
        ? error.body.message
        : "message" in error && typeof error.message === "string"
          ? error.message
          : null;

    if (maybeMessage) {
      return maybeMessage;
    }
  }

  return fallback;
}
