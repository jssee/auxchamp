---
id: a-1af3
status: closed
deps: []
links: []
created: 2026-01-15T04:35:19Z
type: task
priority: 2
assignee: Jesse Hoyos
parent: a-1f5e
---
# Spotify OAuth callback endpoint

POST /api/spotify/callback - exchanges auth code for tokens, stores in DB

## Acceptance Criteria

- Exchanges code for access + refresh tokens\n- Stores tokens in spotify_credentials table\n- Returns success page

