import { getValidToken } from "./auth";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

type SpotifyPlaylist = {
  id: string;
  external_urls: { spotify: string };
};

type SpotifyUser = {
  id: string;
};

/**
 * Extract Spotify track ID from various URL formats.
 * Returns null if URL doesn't match expected patterns.
 */
export function extractTrackId(spotifyUrl: string): string | null {
  // Handle various formats:
  // https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh
  // https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh?si=...
  // https://open.spotify.com/intl-de/track/4iV5W9uYEdYUVa79Axb7Rh
  // spotify:track:4iV5W9uYEdYUVa79Axb7Rh
  const urlMatch = spotifyUrl.match(
    /spotify\.com\/(?:intl-[a-z]+\/)?track\/([a-zA-Z0-9]+)/,
  );
  if (urlMatch) return urlMatch[1];

  const uriMatch = spotifyUrl.match(/spotify:track:([a-zA-Z0-9]+)/);
  if (uriMatch) return uriMatch[1];

  return null;
}

async function spotifyFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getValidToken();

  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Spotify API error (${response.status}): ${error}`);
  }

  return response.json() as Promise<T>;
}

async function getCurrentUserId(): Promise<string> {
  const user = await spotifyFetch<SpotifyUser>("/me");
  return user.id;
}

/**
 * Create a new playlist on the service account.
 */
export async function createPlaylist(
  name: string,
  description?: string,
): Promise<{ id: string; url: string }> {
  const userId = await getCurrentUserId();

  const playlist = await spotifyFetch<SpotifyPlaylist>(
    `/users/${userId}/playlists`,
    {
      method: "POST",
      body: JSON.stringify({
        name,
        description: description || "",
        public: true,
      }),
    },
  );

  return {
    id: playlist.id,
    url: playlist.external_urls.spotify,
  };
}

/**
 * Add tracks to a playlist. Handles batching for >100 tracks.
 */
export async function addTracksToPlaylist(
  playlistId: string,
  trackIds: string[],
): Promise<void> {
  if (trackIds.length === 0) return;

  // Spotify allows max 100 tracks per request
  const batches: string[][] = [];
  for (let i = 0; i < trackIds.length; i += 100) {
    batches.push(trackIds.slice(i, i + 100));
  }

  for (const batch of batches) {
    const uris = batch.map((id) => `spotify:track:${id}`);

    await spotifyFetch(`/playlists/${playlistId}/tracks`, {
      method: "POST",
      body: JSON.stringify({ uris }),
    });
  }
}
