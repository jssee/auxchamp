<script lang="ts">
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import Star from "@lucide/svelte/icons/star";
  import Trophy from "@lucide/svelte/icons/trophy";
  import * as Item from "$lib/components/ui/item";
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { getRankLabel } from "$lib/utils/format";
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

  {#if data.hasClosedStages && data.standings.length > 0}
    <Card.Root>
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Trophy class="size-5" />
          Battle Standings
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="space-y-2">
          {#each data.standings as standing}
            <div
              class="flex items-center gap-3 rounded-lg p-2 {standing.rank === 1
                ? 'bg-yellow-500/10'
                : ''}"
            >
              <Badge
                variant={standing.rank === 1 ? "default" : "secondary"}
                class={standing.rank === 1
                  ? "bg-yellow-500 text-yellow-950"
                  : ""}
              >
                {getRankLabel(standing.rank)}
              </Badge>
              <span class="flex-1 font-medium">{standing.user.name}</span>
              <span
                class="flex items-center gap-1 text-sm text-muted-foreground"
              >
                <Star class="size-4" />
                {standing.totalStarsEarned}
              </span>
              {#if standing.stagesWon > 0}
                <span class="text-xs text-muted-foreground">
                  ({standing.stagesWon} stage{standing.stagesWon !== 1
                    ? "s"
                    : ""} won)
                </span>
              {/if}
            </div>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  {#if data.stages.length > 0}
    <Card.Root>
      <Card.Header>
        <Card.Title>Stages</Card.Title>
      </Card.Header>
      <Card.Content>
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
      </Card.Content>
    </Card.Root>
  {/if}
</main>
