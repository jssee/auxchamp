---
id: a-2adf
status: open
deps: [a-1af3, a-e65f]
links: []
created: 2026-01-15T04:35:24Z
type: task
priority: 2
assignee: Jesse Hoyos
parent: a-1f5e
---
# Spotify auth script with MCP

scripts/spotify-auth.ts - semi-automated token acquisition using Chrome DevTools MCP

## Acceptance Criteria

- Generates auth URL with correct scopes\n- Opens browser via MCP\n- MCP handles consent screen clicks\n- Captures redirect and triggers callback\n- Tokens stored in DB

