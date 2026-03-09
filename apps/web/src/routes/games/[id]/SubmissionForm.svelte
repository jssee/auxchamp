<script lang="ts">
	import { saveSubmission } from '$lib/game.remote';

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
	saveSubmission.fields.spotifyTrackUrl.set(initialTrackUrl);
	saveSubmission.fields.note.set(initialNote);
</script>

<form class="space-y-2" {...saveSubmission}>
	<input {...saveSubmission.fields.gameId.as('hidden', gameId)} />
	<div class="flex flex-col gap-1">
		<label class="text-sm" for="spotify-track-url">Spotify track URL</label>
		<input
			id="spotify-track-url"
			placeholder="Spotify track URL"
			class="w-full border px-3 py-2 text-sm"
			required
			{...saveSubmission.fields.spotifyTrackUrl.as('text')}
		/>
		{#each saveSubmission.fields.spotifyTrackUrl.issues() as issue}
			<p class="text-xs text-red-500">{issue.message}</p>
		{/each}
	</div>
	<div class="flex flex-col gap-1">
		<label class="text-sm" for="spotify-track-note">Note (optional)</label>
		<textarea
			id="spotify-track-note"
			class="w-full border px-3 py-2 text-sm"
			rows="2"
			{...saveSubmission.fields.note.as('text')}
		></textarea>
	</div>
	<button
		type="submit"
		class="w-full border px-4 py-2 text-sm font-medium"
		disabled={saveSubmission.pending > 0}
	>
		{#if saveSubmission.pending > 0}
			Submitting...
		{:else if hasExisting}
			Update Submission
		{:else}
			Submit
		{/if}
	</button>
</form>
