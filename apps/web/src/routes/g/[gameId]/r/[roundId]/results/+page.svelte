<script lang="ts">
	const { data } = $props();
	let round = $derived(data.round);
	let game = $derived(data.game);

	let playerNameById = $derived(new Map(game.players.map((p) => [p.id, p.userName])));
</script>

<div>
	<div class="flex items-center gap-2">
		<h2 class="font-semibold text-lg">Round {round.number}: {round.theme}</h2>
		<span class="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">scored</span>
	</div>
	{#if round.description}
		<p class="mt-1 text-neutral-500">{round.description}</p>
	{/if}
</div>

<section>
	<h3 class="mb-2 font-medium">Results</h3>
	{#if !round.results || round.results.submissions.length === 0}
		<p class="text-sm text-neutral-400">No submissions were scored.</p>
	{:else}
		<ol class="space-y-1">
			{#each round.results.submissions as sub, i (sub.submissionId)}
				<li class="flex items-center justify-between text-sm">
					<div class="flex items-center gap-2">
						<span class="w-5 text-neutral-400">{i + 1}.</span>
						<span class="truncate">{sub.spotifyTrackUrl}</span>
						<span class="text-neutral-400">
							— {playerNameById.get(sub.playerId) ?? 'Unknown'}
						</span>
					</div>
					<span class="font-medium">
						{'★'.repeat(sub.starCount)}
						{#if sub.starCount === 0}
							<span class="text-neutral-300">☆</span>
						{/if}
					</span>
				</li>
			{/each}
		</ol>
	{/if}
</section>

<a href="/g/{game.id}/r/{round.id}" class="text-sm text-neutral-500 hover:underline">
	← Back to round
</a>
