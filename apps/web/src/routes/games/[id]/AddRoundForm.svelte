<script lang="ts">
	import { addRound } from '$lib/game.remote';

	let { gameId }: { gameId: string } = $props();
</script>

<form class="mt-3 space-y-2" {...addRound}>
	<input {...addRound.fields.gameId.as('hidden', gameId)} />
	<div class="flex gap-2">
		<input
			placeholder="Round theme"
			class="flex-1 border px-3 py-1 text-sm"
			required
			{...addRound.fields.theme.as('text')}
		/>
		<button type="submit" class="border px-3 py-1 text-sm" disabled={addRound.pending > 0}>
			{addRound.pending > 0 ? 'Adding...' : 'Add Round'}
		</button>
	</div>
	{#each addRound.fields.theme.issues() as issue}
		<p class="text-xs text-red-500">{issue.message}</p>
	{/each}
	<input
		placeholder="Description (optional)"
		class="w-full border px-3 py-1 text-sm"
		{...addRound.fields.description.as('text')}
	/>
</form>
