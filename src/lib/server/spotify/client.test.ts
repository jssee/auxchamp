import { describe, expect, it } from "vitest";
import { extractTrackId } from "./client";

describe("extractTrackId", () => {
  it("extracts ID from standard Spotify URL", () => {
    const result = extractTrackId(
      "https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh",
    );
    expect(result).toBe("4iV5W9uYEdYUVa79Axb7Rh");
  });

  it("extracts ID from URL with query params", () => {
    const result = extractTrackId(
      "https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh?si=abc123&utm_source=copy-link",
    );
    expect(result).toBe("4iV5W9uYEdYUVa79Axb7Rh");
  });

  it("extracts ID from Spotify URI format", () => {
    const result = extractTrackId("spotify:track:4iV5W9uYEdYUVa79Axb7Rh");
    expect(result).toBe("4iV5W9uYEdYUVa79Axb7Rh");
  });

  it("handles URL with intl path segment", () => {
    const result = extractTrackId(
      "https://open.spotify.com/intl-de/track/4iV5W9uYEdYUVa79Axb7Rh",
    );
    expect(result).toBe("4iV5W9uYEdYUVa79Axb7Rh");
  });

  it("returns null for playlist URL", () => {
    const result = extractTrackId(
      "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
    );
    expect(result).toBeNull();
  });

  it("returns null for album URL", () => {
    const result = extractTrackId(
      "https://open.spotify.com/album/4LH4d3cOWNNsVw41Gqt2kv",
    );
    expect(result).toBeNull();
  });

  it("returns null for invalid URL", () => {
    const result = extractTrackId("not-a-url");
    expect(result).toBeNull();
  });

  it("returns null for empty string", () => {
    const result = extractTrackId("");
    expect(result).toBeNull();
  });

  it("returns null for YouTube URL", () => {
    const result = extractTrackId("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(result).toBeNull();
  });
});
