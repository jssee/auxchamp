# Game Rules Implementation Matrix

This document maps [`docs/GAME_RULES.md`](./GAME_RULES.md) to the current codebase.

Status legend:
- **Yes** — implemented and enforced in code
- **Partial** — some code exists, but the rule is incomplete, only approximate, or still has open questions
- **No** — no direct implementation found

Notes:
- File pointers are best-effort and point to the most relevant implementation sites.
- This is a living inventory, not a product spec. Some `No` rows are intentional gaps.

## 1.0 Overview / terms

| Rule | Status | Code pointer(s) | Notes |
| --- | --- | --- | --- |
| 1.1 Purpose | No | — | Pure documentation; no runtime behavior to implement. |
| 1.2 Nature of the Game | Partial | `packages/db/src/schema/game/game.ts:7-35`; `packages/api/src/schema.ts:193-231` | The game is modeled as multi-round with submission/voting phases, but the product surface is still backend-first. |
| 1.3 Participants | Partial | `packages/db/src/schema/game/player.ts:9-50`; `packages/api/src/mutation.ts:34-191` | Creator + invited players exist, but the full roster rules are not yet complete. |
| 1.4 The Creator | Yes | `packages/db/src/schema/game/player.ts:9-50`; `packages/api/src/mutation.ts:34-261`; `packages/api/src/capability.ts:41-75` | Creator participates as a player and also has creator-only actions. |
| 1.5 Round Structure | Yes | `packages/db/src/schema/game/round.ts:17-55`; `packages/api/src/mutation.ts:194-576` | Rounds exist with pending/submitting/voting/scored phases. |

## 2.0 Objective

| Rule | Status | Code pointer(s) | Notes |
| --- | --- | --- | --- |
| 2.1 Round Objective | Partial | `packages/api/src/mutation.ts:263-437`; `packages/api/src/query.ts:246-299` | Submission + voting exist. No enforcement that submissions fit the theme. |
| 2.2 Game Objective | Partial | `packages/api/src/query.ts:118-147` | Standings are computed from stars, but there is no explicit “champion” output field. |
| 2.3 Round Victory | Partial | `packages/api/src/query.ts:123-148, 286-298` | Round results are sorted by star count, but ties/winners are not materialized separately. |
| 2.4 Game Victory | Partial | `packages/api/src/query.ts:140-147` | Game champion is derivable from standings, but not returned as a dedicated value. |

## 3.0 Terms

| Rule | Status | Code pointer(s) | Notes |
| --- | --- | --- | --- |
| 3.1 Creator | Yes | `packages/db/src/schema/game/player.ts:9-50` | Role exists as `creator`. |
| 3.2 Player | Yes | `packages/db/src/schema/game/player.ts:9-50` | Role exists as `player`, and the creator is stored in the same table. |
| 3.3 Round | Yes | `packages/db/src/schema/game/round.ts:17-55` | Phase + ordering are modeled. |
| 3.4 Submission | Yes | `packages/db/src/schema/game/submission.ts:8-44` | Submission records exist with player/round ownership. |
| 3.5 Star | Yes | `packages/db/src/schema/game/star.ts:7-35` | Star records exist as ballot-to-submission votes. |
| 3.6 Eligible Player | Partial | `packages/api/src/capability.ts:24-80`; `packages/api/src/mutation.ts:263-437` | Eligibility is modeled in capability logic, but not every membership edge case is represented yet. |

## 4.0 Game setup

