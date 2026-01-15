/**
 * Spotify OAuth token acquisition script
 *
 * This script generates an auth URL and instructs the user to complete
 * the OAuth flow. For full automation with Chrome DevTools MCP, run this
 * with Claude Code assistance.
 *
 * Prerequisites:
 * 1. Create Spotify app at developer.spotify.com
 * 2. Set redirect URI: http://127.0.0.1:5173/api/spotify/callback
 * 3. Add to .env: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET
 * 4. Run dev server: bun dev
 *
 * Usage: bun scripts/spotify-auth.ts
 */

const REDIRECT_URI = "http://127.0.0.1:5173/api/spotify/callback";
const SCOPES = ["playlist-modify-public", "playlist-modify-private"];

function generateAuthUrl(): string {
  const clientId = process.env.SPOTIFY_CLIENT_ID;

  if (!clientId) {
    console.error("Error: SPOTIFY_CLIENT_ID not set in environment");
    process.exit(1);
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(" "),
    show_dialog: "true", // Always show consent screen
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function main() {
  const authUrl = generateAuthUrl();

  console.log("=== Spotify OAuth Setup ===\n");
  console.log("1. Make sure dev server is running: bun dev");
  console.log("2. Open this URL in your browser:\n");
  console.log(authUrl);
  console.log("\n3. Log in with the service account credentials");
  console.log("4. Click 'Agree' to grant permissions");
  console.log("5. You'll be redirected to the callback which stores the tokens\n");
  console.log("For automated flow with Chrome DevTools MCP, ask Claude to:");
  console.log('  "Use chrome-devtools MCP to complete Spotify OAuth at this URL"');
}

main();
