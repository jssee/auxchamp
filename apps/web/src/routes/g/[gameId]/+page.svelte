<script lang="ts">
	const { data } = $props();
	let game = $derived(data.game);

	let playerNameById = $derived(new Map(game.players.map((p) => [p.id, p.userName])));
</script>

<!-- Players -->
<section>
	<h2 class="mb-2 font-semibold text-lg">
		Players ({game.players.filter((p) => p.status === 'active').length} active)
	</h2>
	<ul class="space-y-1">
		{#each game.players as p (p.id)}
			<li class="flex items-center gap-2 text-sm">
				<span class="font-medium">{p.userName}</span>
				<span class="text-neutral-400">
					{p.role === 'creator' ? '(creator)' : ''}
					{p.status === 'invited' ? '— invited' : ''}
					{p.status === 'left' ? '— left' : ''}
					{p.status === 'removed' ? '— removed' : ''}
				</span>
			</li>
		{/each}
	</ul>
</section>

<!-- Rounds -->
<section>
	<h2 class="mb-2 font-semibold text-lg">Rounds</h2>
	{#if game.rounds.length === 0}
		<p class="text-sm text-neutral-500">No rounds yet.</p>
	{:else}
		<ul class="space-y-2">
			{#each game.rounds as r (r.id)}
				<li>
					<a
						href="/g/{game.id}/r/{r.id}"
						class="flex items-center justify-between rounded border px-3 py-2 text-sm transition-colors hover:bg-neutral-50"
					>
						<div>
							<span class="font-medium">Round {r.number}:</span>
							{r.theme}
							{#if r.description}
								<span class="text-neutral-400">— {r.description}</span>
							{/if}
						</div>
						<div class="flex items-center gap-2">
							<span class="text-neutral-400">{r.submissionCount} submitted</span>
							<span
								class="rounded-full px-2 py-0.5 text-xs
									{r.phase === 'pending' ? 'bg-neutral-100 text-neutral-600' : ''}
									{r.phase === 'submitting' ? 'bg-green-100 text-green-800' : ''}
									{r.phase === 'voting' ? 'bg-purple-100 text-purple-800' : ''}
									{r.phase === 'scored' ? 'bg-blue-100 text-blue-800' : ''}"
							>
								{r.phase}
							</span>
						</div>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<!-- Round results (inline for scored rounds) -->
{#if game.roundResults.length > 0}
	<section>
		<h2 class="mb-3 font-semibold text-lg">Results</h2>
		<div class="space-y-4">
			{#each game.roundResults as result (result.roundId)}
				{@const roundInfo = game.rounds.find((r) => r.id === result.roundId)}
				<div class="rounded border p-4">
					<h3 class="mb-2 font-medium">
						Round {result.roundNumber}{roundInfo ? `: ${roundInfo.theme}` : ''}
					</h3>
					{#if result.submissions.length === 0}
						<p class="text-sm text-neutral-400">No submissions were scored.</p>
					{:else}
						<ol class="space-y-1">
							{#each result.submissions as sub, i (sub.submissionId)}
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
				</div>
			{/each}
		</div>
	</section>
{/if}

<!-- Standings -->
{#if game.standings.length > 0}
	<section>
		<h2 class="mb-3 font-semibold text-lg">Standings</h2>
		<ol class="space-y-1">
			{#each game.standings as standing, i (standing.playerId)}
				<li class="flex items-center justify-between rounded border px-3 py-2 text-sm">
					<div class="flex items-center gap-2">
						<span class="w-6 font-medium text-neutral-400">{i + 1}.</span>
						<span class="font-medium">
							{playerNameById.get(standing.playerId) ?? 'Unknown'}
						</span>
					</div>
					<span class="font-medium">{standing.totalStars} ★</span>
				</li>
			{/each}
		</ol>
	</section>
{/if}
