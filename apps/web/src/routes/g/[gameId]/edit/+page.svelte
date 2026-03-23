<script lang="ts">
	import { startGame } from '$lib/game.remote';

	import { Button } from '$lib/components/ui/button';
	import * as Field from '$lib/components/ui/field';
	import * as Item from '$lib/components/ui/item';
	import PhaseBadge from '../PhaseBadge.svelte';
	import PlayerList from '../PlayerList.svelte';
	import AddRoundForm from './AddRoundForm.svelte';
	import InvitePlayerForm from './InvitePlayerForm.svelte';

	const { data } = $props();
	let game = $derived(data.game);
</script>

<h2 class="font-semibold text-lg">Manage Game</h2>

<!-- Players + Invite -->
<section>
	<h3 class="mb-2 font-medium">
		Players ({game.players.filter((p) => p.status === 'active').length} active)
	</h3>
	<PlayerList players={game.players} />

	{#if game.actions.includes('invite_player')}
		<InvitePlayerForm gameId={game.id} />
	{/if}
</section>

<!-- Rounds + Add Round -->
<section>
	<h3 class="mb-2 font-medium">Rounds</h3>
	{#if game.rounds.length === 0}
		<p class="text-sm text-neutral-500">No rounds yet.</p>
	{:else}
		<Item.Group>
			{#each game.rounds as r (r.id)}
				<Item.Root size="sm" variant="outline">
					<Item.Content>
						<Item.Title>Round {r.number}: {r.theme}</Item.Title>
						{#if r.description}
							<Item.Description>{r.description}</Item.Description>
						{/if}
					</Item.Content>
					<Item.Actions>
						<PhaseBadge phase={r.phase} />
					</Item.Actions>
				</Item.Root>
			{/each}
		</Item.Group>
	{/if}

	{#if game.actions.includes('edit_future_round')}
		<AddRoundForm gameId={game.id} />
	{/if}
</section>

<!-- Start game -->
{#if game.actions.includes('start_game')}
	<form {...startGame}>
		<input {...startGame.fields.gameId.as('hidden', game.id)} />
		<Button type="submit" class="w-full" disabled={startGame.pending > 0}>
			{startGame.pending > 0 ? 'Starting...' : 'Start Game'}
		</Button>
		<Field.Error errors={startGame.fields.gameId.issues()} />
	</form>
{/if}

{#if game.state === 'draft' && !game.actions.includes('start_game')}
	<p class="text-xs text-neutral-400">
		Need at least 4 active players and 1 round to start.
	</p>
{/if}
