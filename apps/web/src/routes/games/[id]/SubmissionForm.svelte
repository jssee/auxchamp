<script lang="ts">
	import { untrack } from 'svelte';

	import { saveSubmission } from '$lib/game.remote';

	type Props = {
		gameId: string;
		initialTrackUrl?: string;
		initialNote?: string;
		hasExisting: boolean;
	};

	const props: Props = $props();

	// Capture initial values once so user edits survive invalidation without relying on reactive props.
	saveSubmission.fields.spotifyTrackUrl.set(untrack(() => props.initialTrackUrl ?? ''));
	saveSubmission.fields.note.set(untrack(() => props.initialNote ?? ''));
</script>

<form class="space-y-2" {...saveSubmission}>
	<input {...saveSubmission.fields.gameId.as('hidden', props.gameId)} />
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
		{:else if props.hasExisting}
			Update Submission
		{:else}
			Submit
		{/if}
	</button>
</form>
