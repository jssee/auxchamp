<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import Star from "@lucide/svelte/icons/star";
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  function extractTrackId(url: string): string | null {
    const match = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  function getRankLabel(rank: number): string {
    if (rank === 1) return "1st";
    if (rank === 2) return "2nd";
    if (rank === 3) return "3rd";
    return `${rank}th`;
  }
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
        {@const trackId = result.submission.spotifyUrl
          ? extractTrackId(result.submission.spotifyUrl)
          : null}
        <div
          class="space-y-3 pb-6 border-b last:border-b-0 last:pb-0 {result.rank ===
          1
            ? 'bg-gradient-to-r from-yellow-500/10 to-transparent -mx-6 px-6 py-4 rounded-lg'
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

          {#if trackId}
            <iframe
              title="Spotify embed"
              src="https://open.spotify.com/embed/track/{trackId}"
              width="100%"
              height="80"
              allow="encrypted-media"
              style="border-radius: 12px"
            ></iframe>
          {:else}
            <p class="text-sm text-muted-foreground">
              {result.submission.spotifyUrl}
            </p>
          {/if}

          {#if result.submission.note}
            <p class="text-sm text-muted-foreground italic">
              "{result.submission.note}"
            </p>
          {/if}

          {#if result.voters.length > 0}
            <div class="pl-4 border-l-2 border-muted space-y-1">
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
