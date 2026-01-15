# Voting Feature Design

Players award 3 stars per stage to submissions they like. Stars accumulate into battle standings and lifetime stats.

## Rules

1. Players cannot vote for own submissions
2. Players can only vote for a submission once (3 stars → 3 different submissions)
3. Votes cannot be made after voting deadline
4. Must award all 3 stars before submitting
5. Minimum 4 submissions required to enable voting
6. Results visible only after voting or when stage closes

## Data Model

### Modified: `star` table

Allow 3 stars per voter per stage (currently allows 1). Add unique constraint on `(stageId, voterId, submissionId)` to prevent duplicate votes for same submission. App logic enforces max 3 per voter per stage.

### New: `userStats` table

```
userStats
├── id (PK)
├── userId (FK, unique)
├── lifetimeStarsEarned (int, default 0)
├── lifetimeStagesWon (int, default 0)
├── battlesCompleted (int, default 0)
├── createdAt
└── updatedAt
```

### Existing fields to populate

- `player.totalStarsEarned` — sum of stars received in battle
- `player.stagesWon` — count of stage wins in battle
- `submission.starsReceived` — star count per submission

## Backend Logic

### `castVotes` handler

Replaces single `castVote`. Input: `{ stageId, submissionIds: [id1, id2, id3] }`

Validations:
- Stage exists and is current stage
- Battle is active, phase is `voting`
- Current time < votingDeadline
- Exactly 3 submission IDs provided
- All 3 IDs are distinct
- None are voter's own submissions
- Voter hasn't already voted this stage

Transaction: insert 3 star records atomically, increment `starsReceived` on each submission.

### Tally logic (at `stage_closed` transition)

1. Query submissions for stage, order by `starsReceived` DESC
2. Assign ranks with shared positions for ties
3. Identify winner(s) — rank 1 submission owner(s)
4. Update `player.totalStarsEarned` for all players (recalculate from stars)
5. Update `player.stagesWon` for winner(s)
6. Update `userStats.lifetimeStarsEarned` and `lifetimeStagesWon`

### At `battle_completed` transition

- Increment `userStats.battlesCompleted` for all players

### Voting eligibility

Expose `canVote` flag: `submissions >= 4 && !hasAlreadyVoted && phase === 'voting'`

## Voting UI

### Stage page during voting phase

- Show all submissions (excluding own) with Spotify embeds
- Each submission has star toggle button
- Counter shows "2/3 stars awarded"
- "Submit Votes" button disabled until exactly 3 selected
- If already voted: show results inline
- If < 4 submissions: show "Not enough submissions for voting"

### Client state machine

```
idle → selecting → ready → submitting → voted
```

### Component structure

```
VotingPanel.svelte
├── SubmissionCard.svelte (add star button)
├── StarCounter.svelte
└── SubmitVotesButton.svelte
```

### Loader additions

- `hasVoted`: boolean
- `userVotes`: submission IDs voted for (if hasVoted)
- `canVote`: boolean
- `voteResults`: populated if hasVoted or phase closed

## Results Page

### Route: `/b/[id]/s/[id]/results`

### Access control

- Must be battle participant
- Visible if: user has voted OR stage phase is `closed`
- Redirect to stage page otherwise

### Layout

```
1st ⭐⭐⭐ (3 stars)
┌─────────────────────────────┐
│   [Spotify Embed]           │
│   submitted by @alice       │
└─────────────────────────────┘
  ├─ @bob
  ├─ @carol
  └─ @dave
─────────────────────────────────

2nd ⭐⭐ (2 stars)
┌─────────────────────────────┐
│   [Spotify Embed]           │
│   submitted by @eve         │
└─────────────────────────────┘
  ├─ @bob
  └─ @carol
```

Voters listed inline under each submission. Ties share rank (1st, 1st, 3rd).

### Navigation

- Link back to stage page
- Links to prev/next stage results
- Link to battle overview

## Battle Standings

### Location: `/b/[id]` overview page

### Layout

```
Battle Standings
─────────────────────────────────
1st  @alice    ⭐ 12 stars  (2 stages won)
2nd  @bob      ⭐ 9 stars   (1 stage won)
3rd  @carol    ⭐ 7 stars   (0 stages won)
─────────────────────────────────
```

### Data

- Query `player` table for battle
- Order by `totalStarsEarned` DESC, then `stagesWon` DESC
- Show only if at least one stage closed

## Edge Cases

- User deletes account: cascade delete `userStats`
- Battle cancelled: don't increment `battlesCompleted`
- Fewer than 4 submissions: voting disabled with message
- Ties: shared rank, multiple winners possible
