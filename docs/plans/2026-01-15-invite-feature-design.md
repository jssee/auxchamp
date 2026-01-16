# Invite Feature Design

## Overview

Allow battle creators to share invite links. Invitees visit the link and join the battle.

## Decisions

- **Token strategy:** Single `inviteCode` per battle (existing field)
- **When joinable:** Draft or active status only
- **Player limit:** Enforce `maxPlayers` strictly
- **Creator as player:** Auto-add on battle creation
- **Code generation:** On battle creation
- **Regenerate code:** Not for MVP

## Invite Flow

```
/invite/[code]/
    ├── Invalid code → "Link invalid or expired"
    ├── Battle closed → "No longer accepting players"
    ├── Logged out → Show battle name + auth buttons
    ├── Logged in + already player → Redirect to /b/[id]
    ├── Logged in + full → "Battle is full"
    └── Logged in + can join → "Join Battle" button
```

## Auth Redirect

Logged-out users clicking "Sign in" go to `/signin?redirectTo=/invite/[code]`. After auth, they return to the invite page to accept.

Validate `redirectTo` starts with `/` to prevent open redirects.

## Join Validation

1. Battle exists
2. Status is `draft` or `active`
3. User not already a player
4. Player count < `maxPlayers`

## Files to Change

| File | Change |
|------|--------|
| `src/lib/remote/battle.remote.ts` | Add `joinBattle` function |
| `src/lib/remote/battle.remote.ts` | Modify `createBattle`: generate `inviteCode`, add creator as player |
| `src/routes/invite/[code]/+page.server.ts` | Load battle by code, check eligibility |
| `src/routes/invite/[code]/+page.svelte` | Render join UI |
| `src/routes/(auth)/[authtype=authtype]/` | Verify `redirectTo` passthrough |

## Not Included (MVP)

- Invite code regeneration
- Invite expiry
- Individual invite tracking
- Player removal