| Rule | Status | Code pointer(s) | Notes |
| --- | --- | --- | --- |
| 4.1 Creator Authority Before Start | Yes | `packages/api/src/mutation.ts:65-161, 194-261` | Only the creator can add rounds/invite/start while the game is draft. |
| 4.2 Required Setup Elements | Partial | `packages/api/src/schema.ts:35-101`; `packages/api/src/mutation.ts:34-261` | Name, description, windows, invitations, and round themes exist. No single create flow sets round count, roster, and per-round metadata together. No submission-limit setting yet. |
| 4.3 Round Definition | Yes | `packages/db/src/schema/game/round.ts:22-29`; `packages/api/src/schema.ts:56-68` | Round `theme` is required. |
| 4.4 Optional Round Prompt | Yes | `packages/db/src/schema/game/round.ts:27-28`; `packages/api/src/schema.ts:56-68` | Round description is optional. |
| 4.5 Minimum Requirements to Start | Yes | `packages/api/src/mutation.ts:217-237`; `packages/api/src/capability.ts:47-53` | Start is blocked until there is at least one round and four active players. |
| 4.6 Start of the Game | Yes | `packages/api/src/mutation.ts:194-261` | Game only begins via `startGame`. |

## 5.0 Membership

| Rule | Status | Code pointer(s) | Notes |
| --- | --- | --- | --- |
| 5.1 Invitation Only | Yes | `packages/api/src/mutation.ts:112-191` | Players enter through invite/accept flows, not free join. |
| 5.2 Joining Before Start | Yes | `packages/api/src/mutation.ts:112-191` | Invite + accept works while the game is draft. |
| 5.3 Joining After Start | No | `packages/api/src/mutation.ts:112-191` | `invitePlayer` is draft-only, so post-start invitation/approval is not supported. |
| 5.4 Leaving the Game | No | `packages/api/src/capability.ts:10-20, 41-80`; `packages/api/src/mutation.ts:34-576` | Capability vocabulary includes `leave_game`, but there is no mutation or persistence for leaving. |
| 5.5 Removal by the Creator | No | `packages/api/src/mutation.ts:34-576` | No remove-player mutation exists. |
| 5.6 Rejoining the Game | No | `packages/api/src/mutation.ts:112-191` | No leave/rejoin state machine exists yet. |
| 5.7 Immediate Participation After Join or Rejoin | No | `packages/api/src/mutation.ts:112-191, 263-437` | Because join/rejoin flows are incomplete, immediate stage participation after rejoin is not implemented. |
| 5.8 Effect of Leaving or Removal on Past Actions | No | `packages/api/src/mutation.ts:34-576` | No leave/remove path exists, so this historical behavior is not exercised. |
| 5.9 Effect of Leaving or Removal on Current Eligibility | Partial | `packages/db/src/schema/game/player.ts:10-30`; `packages/api/src/mutation.ts:267-355, 341-437`; `packages/api/src/capability.ts:24-80` | Current action checks require `status === active`, but status transitions to `left`/`removed` are not implemented. |
| 5.10 Removal Before Acting in the Current Stage | No | `packages/api/src/mutation.ts:34-576` | No removal mechanism exists to trigger this rule. |

## 6.0 Stages

| Rule | Status | Code pointer(s) | Notes |
| --- | --- | --- | --- |
| 6.1 Standard Stage Order | Yes | `packages/db/src/schema/game/round.ts:17-55`; `packages/api/src/mutation.ts:450-576` | Pending → submitting → voting → scored. |
| 6.2 Setup Stage | Yes | `packages/db/src/schema/game/round.ts:29-33` | `pending` is the setup state before submissions open. |
| 6.3 Submission Stage | Yes | `packages/api/src/mutation.ts:263-335`; `packages/api/src/capability.ts:56-62` | Submission is gated by active status and open submission window. |
| 6.4 Voting Stage | Yes | `packages/api/src/mutation.ts:337-437`; `packages/api/src/capability.ts:63-70` | Voting is gated by active status and open voting window. |
| 6.5 Scored Stage | Yes | `packages/api/src/mutation.ts:527-576`; `packages/api/src/query.ts:286-298` | Round results are final once scored. |

## 7.0 Submissions

