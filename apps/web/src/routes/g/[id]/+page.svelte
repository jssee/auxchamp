<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { acceptInvite, advanceRound, saveBallot, startGame } from '$lib/game.remote';

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
		game.actorPlayer?.status === 'active' &&
			game.activeRound !== null &&
			game.activeRound.phase === 'submitting',
	);
	let canVote = $derived(
		game.actorPlayer?.status === 'active' &&
			game.activeRound !== null &&
			game.activeRound.phase === 'voting',
	);
	let canAdvance = $derived(isCreator && isActive && game.activeRound !== null);

	// Map playerId → player name for display in voting/results/standings.
	let playerNameById = $derived(
		new Map(game.players.map((p) => [p.id, p.userName])),
	);

	// Voting state: track which submissions the actor has starred.
	let selectedSubmissions = $state<Set<string>>(new Set());

	// Reset selections when ballot data changes (e.g., after save or round advance).
	$effect(() => {
		if (game.actorBallot) {
			selectedSubmissions = new Set(game.actorBallot.submissionIds);
		} else {
			selectedSubmissions = new Set();
		}
	});

	let error = $state('');

	function toggleStar(submissionId: string) {
		const next = new Set(selectedSubmissions);
		if (next.has(submissionId)) {
			next.delete(submissionId);
		} else if (next.size < 3) {
			next.add(submissionId);
		}
		selectedSubmissions = next;
	}

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

	async function handleAdvanceRound() {
		error = '';
		try {
			await advanceRound({ gameId: game.id });
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong.';
		}
	}

	async function handleSaveBallot() {
		error = '';
		try {
			await saveBallot({ gameId: game.id, submissionIds: [...selectedSubmissions] });
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

	<!-- Advance round (creator only) -->
	{#if canAdvance}
		<section class="rounded border border-amber-200 bg-amber-50 p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium">
						Round {game.activeRound?.number} is in
						<span class="font-semibold">{game.activeRound?.phase}</span> phase.
					</p>
					<p class="mt-0.5 text-xs text-neutral-500">
						{#if game.activeRound?.phase === 'submitting'}
							Advance to open voting.
						{:else if game.activeRound?.phase === 'voting'}
							Advance to score this round.
						{/if}
					</p>
				</div>
				<button
					class="border border-amber-300 bg-white px-3 py-1 text-sm font-medium disabled:opacity-50"
					disabled={advanceRound.pending > 0}
					onclick={handleAdvanceRound}
				>
					{#if advanceRound.pending > 0}
						Advancing...
					{:else if game.activeRound?.phase === 'submitting'}
						Open Voting
					{:else}
						Score Round
					{/if}
				</button>
			</div>
		</section>
	{/if}

	<!-- Submission (submitting phase only) -->
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

	<!-- Voting (voting phase only) -->
	{#if isActive && canVote && game.votingSubmissions}
		<section>
			<h2 class="mb-2 font-semibold text-lg">
				Vote on Round {game.activeRound?.number}: {game.activeRound?.theme}
			</h2>
			{#if game.activeRound?.votingClosesAt}
				<p class="mb-2 text-xs text-neutral-400">
					Voting closes {new Date(game.activeRound.votingClosesAt).toLocaleDateString()}
				</p>
			{/if}
			<p class="mb-3 text-sm text-neutral-500">
				Star exactly 3 submissions. You cannot star your own.
				<span class="font-medium">({selectedSubmissions.size}/3 selected)</span>
			</p>

			<ul class="space-y-2">
				{#each game.votingSubmissions.filter((s) => s.playerId !== game.actorPlayer.id) as vs (vs.id)}
					{@const isSelected = selectedSubmissions.has(vs.id)}
					<li>
						<button
							class="w-full rounded border px-4 py-3 text-left text-sm transition-colors
								{isSelected ? 'border-purple-400 bg-purple-50' : 'border-neutral-200 hover:border-neutral-300'}"
							onclick={() => toggleStar(vs.id)}
							disabled={!isSelected && selectedSubmissions.size >= 3}
						>
							<div class="flex items-center justify-between">
								<div class="min-w-0">
									<p class="truncate font-medium">{vs.spotifyTrackUrl}</p>
									{#if vs.note}
										<p class="mt-0.5 text-neutral-500">{vs.note}</p>
									{/if}
									<p class="mt-0.5 text-xs text-neutral-400">
										by {playerNameById.get(vs.playerId) ?? 'Unknown'}
									</p>
								</div>
								<span class="ml-3 text-lg">{isSelected ? '★' : '☆'}</span>
							</div>
						</button>
					</li>
				{/each}
			</ul>

			<button
				class="mt-4 w-full border px-4 py-2 font-medium disabled:opacity-50"
				disabled={selectedSubmissions.size !== 3 || saveBallot.pending > 0}
				onclick={handleSaveBallot}
			>
				{#if saveBallot.pending > 0}
					Saving...
				{:else if game.actorBallot}
					Update Ballot
				{:else}
					Submit Ballot
				{/if}
			</button>

			{#if game.actorBallot}
				<p class="mt-2 text-xs text-green-600">&#10003; Your ballot has been recorded.</p>
			{/if}
		</section>
	{/if}

	<!-- Round results -->
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
						<span class="font-medium">
							{standing.totalStars} ★
						</span>
					</li>
				{/each}
			</ol>
		</section>
	{/if}
</div>
