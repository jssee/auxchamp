<script lang="ts">
	import { advanceRound } from '$lib/game.remote';

	import { Button } from '$lib/components/ui/button';
	import * as Field from '$lib/components/ui/field';
	import BallotForm from './BallotForm.svelte';
	import SubmissionForm from './SubmissionForm.svelte';

	const { data } = $props();
	let round = $derived(data.round);
	let game = $derived(data.game);

	let can = $derived((action: (typeof round.actions)[number]) => round.actions.includes(action));

	let playerNameById = $derived(new Map(game.players.map((p) => [p.id, p.userName])));
</script>

<!-- Round header -->
<div>
	<div class="flex items-center gap-2">
		<h2 class="font-semibold text-lg">Round {round.number}: {round.theme}</h2>
		<span
			class="rounded-full px-2 py-0.5 text-xs
				{round.phase === 'pending' ? 'bg-neutral-100 text-neutral-600' : ''}
				{round.phase === 'submitting' ? 'bg-green-100 text-green-800' : ''}
				{round.phase === 'voting' ? 'bg-purple-100 text-purple-800' : ''}
				{round.phase === 'scored' ? 'bg-blue-100 text-blue-800' : ''}"
		>
			{round.phase}
		</span>
	</div>
	{#if round.description}
		<p class="mt-1 text-neutral-500">{round.description}</p>
	{/if}
</div>

<!-- Advance round (creator only) -->
{#if can('transition_round')}
	<form class="rounded border border-amber-200 bg-amber-50 p-4" {...advanceRound}>
		<input {...advanceRound.fields.gameId.as('hidden', game.id)} />
		<div class="flex items-center justify-between">
			<div>
				<p class="text-sm font-medium">
					Round {round.number} is in
					<span class="font-semibold">{round.phase}</span> phase.
				</p>
				<p class="mt-0.5 text-xs text-neutral-500">
					{#if round.phase === 'submitting'}
						Advance to open voting.
					{:else if round.phase === 'voting'}
						Advance to score this round.
					{/if}
				</p>
			</div>
			<Button type="submit" size="sm" variant="outline" disabled={advanceRound.pending > 0}>
				{#if advanceRound.pending > 0}
					Advancing...
				{:else if round.phase === 'submitting'}
					Open Voting
				{:else}
					Score Round
				{/if}
			</Button>
		</div>
		<Field.Error errors={advanceRound.fields.gameId.issues()} />
	</form>
{/if}

<!-- Submitting phase -->
{#if can('submit_song')}
	<section>
		<h3 class="mb-2 font-medium">Your Submission</h3>
		{#if round.submissionClosesAt}
			<p class="mb-2 text-xs text-neutral-400">
				Window closes {new Date(round.submissionClosesAt).toLocaleDateString()}
			</p>
		{/if}
		<SubmissionForm
			gameId={game.id}
			initialTrackUrl={round.actorSubmission?.spotifyTrackUrl ?? ''}
			initialNote={round.actorSubmission?.note ?? ''}
			hasExisting={!!round.actorSubmission}
		/>
		{#if round.actorSubmission}
			<p class="mt-2 text-xs text-green-600">
				&#10003; You submitted: {round.actorSubmission.spotifyTrackUrl}
			</p>
		{/if}
	</section>
{/if}

<!-- Voting phase -->
{#if can('cast_ballot') && round.votingSubmissions}
	<section>
		<h3 class="mb-2 font-medium">Vote</h3>
		{#if round.votingClosesAt}
			<p class="mb-2 text-xs text-neutral-400">
				Voting closes {new Date(round.votingClosesAt).toLocaleDateString()}
			</p>
		{/if}
		<BallotForm
			gameId={game.id}
			actorPlayerId={round.actorPlayer.id}
			submissions={round.votingSubmissions}
			initialSubmissionIds={round.actorBallot?.submissionIds ?? []}
			{playerNameById}
		/>
	</section>
{/if}

<!-- Scored phase: results -->
{#if round.phase === 'scored' && round.results}
	<section>
		<h3 class="mb-2 font-medium">Results</h3>
		{#if round.results.submissions.length === 0}
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
{/if}

<!-- Pending phase -->
{#if round.phase === 'pending'}
	<p class="text-sm text-neutral-500">This round hasn't started yet.</p>
{/if}
