<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { acceptInvite, startGame } from '$lib/game.remote';

	import AddRoundForm from './AddRoundForm.svelte';
	import InvitePlayerForm from './InvitePlayerForm.svelte';
	import SubmissionForm from './SubmissionForm.svelte';

	const { data } = $props();
	let game = $derived(data.game);

	let isCreator = $derived(game.actorPlayer?.role === 'creator');
	let isDraft = $derived(game.state === 'draft');
	let isActive = $derived(game.state === 'active');
	let canStart = $derived(
		isCreator &&
			isDraft &&
			game.rounds.length >= 1 &&
			game.players.filter((p) => p.status === 'active').length >= 4,
	);
	let isInvited = $derived(game.actorPlayer?.status === 'invited');
	let canSubmit = $derived(
		game.actorPlayer?.status === 'active' && game.activeRound !== null,
	);
	let error = $state('');

	async function handleAccept() {
		error = '';

		try {
			await acceptInvite({ gameId: game.id });
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong.';
		}
	}

	async function handleStart() {
		error = '';

		try {
			await startGame({ gameId: game.id });
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong.';
		}
	}
</script>

<div class="container mx-auto max-w-2xl space-y-8 px-4 py-8">
	<!-- Header -->
	<div>
		<div class="flex items-center gap-3">
			<h1 class="font-bold text-2xl">{game.name}</h1>
			<span
				class="rounded-full px-2 py-0.5 text-xs font-medium uppercase
					{game.state === 'draft' ? 'bg-yellow-100 text-yellow-800' : ''}
					{game.state === 'active' ? 'bg-green-100 text-green-800' : ''}
					{game.state === 'completed' ? 'bg-neutral-100 text-neutral-600' : ''}"
			>
				{game.state}
			</span>
		</div>
		{#if game.description}
			<p class="mt-1 text-neutral-500">{game.description}</p>
		{/if}
	</div>

	{#if error}
		<p class="text-sm text-red-500" role="alert">{error}</p>
	{/if}

	<!-- Accept invite banner -->
	{#if isInvited}
		<div class="flex items-center justify-between rounded border border-blue-200 bg-blue-50 p-4">
			<p class="text-sm">You've been invited to this game.</p>
			<button
				class="border px-3 py-1 text-sm font-medium"
				disabled={acceptInvite.pending > 0}
				onclick={handleAccept}
			>
				{acceptInvite.pending > 0 ? 'Accepting...' : 'Accept Invite'}
			</button>
		</div>
	{/if}

	<!-- Players -->
	<section>
		<h2 class="mb-2 font-semibold text-lg">Players ({game.players.filter((p) => p.status === 'active').length} active)</h2>
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

		{#if isCreator && isDraft}
			<InvitePlayerForm gameId={game.id} />
		{/if}
	</section>

	<!-- Rounds -->
	<section>
		<h2 class="mb-2 font-semibold text-lg">Rounds</h2>
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
					</li>
				{/each}
			</ul>
		{/if}

		{#if isCreator && isDraft}
			<AddRoundForm gameId={game.id} />
		{/if}
	</section>

	<!-- Start game -->
	{#if isCreator && isDraft}
		<section>
			<button
				class="w-full border px-4 py-2 font-medium disabled:opacity-50"
				disabled={!canStart || startGame.pending > 0}
				onclick={handleStart}
			>
				{startGame.pending > 0 ? 'Starting...' : 'Start Game'}
			</button>
			{#if !canStart}
				<p class="mt-1 text-xs text-neutral-400">
					Need at least 4 active players and 1 round to start.
				</p>
			{/if}
		</section>
	{/if}

	<!-- Submission -->
	{#if isActive && canSubmit}
		<section>
			<h2 class="mb-2 font-semibold text-lg">
				Submit for Round {game.activeRound?.number}: {game.activeRound?.theme}
			</h2>
			{#if game.activeRound?.submissionClosesAt}
				<p class="mb-2 text-xs text-neutral-400">
					Window closes {new Date(game.activeRound.submissionClosesAt).toLocaleDateString()}
				</p>
			{/if}
			<SubmissionForm
				gameId={game.id}
				initialTrackUrl={game.actorSubmission?.spotifyTrackUrl ?? ''}
				initialNote={game.actorSubmission?.note ?? ''}
				hasExisting={!!game.actorSubmission}
			/>
			{#if game.actorSubmission}
				<p class="mt-2 text-xs text-green-600">
					&#10003; You submitted: {game.actorSubmission.spotifyTrackUrl}
				</p>
			{/if}
		</section>
	{/if}
</div>
