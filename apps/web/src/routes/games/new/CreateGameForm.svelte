<script lang="ts">
	import { createGame } from '$lib/game.remote';
</script>

<form class="space-y-4" {...createGame}>
	{#each createGame.fields.allIssues() as issue}
		<p class="text-sm text-red-500" role="alert">{issue.message}</p>
	{/each}

	<div class="space-y-1">
		<label for="name">Name</label>
		<input id="name" type="text" class="w-full border px-3 py-2" required {...createGame.fields.name.as('text')} />
		{#each createGame.fields.name.issues() as issue}
			<p class="text-xs text-red-500">{issue.message}</p>
		{/each}
	</div>

	<div class="space-y-1">
		<label for="description">Description</label>
		<textarea
			id="description"
			class="w-full border px-3 py-2"
			rows="2"
			{...createGame.fields.description.as('text')}
		></textarea>
	</div>

	<div class="grid grid-cols-2 gap-4">
		<div class="space-y-1">
			<label for="submissionDays">Submission window (days)</label>
			<input
				id="submissionDays"
				min="1"
				class="w-full border px-3 py-2"
				{...createGame.fields.submissionWindowDays.as('number')}
			/>
		</div>
		<div class="space-y-1">
			<label for="votingDays">Voting window (days)</label>
			<input
				id="votingDays"
				min="1"
				class="w-full border px-3 py-2"
				{...createGame.fields.votingWindowDays.as('number')}
			/>
		</div>
	</div>

	<button type="submit" class="w-full border px-4 py-2 font-medium" disabled={createGame.pending > 0}>
		{createGame.pending > 0 ? 'Creating...' : 'Create Game'}
	</button>
</form>
