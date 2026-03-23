<script lang="ts">
	import { saveBallot } from '$lib/game.remote';

	import { Button } from '$lib/components/ui/button';
	import * as Field from '$lib/components/ui/field';

	type Submission = {
		id: string;
		playerId: string;
		spotifyTrackUrl: string;
		note: string | null;
	};

	type Props = {
		gameId: string;
		actorPlayerId: string;
		submissions: Submission[];
		initialSubmissionIds: string[];
		playerNameById: Map<string, string>;
	};

	const props: Props = $props();

	// Initialize from load data — no $effect needed.
	let selectedSubmissions = $state<Set<string>>(new Set(props.initialSubmissionIds));

	function toggleStar(submissionId: string) {
		const next = new Set(selectedSubmissions);
		if (next.has(submissionId)) {
			next.delete(submissionId);
		} else if (next.size < 3) {
			next.add(submissionId);
		}
		selectedSubmissions = next;
	}
</script>

<form {...saveBallot}>
	<input {...saveBallot.fields.gameId.as('hidden', props.gameId)} />
	{#each [...selectedSubmissions] as id}
		<input type="hidden" name="submissionIds" value={id} />
	{/each}

	<p class="mb-3 text-sm text-neutral-500">
		Star exactly 3 submissions. You cannot star your own.
		<span class="font-medium">({selectedSubmissions.size}/3 selected)</span>
	</p>

	<ul class="space-y-2">
		{#each props.submissions.filter((s) => s.playerId !== props.actorPlayerId) as vs (vs.id)}
			{@const isSelected = selectedSubmissions.has(vs.id)}
			<li>
				<button
					type="button"
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
								by {props.playerNameById.get(vs.playerId) ?? 'Unknown'}
							</p>
						</div>
						<span class="ml-3 text-lg">{isSelected ? '★' : '☆'}</span>
					</div>
				</button>
			</li>
		{/each}
	</ul>

	<Field.Error errors={saveBallot.fields.submissionIds.issues()} />

	<Button
		type="submit"
		class="mt-4 w-full"
		disabled={selectedSubmissions.size !== 3 || saveBallot.pending > 0}
	>
		{#if saveBallot.pending > 0}
			Saving...
		{:else if props.initialSubmissionIds.length > 0}
			Update Ballot
		{:else}
			Submit Ballot
		{/if}
	</Button>

	{#if props.initialSubmissionIds.length > 0}
		<p class="mt-2 text-xs text-green-600">&#10003; Your ballot has been recorded.</p>
	{/if}
</form>
