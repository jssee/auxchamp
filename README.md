# auxchamp

## Database

### Setup

```bash
bun run db:push      # Push schema to database
bun run db:studio    # Open Drizzle Studio GUI
```

### Testing with seed data

1. Start the app and sign up for an account
2. Get your user ID from the `auth.user` table (via `db:studio`)
3. Seed the database:

```bash
bun run db:seed <your-user-id>
```

This creates sample battles, players, and stages linked to your account.

### Reset

```bash
bun run db:reset    # Truncate all tables (keeps schema)
```
