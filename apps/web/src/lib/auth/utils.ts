export function getAuthErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  if ("body" in error && typeof error.body === "object" && error.body !== null) {
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

export function normalizeOptionalString(value: string | undefined) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}
