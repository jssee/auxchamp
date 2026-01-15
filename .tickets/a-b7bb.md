---
id: a-b7bb
status: closed
deps: [a-e65f]
links: []
created: 2026-01-15T04:35:05Z
type: task
priority: 2
assignee: Jesse Hoyos
parent: a-1f5e
---
# Spotify client module

src/lib/server/spotify/ with auth.ts, client.ts, credentials.ts, playlist.ts

## Acceptance Criteria

- getValidToken() auto-refreshes expired tokens\n- createPlaylist() creates playlist on Spotify\n- addTracksToPlaylist() handles batching >100 tracks\n- extractTrackId() parses various URL formats\n- createStagePlaylist() orchestrates full flow

