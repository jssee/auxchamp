import { env } from "$env/dynamic/private";
import { getCredentials, updateCredentials } from "./credentials";

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Returns a valid access token, refreshing if expired or expiring soon.
 */
export async function getValidToken(): Promise<string> {
  const creds = await getCredentials();

  const now = Date.now();
  const expiresAtMs = creds.expiresAt.getTime();

  if (now < expiresAtMs - TOKEN_REFRESH_BUFFER_MS) {
    return creds.accessToken;
  }

  return refreshToken(creds.refreshToken);
}

async function refreshToken(refreshToken: string): Promise<string> {
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
    throw new Error("Spotify client credentials not configured");
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Spotify token refresh failed: ${error}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  // Spotify may return a new refresh token
  const newRefreshToken = data.refresh_token || refreshToken;

  await updateCredentials(data.access_token, newRefreshToken, expiresAt);

  return data.access_token;
}
