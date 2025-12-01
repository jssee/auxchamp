# Workflow: Beads-Centric Issue Tracking

**CRITICAL**: This project uses **Beads** for all task/issue tracking. DO NOT use TodoWrite tool or markdown TODO lists.

```bash
# Finding work
bd ready                    # show unblocked issues ready to work
bd list --status=open       # list all open issues
bd show <issue-id>          # view issue details with dependencies

# Creating issues
bd create "Title" --description="Details" --type=task|bug|feature
bd create "Title" -p 0      # create with priority (0=highest, 4=lowest)

# Working on issues
bd update <issue-id> --status=in_progress   # claim work
bd update <issue-id> --assignee=username    # assign to someone
bd close <issue-id>                         # mark complete
bd close <issue-id> --reason="explanation"  # close with reason

# Managing dependencies
bd dep add <issue> <depends-on>  # issue depends on depends-on (depends-on blocks issue)
bd blocked                       # show all blocked issues
bd dep tree <issue-id>           # visualize dependency tree

# Syncing with git
bd sync                     # sync with remote (run at session end)
bd sync --status            # check sync status
```

**Workflow rules**:
- Track ALL work in beads, not TodoWrite
- Use `bd create` to capture discovered work as you go
- Check `bd ready` to find next available work
- Run `bd sync` at end of session before pushing code
- Git hooks auto-sync on commits, but manual `bd sync` ensures push to remote

## SvelteKit Features

- **Remote functions**: Enabled via `experimental.remoteFunctions` - allows server-side form handlers to be called from client
- **Async compiler**: Experimental async Svelte compiler enabled

## Key Dependencies

- **Database**: drizzle-orm, drizzle-kit, @neondatabase/serverless
- **Auth**: better-auth with drizzle adapter
- **Validation**: valibot (similar to Zod but lighter)
- **UI**: bits-ui, vaul-svelte (drawer), shadcn-svelte components
- **Styling**: Tailwind CSS 4 (via Vite plugin), tw-animate-css
