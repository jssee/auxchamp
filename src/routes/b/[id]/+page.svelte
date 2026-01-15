<script lang="ts">
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import * as Item from "$lib/components/ui/item";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<main class="col-content space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="font-display font-bold uppercase">{data.battle.name}</h1>
      <Badge variant="secondary">{data.battle.visibility}</Badge>
      <Badge variant="secondary">Players: {data.battle.maxPlayers}</Badge>
      <Badge variant="secondary">{data.battle.status}</Badge>
    </div>
    {#if data.battle.creatorId === data.user?.id && data.battle.status !== "cancelled"}
      <Button href="/b/{data.battle.id}/edit">Edit</Button>
    {/if}
  </div>

  {#if data.stages.length > 0}
    <ul class="space-y-2">
      {#each data.stages as stage}
        <Item.Root>
          {#snippet child({ props })}
            <a href="/b/{data.battle.id}/s/{stage.id}" {...props}>
              <Item.Media
                class="size-10 rounded-md bg-muted font-display text-sm font-bold"
              >
                {stage.stageNumber}
              </Item.Media>
              <Item.Content>
                <Item.Title>
                  {stage.vibe}
                </Item.Title>
                <Item.Description>
                  {stage.phase}
                </Item.Description>
              </Item.Content>
              <Item.Actions>
                <ChevronRight class="size-4" />
              </Item.Actions>
            </a>
          {/snippet}
        </Item.Root>
      {/each}
    </ul>
  {/if}
</main>
