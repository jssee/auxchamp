---
id: a-9a2f
status: closed
deps: [a-94a5, a-8ef8]
links: []
created: 2026-01-08T06:08:54Z
type: task
priority: 2
assignee: Jesse Hoyos
parent: a-f9c0
---
# Implement stage page UI component

Create +page.svelte with stage info, submission form, and submissions display.

## Design

File: src/routes/b/[id]/s/[id]/+page.svelte

Sections:
1. Header: stage number, vibe as title, phase badge
2. Stage info: description (if exists), deadlines formatted in local timezone
3. Submission form (conditional on canSubmit):
   - Hidden input for stageId
   - Input for Spotify URL
   - Textarea for optional note (maxlength 280)
   - Submit button
4. User submissions: list with Spotify embeds
5. All submissions: only shown in voting/closed phases

Spotify embed: iframe src https://open.spotify.com/embed/track/{trackId}

## Acceptance Criteria

- Stage info displays correctly
- Deadlines in user local timezone
- Form only shown when canSubmit true
- Spotify embeds render
- Other submissions hidden until voting phase

