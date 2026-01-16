import { env } from "$env/dynamic/private";
import { db } from "$lib/server/db";
import { spotifyCredentials } from "$lib/server/db/schema";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url }) => {
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return new Response(`Spotify auth error: ${error}`, { status: 400 });
  }

  if (!code) {
    return new Response("Missing authorization code", { status: 400 });
  }

  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
    console.error("Spotify credentials not configured");
    return new Response("Server configuration error", { status: 500 });
  }

  const redirectUri = `http://127.0.0.1:5173/api/spotify/callback`;

  try {
    const tokenResponse = await fetch(
      "https://accounts.spotify.com/api/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      },
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Spotify token exchange failed:", errorData);
      return new Response(`Token exchange failed: ${errorData}`, {
        status: 400,
      });
    }

    const tokens = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await db
      .insert(spotifyCredentials)
      .values({
        id: "service",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: spotifyCredentials.id,
        set: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt,
          updatedAt: new Date(),
        },
      });

    return new Response(
      `<html>
        <body style="font-family: system-ui; padding: 2rem; text-align: center;">
          <h1>Spotify Connected</h1>
          <p>Tokens stored successfully. You can close this window.</p>
        </body>
      </html>`,
      {
        headers: { "Content-Type": "text/html" },
      },
    );
  } catch (err) {
    console.error("Spotify callback error:", err);
    return new Response("Internal server error", { status: 500 });
  }
};
