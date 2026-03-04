# auxchamp

Auxchamp is a TypeScript monorepo centered on a SvelteKit app.

## What’s in this repo

- `apps/web` — SvelteKit frontend + server endpoints
- `packages/api` — shared API/business logic
- `packages/auth` — Better Auth setup
- `packages/db` — Drizzle schema + database access
- `packages/env` — typed env validation

## Stack (high level)

- SvelteKit + Svelte 5
- oRPC
- Better Auth
- PostgreSQL + Drizzle ORM
- Bun + Turborepo

## Onboarding (5–10 minutes)

### 1) Prereqs

- Bun installed
- PostgreSQL running locally

### 2) Install dependencies

```bash
bun install
```

### 3) Create `apps/web/.env`

```env
PUBLIC_SERVER_URL=http://localhost:5173
BETTER_AUTH_SECRET=<32+ chars>
BETTER_AUTH_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydb?schema=public
```

### 4) Initialize database

```bash
bun run db:push
```

### 5) Start development

```bash
bun run dev
```

App runs at `http://localhost:5173`.

## Commands you’ll use most

```bash
bun run dev          # run all dev tasks
bun run dev:web      # run only web app
bun run check-types  # typecheck
bun run check        # lint + format
bun run db:push      # sync schema to DB
```

## Architecture notes

If you need project decisions and boundaries, start here:

- [`docs/architecture/orpc-sveltekit-boundary.md`](docs/architecture/orpc-sveltekit-boundary.md)
