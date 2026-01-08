---
id: a-8ef8
status: closed
deps: [a-5f48]
links: []
created: 2026-01-08T06:08:37Z
type: task
priority: 2
assignee: Jesse Hoyos
parent: a-f9c0
---
# Update submitTrack remote function to accept note

Update schema validation and insert to handle optional note field.

## Design

File: src/lib/remote/stage.remote.ts

Update submitSchema:
  const submitSchema = v.object({
    stageId: v.string(),
    spotifyUrl: v.pipe(v.string(), v.url()),
    note: v.optional(v.pipe(v.string(), v.maxLength(280))),
  });

Update insert in handler:
  await db.insert(submission).values({
    ...existing fields,
    note: data.note || null,
  });

## Acceptance Criteria

- submitTrack accepts optional note field
- note limited to 280 characters
- note saved to database when provided
- submission still works without note

