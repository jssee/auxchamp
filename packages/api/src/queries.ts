import type { Context } from "./context";

type AuthenticatedSession = NonNullable<Context["session"]>;

export function getHealthCheck() {
  return "OK";
}

export function getPrivateData(session: AuthenticatedSession) {
  return {
    message: "This is private",
    user: session.user,
  };
}
