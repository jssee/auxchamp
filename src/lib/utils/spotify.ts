/**
 * Extracts Spotify track ID from a Spotify URL.
 * Returns null if URL doesn't match expected pattern.
 */
export function extractTrackId(url: string): string | null {
  const match = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}
