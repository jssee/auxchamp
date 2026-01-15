import { db } from "$lib/server/db";
import { stage } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { createPlaylist, addTracksToPlaylist, extractTrackId } from "./client";

type PlaylistResult = {
  playlistId: string;
  playlistUrl: string;
};

/**
 * Create a Spotify playlist for a stage's submissions.
 * Returns null if no submissions exist.
 * Idempotent: returns existing playlist if already created.
 */
export async function createStagePlaylist(
  stageId: string,
): Promise<PlaylistResult | null> {
  const currentStage = await db.query.stage.findFirst({
    where: eq(stage.id, stageId),
    with: {
      battle: true,
      submissions: true,
    },
  });

  if (!currentStage) {
    throw new Error(`Stage ${stageId} not found`);
  }

  // Idempotent: return existing playlist if already created
  if (currentStage.spotifyPlaylistId && currentStage.playlistUrl) {
    console.log(`Stage ${stageId} already has playlist: ${currentStage.playlistUrl}`);
    return {
      playlistId: currentStage.spotifyPlaylistId,
      playlistUrl: currentStage.playlistUrl,
    };
  }

  // Skip if no submissions
  if (currentStage.submissions.length === 0) {
    console.log(`Stage ${stageId} has no submissions, skipping playlist creation`);
    return null;
  }

  // Extract track IDs from submission URLs
  const trackIds: string[] = [];
  for (const submission of currentStage.submissions) {
    if (!submission.spotifyUrl) {
      console.warn(`Submission ${submission.id} has no Spotify URL`);
      continue;
    }

    const trackId = extractTrackId(submission.spotifyUrl);
    if (!trackId) {
      console.warn(`Invalid Spotify URL for submission ${submission.id}: ${submission.spotifyUrl}`);
      continue;
    }

    trackIds.push(trackId);
  }

  if (trackIds.length === 0) {
    console.log(`Stage ${stageId} has no valid track URLs, skipping playlist creation`);
    return null;
  }

  // Create playlist
  const playlistName = `${currentStage.battle.name} - Stage ${currentStage.stageNumber}`;
  const playlistDescription = currentStage.vibe
    ? `Vibe: ${currentStage.vibe}`
    : undefined;

  const playlist = await createPlaylist(playlistName, playlistDescription);

  // Add tracks
  await addTracksToPlaylist(playlist.id, trackIds);

  // Update stage record
  await db
    .update(stage)
    .set({
      spotifyPlaylistId: playlist.id,
      playlistUrl: playlist.url,
    })
    .where(eq(stage.id, stageId));

  console.log(`Created playlist for stage ${stageId}: ${playlist.url}`);

  return {
    playlistId: playlist.id,
    playlistUrl: playlist.url,
  };
}
