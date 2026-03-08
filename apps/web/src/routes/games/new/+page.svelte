<script lang="ts">
	import { goto } from '$app/navigation';
	import { create_game } from '$lib/game.remote';

	let name = $state('');
	let description = $state('');
	let submissionWindowDays = $state(7);
	let votingWindowDays = $state(3);
	let isSubmitting = $state(false);
	let error = $state('');

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		isSubmitting = true;

		try {
			const result = await create_game({
				name,
				description: description || null,
				submissionWindowDays,
				votingWindowDays,
			});
			goto(`/games/${result.gameId}`);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create game.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="container mx-auto max-w-lg px-4 py-8">
	<h1 class="mb-6 font-bold text-2xl">Create a Game</h1>

	<form class="space-y-4" onsubmit={handleSubmit}>
		{#if error}
			<p class="text-sm text-red-500" role="alert">{error}</p>
		{/if}

		<div class="space-y-1">
			<label for="name">Name</label>
			<input id="name" type="text" class="w-full border px-3 py-2" required bind:value={name} />
		</div>

		<div class="space-y-1">
			<label for="description">Description</label>
			<textarea id="description" class="w-full border px-3 py-2" rows="2" bind:value={description}
			></textarea>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div class="space-y-1">
				<label for="submissionDays">Submission window (days)</label>
				<input
					id="submissionDays"
					type="number"
					min="1"
					class="w-full border px-3 py-2"
					bind:value={submissionWindowDays}
				/>
			</div>
			<div class="space-y-1">
				<label for="votingDays">Voting window (days)</label>
				<input
					id="votingDays"
					type="number"
					min="1"
					class="w-full border px-3 py-2"
					bind:value={votingWindowDays}
				/>
			</div>
		</div>

		<button type="submit" class="w-full border px-4 py-2 font-medium" disabled={isSubmitting}>
			{isSubmitting ? 'Creating...' : 'Create Game'}
		</button>
	</form>
</div>
