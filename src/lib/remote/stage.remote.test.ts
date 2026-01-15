import { describe, expect, it } from "vitest";
import * as v from "valibot";
import { submitSchema, castVotesSchema } from "$lib/schemas/stage";

describe("submitSchema", () => {
  it("accepts valid submission with URL only", () => {
    const result = v.safeParse(submitSchema, {
      stageId: "abc123",
      spotifyUrl: "https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.stageId).toBe("abc123");
      expect(result.output.note).toBeUndefined();
    }
  });

  it("accepts valid submission with URL and note", () => {
    const result = v.safeParse(submitSchema, {
      stageId: "abc123",
      spotifyUrl: "https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh",
      note: "Perfect summer vibes",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.note).toBe("Perfect summer vibes");
    }
  });

  it("rejects note over 280 characters", () => {
    const result = v.safeParse(submitSchema, {
      stageId: "abc123",
      spotifyUrl: "https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh",
      note: "a".repeat(281),
    });

    expect(result.success).toBe(false);
  });

  it("accepts note at exactly 280 characters", () => {
    const result = v.safeParse(submitSchema, {
      stageId: "abc123",
      spotifyUrl: "https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh",
      note: "a".repeat(280),
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid Spotify URL", () => {
    const result = v.safeParse(submitSchema, {
      stageId: "abc123",
      spotifyUrl: "not-a-url",
    });

    expect(result.success).toBe(false);
  });

  it("requires stageId", () => {
    const result = v.safeParse(submitSchema, {
      spotifyUrl: "https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh",
    });

    expect(result.success).toBe(false);
  });

  it("requires spotifyUrl", () => {
    const result = v.safeParse(submitSchema, {
      stageId: "abc123",
    });

    expect(result.success).toBe(false);
  });
});

describe("castVotesSchema", () => {
  it("accepts valid vote with exactly 3 submission IDs", () => {
    const result = v.safeParse(castVotesSchema, {
      stageId: "stage123",
      submissionIds: ["sub1", "sub2", "sub3"],
    });

    expect(result.success).toBe(true);
  });

  it("rejects fewer than 3 submission IDs", () => {
    const result = v.safeParse(castVotesSchema, {
      stageId: "stage123",
      submissionIds: ["sub1", "sub2"],
    });

    expect(result.success).toBe(false);
  });

  it("rejects more than 3 submission IDs", () => {
    const result = v.safeParse(castVotesSchema, {
      stageId: "stage123",
      submissionIds: ["sub1", "sub2", "sub3", "sub4"],
    });

    expect(result.success).toBe(false);
  });

  it("rejects duplicate submission IDs", () => {
    const result = v.safeParse(castVotesSchema, {
      stageId: "stage123",
      submissionIds: ["sub1", "sub1", "sub2"],
    });

    expect(result.success).toBe(false);
  });

  it("requires stageId", () => {
    const result = v.safeParse(castVotesSchema, {
      submissionIds: ["sub1", "sub2", "sub3"],
    });

    expect(result.success).toBe(false);
  });
});
