<script lang="ts">
  import PhaseBadge from "../../../PhaseBadge.svelte";
  import ResultsList from "../../../ResultsList.svelte";

  const { data } = $props();
  let round = $derived(data.round);
  let game = $derived(data.game);

  let playerNameById = $derived(
    new Map(game.players.map((p) => [p.id, p.userName])),
  );
</script>

<div>
  <div class="flex items-center gap-2">
    <h2 class="text-lg font-semibold">Round {round.number}: {round.theme}</h2>
    <PhaseBadge phase="scored" />
  </div>
  {#if round.description}
    <p class="mt-1 text-neutral-500">{round.description}</p>
  {/if}
</div>

<section>
  <h3 class="mb-2 font-medium">Results</h3>
  <ResultsList
    submissions={round.results?.submissions ?? []}
    {playerNameById}
  />
</section>

<a
  href="/g/{game.id}/r/{round.id}"
  class="text-sm text-neutral-500 hover:underline"
>
  ← Back to round
</a>
