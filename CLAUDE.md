## Managing tasks

**Important**: This project uses a CLI ticket system for task management. Run `tk help` when you need to use it.

**Workflow rules**:

- Track ALL work in ticket (tk), not TodoWrite
- Track all non‑trivial changes in git; Commit early and often.
- Commit changes even if your high-level tasks are not yet done.

## Modern SvelteKit Features

Always use modern sveltekit and svelte features:

- **Remote functions**: Enabled via `experimental.remoteFunctions` - allows server-side form handlers to be called from client
- **Async compiler**: Experimental async Svelte compiler enabled
- **Runes**: state management

## Essential Commands

All commands use `bun` (never npm/pnpm/yarn).

| Command | Purpose |
|---------|---------|
| `bun dev` | Start dev server |
| `bun build` | Production build |
| `bun run check` | Type check (svelte-check) |
| `bun run format` | Format with prettier |
| `bun run test` | Run all tests |
| `bun run test:unit` | Vitest unit tests |
| `bun run test:e2e` | Playwright e2e tests |
| `bun run db:push` | Push schema changes |
| `bun run db:generate` | Generate migrations |
| `bun run db:migrate` | Run migrations |
| `bun run db:studio` | Open Drizzle Studio |
| `bun run db:reset` | Reset database (destructive) |
| `bun run db:seed` | Seed database |

## Key Dependencies

- **Database**: drizzle-orm, drizzle-kit, @neondatabase/serverless
- **Auth**: better-auth with drizzle adapter
- **Validation**: valibot (similar to Zod but lighter)
- **UI**: bits-ui, vaul-svelte (drawer), shadcn-svelte components
- **Styling**: Tailwind CSS 4 (via Vite plugin), tw-animate-css

