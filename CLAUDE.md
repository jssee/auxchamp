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

## Key Dependencies

- **Database**: drizzle-orm, drizzle-kit, @neondatabase/serverless
- **Auth**: better-auth with drizzle adapter
- **Validation**: valibot (similar to Zod but lighter)
- **UI**: bits-ui, vaul-svelte (drawer), shadcn-svelte components
- **Styling**: Tailwind CSS 4 (via Vite plugin), tw-animate-css

## Important to remember

- **Use Bun, never pnpm, npm, or yarn**
