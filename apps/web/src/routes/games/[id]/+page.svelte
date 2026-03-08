<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import {
		accept_invite,
		add_round,
		invite_player,
		start_game,
		upsert_submission,
	} from '$lib/game.remote';

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

	// -- form state --
	let roundTheme = $state('');
	let roundDescription = $state('');
	let inviteEmail = $state('');
	// Intentionally capture initial values — user edits should not reset on data refresh
	let trackUrl = $state(data.game.actorSubmission?.spotifyTrackUrl ?? '');
	let trackNote = $state(data.game.actorSubmission?.note ?? '');
	let busy = $state('');
	let error = $state('');

	async function run(key: string, fn: () => Promise<unknown>) {
		busy = key;
		error = '';
		try {
			await fn();
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong.';
		} finally {
			busy = '';
		}
	}

	function handleAddRound() {
		run('addRound', async () => {
			await add_round({ gameId: game.id, theme: roundTheme, description: roundDescription || null });
			roundTheme = '';
			roundDescription = '';
		});
	}

	function handleInvite() {
		run('invite', async () => {
			await invite_player({ gameId: game.id, targetUserEmail: inviteEmail });
			inviteEmail = '';
		});
	}

	function handleAccept() {
		run('accept', () => accept_invite({ gameId: game.id }));
	}

	function handleStart() {
		run('start', () => start_game({ gameId: game.id }));
	}

	function handleSubmit() {
		run('submit', () =>
			upsert_submission({
				gameId: game.id,
				spotifyTrackUrl: trackUrl,
				note: trackNote || null,
			}),
		);
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
				disabled={busy === 'accept'}
				onclick={handleAccept}
			>
				{busy === 'accept' ? 'Accepting...' : 'Accept Invite'}
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
			<form class="mt-3 flex gap-2" onsubmit={(e) => { e.preventDefault(); handleInvite(); }}>
				<input
					type="email"
					placeholder="Invite by email"
					class="flex-1 border px-3 py-1 text-sm"
					required
					bind:value={inviteEmail}
				/>
				<button type="submit" class="border px-3 py-1 text-sm" disabled={busy === 'invite'}>
					{busy === 'invite' ? 'Inviting...' : 'Invite'}
				</button>
			</form>
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
			<form class="mt-3 space-y-2" onsubmit={(e) => { e.preventDefault(); handleAddRound(); }}>
				<div class="flex gap-2">
					<input
						type="text"
						placeholder="Round theme"
						class="flex-1 border px-3 py-1 text-sm"
						required
						bind:value={roundTheme}
					/>
					<button type="submit" class="border px-3 py-1 text-sm" disabled={busy === 'addRound'}>
						{busy === 'addRound' ? 'Adding...' : 'Add Round'}
					</button>
				</div>
				<input
					type="text"
					placeholder="Description (optional)"
					class="w-full border px-3 py-1 text-sm"
					bind:value={roundDescription}
				/>
			</form>
		{/if}
	</section>

	<!-- Start game -->
	{#if isCreator && isDraft}
		<section>
			<button
				class="w-full border px-4 py-2 font-medium disabled:opacity-50"
				disabled={!canStart || busy === 'start'}
				onclick={handleStart}
			>
				{busy === 'start' ? 'Starting...' : 'Start Game'}
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
			<form class="space-y-2" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
				<input
					type="url"
					placeholder="Spotify track URL"
					class="w-full border px-3 py-2 text-sm"
					required
					bind:value={trackUrl}
				/>
				<input
					type="text"
					placeholder="Note (optional)"
					class="w-full border px-3 py-2 text-sm"
					bind:value={trackNote}
				/>
				<button type="submit" class="w-full border px-4 py-2 text-sm font-medium" disabled={busy === 'submit'}>
					{#if busy === 'submit'}
						Submitting...
					{:else if game.actorSubmission}
						Update Submission
					{:else}
						Submit
					{/if}
				</button>
			</form>
			{#if game.actorSubmission}
				<p class="mt-2 text-xs text-green-600">
					✓ You submitted: {game.actorSubmission.spotifyTrackUrl}
				</p>
			{/if}
		</section>
	{/if}
</div>
