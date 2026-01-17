<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import Star from "@lucide/svelte/icons/star";
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import SpotifyEmbed from "$lib/components/spotify-embed.svelte";
  import { getRankLabel } from "$lib/utils/format";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<main class="col-content space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="font-display font-bold uppercase">
        Stage {data.stage.stageNumber} Results
      </h1>
      <p class="text-muted-foreground">{data.stage.vibe}</p>
    </div>
    <div class="flex gap-2">
      {#if data.prevStage}
        <Button
          variant="outline"
          size="sm"
          href="/b/{data.battle.id}/s/{data.prevStage.id}/results"
        >
          <ChevronLeft class="size-4" />
          Prev
        </Button>
      {/if}
      {#if data.nextStage}
        <Button
          variant="outline"
          size="sm"
          href="/b/{data.battle.id}/s/{data.nextStage.id}/results"
        >
          Next
          <ChevronRight class="size-4" />
        </Button>
      {/if}
    </div>
  </div>

  <Card.Root>
    <Card.Header>
      <Card.Title>Rankings</Card.Title>
      {#if data.stage.phase !== "closed"}
        <Card.Description
          >Voting still open — results may change</Card.Description
        >
      {/if}
    </Card.Header>
    <Card.Content class="space-y-6">
      {#each data.results as result}
        <div
          class="space-y-3 border-b pb-6 last:border-b-0 last:pb-0 {result.rank ===
          1
            ? '-mx-6 rounded-lg bg-gradient-to-r from-yellow-500/10 to-transparent px-6 py-4'
            : ''}"
        >
          <div class="flex items-center gap-3">
            <Badge
              variant={result.rank === 1 ? "default" : "secondary"}
              class={result.rank === 1 ? "bg-yellow-500 text-yellow-950" : ""}
            >
              {getRankLabel(result.rank)}
            </Badge>
            <span class="font-medium">{result.submission.user.name}</span>
            <span class="ml-auto flex items-center gap-1 text-sm">
              <Star
                class="size-4 {result.rank === 1
                  ? 'fill-yellow-500 text-yellow-500'
                  : 'text-muted-foreground'}"
              />
              {result.starsReceived}
            </span>
          </div>

          <SpotifyEmbed url={result.submission.spotifyUrl} />

          {#if result.submission.note}
            <p class="text-sm text-muted-foreground italic">
              "{result.submission.note}"
            </p>
          {/if}

          {#if result.voters.length > 0}
            <div class="space-y-1 border-l-2 border-muted pl-4">
              {#each result.voters as voter}
                <p class="text-xs text-muted-foreground">{voter.name}</p>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </Card.Content>
  </Card.Root>

  <div class="flex gap-2">
    <Button variant="outline" href="/b/{data.battle.id}/s/{data.stage.id}">
      Back to Stage
    </Button>
    <Button variant="outline" href="/b/{data.battle.id}">
      Battle Overview
    </Button>
  </div>
</main>
