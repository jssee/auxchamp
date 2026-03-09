# API and remote function boundaries

## Summary

The `@auxchamp/api` package owns business logic. The oRPC router is the
single gateway to it. All consumers — SvelteKit, the Slack bot, future
clients — call through the router. No one imports domain commands directly.

## API package (`packages/api`)

The API package is the source of truth for:

- **Business logic** — domain commands, queries, invariants
- **Authorization** — procedure middleware (`protectedProcedure`, `publicProcedure`)
- **Validation** — input schemas on procedures
- **Data access** — database queries, transactions

The router is the canonical interface. Domain commands like `createGame`
and `addRound` are internal to the package — they are called by
procedures, not by consumers.

## The server-side client

SvelteKit calls the router in-process through a `RouterClient`. No HTTP
round-trip, but the same middleware (auth, validation) runs as if it were
an external request.

```typescript
// apps/web/src/lib/server/api.ts
import { createRouterClient } from "@orpc/server";
import { appRouter } from "@auxchamp/api/router";

export function createApi(request: Request) {
  return createRouterClient(appRouter, {
    context: () => createContext({ request }),
  });
}
```

Load functions use it:

```typescript
// +page.server.ts
export const load = async ({ request }) => {
  const api = createApi(request);
  return { data: await api.someResource.list() };
};
```

Remote functions use the same client:

```typescript
// feature.remote.ts
import { command, getRequestEvent } from "$app/server";
import { createApi } from "$lib/server/api";
import { createGameSchema } from "./schemas";

export const create_game = command(createGameSchema, async (input) => {
  const api = createApi(getRequestEvent().request);
  return api.createGame(input);
});
```

One path. Auth runs once, in the middleware.

## External consumers

The Slack bot (and any future client) uses an HTTP client pointing at
the deployed `/rpc` endpoint. Same router, same middleware, different
transport.

```typescript
// apps/slack-bot/src/api.ts
import { createORPCClient } from "@orpc/client";
import type { AppRouter } from "@auxchamp/api/router";

export const api = createORPCClient<AppRouter>({
  baseURL: process.env.API_URL + "/rpc",
});
```

The Slack bot has no awareness of SvelteKit. It speaks oRPC over HTTP.

## Remote functions (`*.remote.ts`)

Remote functions are thin adapters. They give Svelte components a way to
trigger server-side work with good ergonomics — schema validation on the
call boundary, `query.current`/`query.loading` in templates, `{#await}`
integration.

A remote function should:

1. Create the API client from the current request
2. Call a single router procedure
3. Return the result

A remote function should not:

- Contain business logic
- Import domain commands directly
- Query the database
- Enforce authorization (the router middleware handles this)
- Call other remote functions

### When to use remote functions

Use `command()` and `query()` for **user-initiated** mutations and
fetches — button clicks, form submissions, on-demand data loading.

Do not use remote functions for initial page data. Use `+page.server.ts`
load functions for that.

### The cleanliness check

If a remote function contains anything beyond a single
`api.something.doSomething(input)` call, that logic belongs in an oRPC
procedure.

## Decision record

| Concern                  | Owner           | Notes                                      |
| ------------------------ | --------------- | ------------------------------------------ |
| Domain logic             | API procedures  | Commands, queries, invariants              |
| Authorization            | API middleware  | `protectedProcedure`                       |
| Input validation         | API procedures  | Procedure-level schemas                    |
| Form UX validation       | Remote function | `command(schema, ...)` for client feedback |
| Database access          | API             | Drizzle queries, transactions              |
| Session/context          | API context     | `createContext()` from request headers     |
| Error translation        | Remote function | Map oRPC errors to frontend results        |
| Initial page data        | Load function   | `+page.server.ts` via server-side client   |
| User-initiated mutations | Remote function | `command()` via server-side client         |
| User-initiated fetches   | Remote function | `query()` via server-side client           |

## Exception: auth transport

`signIn` and `signUp` in `app.remote.ts` call Better Auth's API
directly (`auth.api.signInEmail`, `auth.api.signUpEmail`). These do not
go through the oRPC router.

This is intentional. Better Auth has its own request handler, session
management, and cookie logic. Wrapping it behind oRPC procedures would
add indirection with no benefit — the auth library is the source of
truth for authentication, not our API layer.

The rule: **authentication transport** (sign in, sign up, sign out,
OAuth callbacks) calls Better Auth directly. **Everything else** goes
through the oRPC router.