| Rule | Status | Code pointer(s) | Notes |
| --- | --- | --- | --- |
| 7.1 Submission Limit | No | `packages/api/src/schema.ts:103-127`; `packages/db/src/schema/game/submission.ts:8-32` | Current implementation allows one submission per player per round; no configurable per-game submission count exists. |
| 7.2 One Rule Set Across Rounds | Partial | `packages/api/src/mutation.ts:263-335`; `packages/db/src/schema/game/submission.ts:27-31` | The same one-per-player constraint is applied to every round, but the intended configurable rule set is missing. |
| 7.3 Optional Note | Yes | `packages/db/src/schema/game/submission.ts:18-20`; `packages/api/src/schema.ts:103-127`; `packages/api/src/mutation.ts:306-333` | Notes are optional and persisted. |
| 7.4 Editing During Submission | Yes | `packages/api/src/mutation.ts:306-323` | Existing submissions are upserted until the submission phase closes. |
| 7.5 Hidden During Submission | Partial | `packages/api/src/query.ts:253-259` | The round API only exposes the actor’s own submission during submitting; there is no broad submission list in that stage. |
| 7.6 Reveal at Start of Voting | Yes | `packages/api/src/mutation.ts:494-525`; `packages/api/src/query.ts:261-283` | Voting phase exposes the round’s submissions. |
| 7.7 Anonymous During Voting | No | `packages/api/src/query.ts:275-283` | Voting submissions currently include `playerId`, so submitter identity is not hidden in the returned data. |
| 7.8 Notes During Voting | Yes | `packages/api/src/query.ts:275-283` | Voting submissions include notes. |
| 7.9 Responsibility for Anonymous Notes | No | `packages/api/src/query.ts:275-283` | No server-side protection against identity leaks in notes. |
| 7.10 Missing a Submission | Yes | `packages/api/src/mutation.ts:284-301` | Once the submission window closes, late submissions are rejected. |
| 7.11 Voting Without Submitting | Yes | `packages/api/src/mutation.ts:342-400` | Voting only requires active membership; submitting is not required. |

## 8.0 Voting

| Rule | Status | Code pointer(s) | Notes |
| --- | --- | --- | --- |
| 8.1 Expectation to Vote | No | `packages/api/src/mutation.ts:337-437` | The system permits omission, but there is no enforcement or reminder flow. |
| 8.2 Ballot Size | Yes | `packages/api/src/schema.ts:215-231`; `packages/api/src/mutation.ts:377-381` | Exactly 3 submissions are required. |
| 8.3 Distinct Targets | Yes | `packages/api/src/mutation.ts:377-381` | Duplicate submission IDs are rejected. |
| 8.4 No Self-Voting | Yes | `packages/api/src/mutation.ts:397-400` | A voter cannot star their own submission. |
| 8.5 Multiple Submission Games | No | `packages/api/src/schema.ts:103-127, 215-231`; `packages/api/src/mutation.ts:306-323` | The codebase currently assumes one submission per player per round, so the multi-submission rule is not represented. |
| 8.6 Editing During Voting | Yes | `packages/api/src/mutation.ts:402-429` | Existing ballots are replaced during voting until the window closes. |
| 8.7 Missed Vote | Yes | `packages/api/src/mutation.ts:367-375` | No vote is simply absent; there is no forced ballot creation. |
| 8.8 Hidden Ballots During Voting | Yes | `packages/api/src/query.ts:261-283` | Only the actor’s own ballot is returned during voting. |
| 8.9 End of Voting Privacy Change | Partial | `packages/api/src/query.ts:286-298`; `packages/api/src/schema.ts:155-191` | Results are revealed after scoring, but the API does not explicitly model ballot-ownership reveal or submitter anonymity as a phase transition. |

## 9.0 Scoring and winners

