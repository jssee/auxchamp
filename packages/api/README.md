# @auxchamp/api

This package is the game backend and primary business logic.

## Core rules

### The router is the only public entry point

Consumers call the router. They do not import internal mutations, queries,
or database code.

That keeps authorization, validation, and business rules on the same path for all apps.

### Schemas are the source of truth

API payload shapes live in `schema.ts`.

That file exists so runtime validation, contract definition, inferred
TypeScript types, and rpc validation can all agree or all fail
together. If a payload changes, change the schema first.

Do not hand-write TypeScript mirrors for public API payloads when schema
inference will do.

## How to evaluate a change here

Before adding code, ask:

1. Does this keep the router as the single gateway?
2. Does this preserve `schema.ts` as the payload source of truth?
3. Does this move logic toward the domain or away from it?
4. Does this remove duplication, or just rename it?
5. Would a new dev understand why this exists six months from now?

If the answer to those questions is weak, the design is probably drifting.
