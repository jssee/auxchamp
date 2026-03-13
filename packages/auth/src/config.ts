export const USERNAME_PATTERN = /^[a-zA-Z0-9_.]+$/;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

export function normalizeUsername(username: string) {
  return username.toLowerCase();
}
