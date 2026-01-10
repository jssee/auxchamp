<script lang="ts">
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import { getBattles } from "$lib/remote/battle.remote";
  import * as Empty from "$lib/components/ui/empty";
  import * as Item from "$lib/components/ui/item";
  import { Button } from "$lib/components/ui/button";
  import { Spinner } from "$lib/components/ui/spinner";
</script>

<main class="col-content">
  <header class="mb-6 flex items-center justify-between">
    <h1 class="text-lg font-medium">Battles</h1>
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
      <div class="flex flex-col gap-2">
        {#each battles as battle}
          <Item.Root>
            {#snippet child({ props })}
              <a href="/b/{battle.id}" {...props}>
                <Item.Content>
                  <Item.Title>{battle.name}</Item.Title>
                  <Item.Description>
                    {battle.status}
                  </Item.Description>
                </Item.Content>
                <Item.Actions>
                  <ChevronRight class="size-4" />
                </Item.Actions>
              </a>
            {/snippet}
          </Item.Root>
        {/each}
      </div>
    {/if}

    {#snippet pending()}
      <Empty.Root>
        <Empty.Content>
          <Spinner />
        </Empty.Content>
      </Empty.Root>
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
