<script lang="ts">
	import { upsertSubmission } from '$lib/game.remote';

	const {
		gameId,
		initialTrackUrl = '',
		initialNote = '',
		hasExisting,
	}: {
		gameId: string;
		initialTrackUrl?: string;
		initialNote?: string;
		hasExisting: boolean;
	} = $props();

	// Intentionally capture initial values once so user edits survive invalidation.
	upsertSubmission.fields.spotifyTrackUrl.set(initialTrackUrl);
	upsertSubmission.fields.note.set(initialNote);
</script>

<form class="space-y-2" {...upsertSubmission}>
	<input {...upsertSubmission.fields.gameId.as('hidden', gameId)} />
	<div class="flex flex-col gap-1">
		<label class="text-sm" for="spotify-track-url">Spotify track URL</label>
		<input
			id="spotify-track-url"
			placeholder="Spotify track URL"
			class="w-full border px-3 py-2 text-sm"
			required
			{...upsertSubmission.fields.spotifyTrackUrl.as('text')}
		/>
		{#each upsertSubmission.fields.spotifyTrackUrl.issues() as issue}
			<p class="text-xs text-red-500">{issue.message}</p>
		{/each}
	</div>
	<div class="flex flex-col gap-1">
		<label class="text-sm" for="spotify-track-note">Note (optional)</label>
		<textarea
			id="spotify-track-note"
			class="w-full border px-3 py-2 text-sm"
			rows="2"
			{...upsertSubmission.fields.note.as('text')}
		></textarea>
	</div>
	<button
		type="submit"
		class="w-full border px-4 py-2 text-sm font-medium"
		disabled={upsertSubmission.pending > 0}
	>
		{#if upsertSubmission.pending > 0}
			Submitting...
		{:else if hasExisting}
			Update Submission
		{:else}
			Submit
		{/if}
	</button>
</form>
