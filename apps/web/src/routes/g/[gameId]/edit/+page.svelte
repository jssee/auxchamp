<script lang="ts">
	import { startGame } from '$lib/game.remote';

	import { Button } from '$lib/components/ui/button';
	import * as Field from '$lib/components/ui/field';
	import AddRoundForm from './AddRoundForm.svelte';
	import InvitePlayerForm from './InvitePlayerForm.svelte';

	const { data } = $props();
	let game = $derived(data.game);

	let can = $derived((action: (typeof game.actions)[number]) => game.actions.includes(action));
</script>

<h2 class="font-semibold text-lg">Manage Game</h2>

<!-- Players + Invite -->
<section>
	<h3 class="mb-2 font-medium">
		Players ({game.players.filter((p) => p.status === 'active').length} active)
	</h3>
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

	{#if can('invite_player')}
		<InvitePlayerForm gameId={game.id} />
	{/if}
</section>

<!-- Rounds + Add Round -->
<section>
	<h3 class="mb-2 font-medium">Rounds</h3>
	{#if game.rounds.length === 0}
		<p class="text-sm text-neutral-500">No rounds yet.</p>
	{:else}
		<ul class="space-y-2">
			{#each game.rounds as r (r.id)}
				<li class="flex items-center justify-between rounded border px-3 py-2 text-sm">
					<div>
						<span class="font-medium">Round {r.number}:</span>
						{r.theme}
						{#if r.description}
							<span class="text-neutral-400">— {r.description}</span>
						{/if}
					</div>
					<span
						class="rounded-full px-2 py-0.5 text-xs
							{r.phase === 'pending' ? 'bg-neutral-100 text-neutral-600' : ''}
							{r.phase === 'submitting' ? 'bg-green-100 text-green-800' : ''}
							{r.phase === 'voting' ? 'bg-purple-100 text-purple-800' : ''}
							{r.phase === 'scored' ? 'bg-blue-100 text-blue-800' : ''}"
					>
						{r.phase}
					</span>
				</li>
			{/each}
		</ul>
	{/if}

	{#if can('edit_future_round')}
		<AddRoundForm gameId={game.id} />
	{/if}
</section>

<!-- Start game -->
{#if can('start_game')}
	<form {...startGame}>
		<input {...startGame.fields.gameId.as('hidden', game.id)} />
		<Button type="submit" class="w-full" disabled={startGame.pending > 0}>
			{startGame.pending > 0 ? 'Starting...' : 'Start Game'}
		</Button>
		<Field.Error errors={startGame.fields.gameId.issues()} />
	</form>
{/if}

{#if game.state === 'draft' && !can('start_game')}
	<p class="text-xs text-neutral-400">
		Need at least 4 active players and 1 round to start.
	</p>
{/if}
