## Essential Commands

All commands use `bun` (never npm/pnpm/yarn).

| Command               | Purpose                      |
| --------------------- | ---------------------------- |
| `bun dev`             | Start dev server             |
| `bun build`           | Production build             |
| `bun run check`       | Type check (svelte-check)    |
| `bun run format`      | Format with prettier         |
| `bun run test`        | Run all tests                |
| `bun run test:unit`   | Vitest unit tests            |
| `bun run test:e2e`    | Playwright e2e tests         |
| `bun run db:push`     | Push schema changes          |
| `bun run db:generate` | Generate migrations          |
| `bun run db:migrate`  | Run migrations               |
| `bun run db:studio`   | Open Drizzle Studio          |
| `bun run db:reset`    | Reset database (destructive) |
| `bun run db:seed`     | Seed database                |

## Browser Automation

Use `agent-browser` for web automation. Run `agent-browser --help` for all commands.

Core workflow:
1. `agent-browser open <url>` - Navigate to page
2. `agent-browser snapshot -i` - Get interactive elements with refs (@e1, @e2)
3. `agent-browser click @e1` / `fill @e2 "text"` - Interact using refs
4. Re-snapshot after page changes
