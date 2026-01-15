---
id: a-fe3a
status: closed
deps: [a-70e8]
links: []
created: 2026-01-15T06:51:26Z
type: task
priority: 2
assignee: Jesse Hoyos
parent: a-9ec7
---
# Add voting eligibility to stage loader

Add hasVoted, userVotes, canVote, voteResults to stage page loader. canVote = submissions >= 4 && !hasVoted && phase === voting

## Acceptance Criteria

- Loader returns all voting-related flags
- voteResults populated only if hasVoted or phase closed

