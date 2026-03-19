/**
 * Predefined auth-redirect message codes.
 *
 * Server code puts a code in the URL; the client resolves it to a
 * static string. This prevents attackers from displaying arbitrary
 * text via crafted links.
 */
export const AUTH_MESSAGES: Record<string, string> = {
  "sign-in-profile": "Sign in to view your profile",
  "sign-in-create-game": "Sign in to create a game",
};

export type AuthMessageCode = keyof typeof AUTH_MESSAGES;
