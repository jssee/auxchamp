<script lang="ts">
  import * as Item from "$lib/components/ui/item";
  import PhaseBadge from "./PhaseBadge.svelte";
  import PlayerList from "./PlayerList.svelte";
  import ResultsList from "./ResultsList.svelte";

  const { data } = $props();
  let game = $derived(data.game);

  let playerNameById = $derived(
    new Map(game.players.map((p) => [p.id, p.userName])),
  );
</script>

{#if game.actions.includes("edit_game")}
  <a href="/g/{game.id}/edit" class="text-sm text-neutral-500 hover:underline"
    >Edit game →</a
  >
{/if}

<!-- Players -->
<section>
  <h2 class="mb-2 text-lg font-semibold">
    Players ({game.players.filter((p) => p.status === "active").length} active)
  </h2>
  <PlayerList players={game.players} />
</section>

<!-- Rounds -->
<section>
  <h2 class="mb-2 text-lg font-semibold">Rounds</h2>
  {#if game.rounds.length === 0}
    <p class="text-sm text-neutral-500">No rounds yet.</p>
  {:else}
    <Item.Group>
      {#each game.rounds as r, i (r.id)}
        <Item.Root size="sm" variant="outline">
          {#snippet child({ props })}
            <a href="/g/{game.id}/r/{r.id}" {...props}>
              <Item.Content>
                <Item.Title>Round {r.number}: {r.theme}</Item.Title>
                {#if r.description}
                  <Item.Description>{r.description}</Item.Description>
                {/if}
              </Item.Content>
              <Item.Actions>
                <span class="text-xs text-neutral-400"
                  >{r.submissionCount} submitted</span
                >
                <PhaseBadge phase={r.phase} />
              </Item.Actions>
            </a>
          {/snippet}
        </Item.Root>
      {/each}
    </Item.Group>
  {/if}
</section>

<!-- Round results (inline for scored rounds) -->
{#if game.roundResults.length > 0}
  <section>
    <h2 class="mb-3 text-lg font-semibold">Results</h2>
    <div class="space-y-4">
      {#each game.roundResults as result (result.roundId)}
        {@const roundInfo = game.rounds.find((r) => r.id === result.roundId)}
        <div class="rounded border p-4">
          <h3 class="mb-2 font-medium">
            Round {result.roundNumber}{roundInfo ? `: ${roundInfo.theme}` : ""}
          </h3>
          <ResultsList submissions={result.submissions} {playerNameById} />
        </div>
      {/each}
    </div>
  </section>
{/if}

<!-- Standings -->
{#if game.standings.length > 0}
  <section>
    <h2 class="mb-3 text-lg font-semibold">Standings</h2>
    <Item.Group>
      {#each game.standings as standing, i (standing.playerId)}
        <Item.Root size="sm" variant="outline">
          <Item.Media>
            <span class="w-6 text-sm font-medium text-neutral-400"
              >{i + 1}.</span
            >
          </Item.Media>
          <Item.Content>
            <Item.Title>
              {playerNameById.get(standing.playerId) ?? "Unknown"}
            </Item.Title>
          </Item.Content>
          <Item.Actions>
            <span class="text-sm font-medium">{standing.totalStars} ★</span>
          </Item.Actions>
        </Item.Root>
      {/each}
    </Item.Group>
  </section>
{/if}
