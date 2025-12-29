<script lang="ts">
  import { page } from "$app/state";
  import { getBattle } from "$lib/remote/battle.remote";
  import * as Card from "$lib/components/ui/card";
  import * as Empty from "$lib/components/ui/empty";
  import { Button } from "$lib/components/ui/button";
</script>

<main class="col-content">
  <svelte:boundary>
    {@const battle = await getBattle(page.params.id!)}

    <Card.Root>
      <Card.Header>
        <Card.Title>{battle.name}</Card.Title>
        <Card.Description
          >{battle.visibility} · {battle.status}</Card.Description
        >
      </Card.Header>
      <Card.Content>
        <dl class="grid gap-2 text-sm">
          <div class="flex justify-between">
            <dt class="text-muted-foreground">Max players</dt>
            <dd>{battle.maxPlayers}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-muted-foreground">Double submissions</dt>
            <dd>{battle.doubleSubmissions ? "Yes" : "No"}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-muted-foreground">Created</dt>
            <dd>{new Date(battle.createdAt).toLocaleDateString()}</dd>
          </div>
        </dl>
      </Card.Content>
      <Card.Footer>
        {#if battle.creatorId === page.data.user?.id}
          <Button href="/b/{battle.id}/edit">Edit</Button>
        {/if}
      </Card.Footer>
    </Card.Root>

    {#snippet pending()}
      <div class="animate-pulse">Loading...</div>
    {/snippet}

    {#snippet failed(error, reset)}
      <Empty.Root>
        <Empty.Content>
          <Empty.Title>Something went wrong</Empty.Title>
          <Empty.Description
            >{error instanceof Error
              ? error.message
              : "Unknown error"}</Empty.Description
          >
          <Button onclick={reset}>Try again</Button>
        </Empty.Content>
      </Empty.Root>
    {/snippet}
  </svelte:boundary>
</main>