| Rule | Status | Code pointer(s) | Notes |
| --- | --- | --- | --- |
| 9.1 Value of a Star | Yes | `packages/api/src/query.ts:17-30` | Star count is computed with a simple `count()`, i.e. one star = one point. |
| 9.2 Round Scoring | Yes | `packages/api/src/query.ts:17-30, 123-138, 286-298` | Round score is the total stars per submission. |
| 9.3 Multiple Submission Scoring | No | `packages/api/src/schema.ts:103-127`; `packages/api/src/mutation.ts:306-323` | Multi-submission scoring is not supported because multi-submission entry itself is missing. |
| 9.4 Round Winner | Partial | `packages/api/src/query.ts:127-138, 286-298` | Results are sorted by stars, but no explicit winner field exists. |
| 9.5 Round Ties | No | `packages/api/src/query.ts:127-138, 286-298` | Tie handling is not materialized; the API just sorts rows. |
| 9.6 Cumulative Standings | Yes | `packages/api/src/query.ts:140-147` | Total stars are accumulated across scored rounds. |
| 9.7 Game Champion | Partial | `packages/api/src/query.ts:140-147` | The top standings row can be treated as champion, but there is no dedicated champion output. |
| 9.8 Final Ties | No | `packages/api/src/query.ts:140-147` | Co-champion handling is not represented. |

## 10.0 Progression and timing

| Rule | Status | Code pointer(s) | Notes |
| --- | --- | --- | --- |
| 10.1 Manual Start | Yes | `packages/api/src/mutation.ts:194-261` | The creator must call `startGame`. |
| 10.2 Time Windows | Yes | `packages/api/src/schema.ts:35-101`; `packages/api/src/mutation.ts:239-251, 509-547` | Submission and voting windows are stored on the round and enforced in mutations. |
| 10.3 Automatic Advancement by Deadline | No | `packages/api/src/mutation.ts:263-576` | Deadlines are checked, but there is no scheduler or background worker advancing the game automatically. |
| 10.4 Early Advancement by the Creator | Partial | `packages/api/src/mutation.ts:450-576`; `packages/api/src/capability.ts:71-75` | Creator can advance round, but minimum conditions for early advance are not checked. |
| 10.5 Submission to Voting Minimum | No | `packages/api/src/mutation.ts:450-525` | No submission-count threshold is enforced before moving to voting. |
| 10.6 Voting to Scored Early | Yes | `packages/api/src/mutation.ts:527-576` | Creator can move voting → scored without waiting for every ballot. |
| 10.7 Too Few Submissions at Deadline | No | `packages/api/src/mutation.ts:450-576` | No deadline-specific blocking/pause logic exists for undersized rounds. |
| 10.8 Pause for Creator Decision | No | `packages/api/src/mutation.ts:450-576` | No paused state or extension workflow exists. |
| 10.9 Future-Only Timing Changes | No | `packages/api/src/mutation.ts:194-261, 450-576` | There is currently no mutation to change window lengths after start. |

## 11.0 Changes after the game starts

| Rule | Status | Code pointer(s) | Notes |
| --- | --- | --- | --- |
| 11.1 Locked Current and Past Rounds | Yes | `packages/api/src/mutation.ts:65-109, 194-261` | Round creation only happens in draft, so started games do not expose an edit path for current/past rounds. |
| 11.2 Editable Future Rounds | No | `packages/api/src/mutation.ts:65-109` | Future round edits are not implemented; there is only add-round in draft. |
| 11.3 Membership Changes After Start | No | `packages/api/src/mutation.ts:112-191, 194-261` | Post-start invitation/removal/rejoin flows are not implemented. |

## 12.0 Completion

| Rule | Status | Code pointer(s) | Notes |
| --- | --- | --- | --- |
| 12.1 End of the Game | Yes | `packages/api/src/mutation.ts:563-575` | Game is marked completed when the final scored round ends. |
| 12.2 Final Results | Partial | `packages/api/src/mutation.ts:563-575`; `packages/api/src/query.ts:118-147, 286-298` | Completion is locked in, but there is no explicit finalization guard beyond state changes. |
| 12.3 Historical Record | Partial | `packages/db/src/schema/game/submission.ts:8-44`; `packages/db/src/schema/game/ballot.ts:8-41`; `packages/db/src/schema/game/star.ts:7-35` | The data model preserves past submissions/ballots/stars, but leave/remove history rules are not fully modeled. |

## Notable gaps

- No leave/remove/rejoin flow yet.
- No configurable multi-submission support.
- Voting submissions are not anonymous in the API response.
- No background automation for deadline-based stage advancement.
- No explicit tie/winner/co-champion outputs.
- No future-round edit path after start.
