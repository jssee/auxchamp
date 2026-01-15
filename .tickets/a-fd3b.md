---
id: a-fd3b
status: open
deps: [a-b7bb]
links: []
created: 2026-01-15T04:35:14Z
type: task
priority: 2
assignee: Jesse Hoyos
parent: a-1f5e
---
# QStash voting_open playlist creation

Update stage-transition handler to call createStagePlaylist when voting_open fires

## Acceptance Criteria

- voting_open action creates playlist\n- Playlist created before phase update completes\n- Errors logged but don't block phase transition

