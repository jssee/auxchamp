import { db } from "$lib/server/db";
import { spotifyCredentials } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";

export type SpotifyCredentials = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
};

export async function getCredentials(): Promise<SpotifyCredentials> {
  const creds = await db.query.spotifyCredentials.findFirst({
    where: eq(spotifyCredentials.id, "service"),
  });

  if (!creds) {
    throw new Error(
      "Spotify credentials not found. Run spotify-auth script first.",
    );
  }

  return {
    accessToken: creds.accessToken,
    refreshToken: creds.refreshToken,
    expiresAt: creds.expiresAt,
  };
}

export async function updateCredentials(
  accessToken: string,
  refreshToken: string,
  expiresAt: Date,
): Promise<void> {
  await db
    .update(spotifyCredentials)
    .set({
      accessToken,
      refreshToken,
      expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(spotifyCredentials.id, "service"));
}
