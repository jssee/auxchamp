export function isSpotifyTrackUrl(input: string) {
  try {
    const url = new URL(input);
    const pathSegments = url.pathname.split("/").filter(Boolean);

    return (
      url.protocol === "https:" &&
      url.hostname === "open.spotify.com" &&
      pathSegments[0] === "track" &&
      typeof pathSegments[1] === "string" &&
      pathSegments[1].length > 0
    );
  } catch {
    return false;
  }
}
