# Spotify Integration Design

## Overview

Integrate Spotify playlist creation into the battle flow. When a stage's submission deadline passes, automatically create a Spotify playlist containing all submitted tracks. Battle creators can also trigger playlist creation manually.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| When to create playlist | At submission deadline (voting_open) | All submissions in, players need playlist for voting |
| Manual trigger | Yes, battle creator only | Flexibility before deadline |
| Whose Spotify account | App-owned service account | Simpler auth, no user Spotify dependency |
| Token storage | Dedicated `spotify_credentials` table | Auto-refresh, cleaner than hijacking auth tables |
| Testing approach | Hybrid (unit + webhook simulator) | Fast tests + real handler validation |
| Token acquisition | Semi-automated with Chrome DevTools MCP | Repeatable, handles consent clicks |

## Data Model

### New table: `spotify_credentials`

```sql
id           text primary key default 'service'
accessToken  text not null
refreshToken text not null
expiresAt    timestamp not null
createdAt    timestamp default now()
updatedAt    timestamp default now()
```

Single row with `id='service'`. Upsert on refresh.

### Existing tables (no changes)

- `stage.spotifyPlaylistId` - stores playlist ID after creation
- `stage.playlistUrl` - stores shareable URL
- `submission.spotifyUrl` - source for track IDs

## File Structure

```
src/lib/server/spotify/
├── client.ts        # Spotify API wrapper
├── auth.ts          # Token refresh logic
├── credentials.ts   # DB read/write for tokens
└── playlist.ts      # createStagePlaylist(stageId)

src/lib/remote/stage.remote.ts
└── createPlaylist   # command() for manual trigger

src/routes/api/qstash/stage-transition/+server.ts
└── voting_open      # calls createStagePlaylist()

src/routes/api/spotify/callback/+server.ts
└── Token exchange   # OAuth callback

scripts/
├── spotify-auth.ts         # Token acquisition with MCP
└── test-qstash-webhook.ts  # Local webhook simulator
```

## Spotify Client API

```typescript
// auth.ts
getValidToken(): Promise<string>
// Returns access token, auto-refreshes if expired/expiring within 5 min

// client.ts
createPlaylist(name: string, description?: string): Promise<{ id: string, url: string }>
addTracksToPlaylist(playlistId: string, trackIds: string[]): Promise<void>
extractTrackId(spotifyUrl: string): string | null

// playlist.ts
createStagePlaylist(stageId: string): Promise<{ playlistId: string, playlistUrl: string } | null>
// Orchestrates full flow, returns null if no submissions
```

## Playlist Creation Flow

```
1. Fetch stage + all submissions
2. Guard: if spotifyPlaylistId already set → return existing (idempotent)
3. Guard: if no submissions → return null
4. Extract track IDs from submission URLs
5. Create playlist: "[Battle Name] - Stage [N]"
6. Add tracks to playlist (batch if >100)
7. Update stage with spotifyPlaylistId + playlistUrl
8. Return result
```

### Trigger Points

**Automatic (QStash):**
- `voting_open` action in stage-transition handler
- Calls `createStagePlaylist(stageId)` after updating phase

**Manual (remote function):**
- `createPlaylist` command in stage.remote.ts
- Authorization: battle creator only, submission phase only

## Token Acquisition

### Prerequisites

1. Create Spotify app at developer.spotify.com
2. Set redirect URI: `http://127.0.0.1:5173/api/spotify/callback`
3. Add to `.env`:
   ```
   SPOTIFY_CLIENT_ID=...
   SPOTIFY_CLIENT_SECRET=...
   ```

### Script Flow (`scripts/spotify-auth.ts`)

1. Generate auth URL with scopes: `playlist-modify-public`, `playlist-modify-private`
2. Open browser via Chrome DevTools MCP
3. User enters Spotify credentials manually
4. MCP clicks "Agree" on consent screen
5. Capture redirect with auth code
6. Exchange code for tokens
7. Store in `spotify_credentials` table

Note: Using `127.0.0.1` not `localhost` per Spotify's redirect URI requirements.

## Testing Strategy

### Unit Tests (`src/lib/server/spotify/*.test.ts`)

- `extractTrackId()` - URL parsing, edge cases
- `getValidToken()` - mocked DB + fetch, refresh logic
- `createStagePlaylist()` - mocked Spotify client, orchestration

### QStash Webhook Simulator (`scripts/test-qstash-webhook.ts`)

```bash
bun scripts/test-qstash-webhook.ts voting_open <stageId>
```

Signs payload with `QSTASH_CURRENT_SIGNING_KEY`, POSTs to local endpoint.

### Integration Tests

- Seed DB with battle + stage + submissions
- Call `createStagePlaylist()` with mocked Spotify responses
- Assert `stage.spotifyPlaylistId` updated

### Not Tested Automatically

- Real Spotify API calls (requires tokens, rate limits)
- Real QStash scheduling (can't reach localhost)
- Use ngrok for manual end-to-end smoke tests

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Token refresh fails | Throw error (prevent silent failures) |
| Playlist creation fails | Log error, leave spotifyPlaylistId null |
| Add tracks partial failure | Add what succeeds, log failures, save playlist |
| No submissions | Skip creation, log info, return null |
| Playlist already exists | Return existing URL (idempotent) |
| Invalid Spotify URL | Skip that track, log warning |
| No credentials in DB | Throw "Run spotify-auth script first" |

## Environment Variables

```
# Existing
QSTASH_TOKEN=...
QSTASH_CURRENT_SIGNING_KEY=...
QSTASH_NEXT_SIGNING_KEY=...

# New
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
```
