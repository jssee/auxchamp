<script lang="ts">
  import { getBattles } from "$lib/remote/battle.remote";
  import * as Card from "$lib/components/ui/card";
  import * as Empty from "$lib/components/ui/empty";
  import { Button } from "$lib/components/ui/button";
</script>

<main class="col-content">
  <header class="mb-6 flex items-center justify-between">
    <h1 class="text-2xl font-bold">My Battles</h1>
    <Button href="/b/new">New Battle</Button>
  </header>

  <svelte:boundary>
    {@const battles = await getBattles()}

    {#if battles.length === 0}
      <Empty.Root>
        <Empty.Content>
          <Empty.Title>No battles yet</Empty.Title>
          <Empty.Description
            >Create your first battle to get started.</Empty.Description
          >
          <Button href="/b/new">Create Battle</Button>
        </Empty.Content>
      </Empty.Root>
    {:else}
      <div class="grid gap-4">
        {#each battles as battle}
          <a href="/b/{battle.id}">
            <Card.Root>
              <Card.Header>
                <Card.Title>{battle.name}</Card.Title>
                <Card.Description
                  >{battle.visibility} · {battle.status}</Card.Description
                >
              </Card.Header>
            </Card.Root>
          </a>
        {/each}
      </div>
    {/if}

    {#snippet pending()}
      <div class="animate-pulse">Loading battles...</div>
    {/snippet}

    {#snippet failed(error: unknown, reset: () => void)}
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
