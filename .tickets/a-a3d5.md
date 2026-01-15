---
id: a-a3d5
status: open
deps: [a-f991, a-70e8]
links: []
created: 2026-01-15T06:51:15Z
type: task
priority: 2
assignee: Jesse Hoyos
parent: a-9ec7
---
# Add tally logic to stage_closed transition

Calculate rankings, update player.totalStarsEarned, player.stagesWon, and userStats at stage close.

## Acceptance Criteria

- Submissions ranked by starsReceived
- Ties share rank
- player stats updated
- userStats lifetime counters incremented

