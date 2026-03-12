<script lang="ts">
	import { untrack } from 'svelte';

	import { Button } from '$lib/components/ui/button/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
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

<form {...saveSubmission}>
	<input {...saveSubmission.fields.gameId.as('hidden', props.gameId)} />

	<Field.Group class="gap-4">
		<Field.Field
			data-invalid={saveSubmission.fields.spotifyTrackUrl.issues()?.length ? 'true' : undefined}
		>
			<Field.Label for="spotify-track-url">Spotify track URL</Field.Label>
			<Input
				id="spotify-track-url"
				placeholder="Spotify track URL"
				required
				{...saveSubmission.fields.spotifyTrackUrl.as('text')}
			/>
			<Field.Description>Paste the full Spotify track link for your submission.</Field.Description>
			<Field.Error errors={saveSubmission.fields.spotifyTrackUrl.issues()} />
		</Field.Field>

		<Field.Field data-invalid={saveSubmission.fields.note.issues()?.length ? 'true' : undefined}>
			<Field.Label for="spotify-track-note">Note</Field.Label>
			<Textarea id="spotify-track-note" rows={2} {...saveSubmission.fields.note.as('text')} />
			<Field.Description>Optional. Add context for your pick.</Field.Description>
			<Field.Error errors={saveSubmission.fields.note.issues()} />
		</Field.Field>

		<Button type="submit" class="w-full" disabled={saveSubmission.pending > 0}>
			{#if saveSubmission.pending > 0}
				Submitting...
			{:else if props.hasExisting}
				Update Submission
			{:else}
				Submit
			{/if}
		</Button>
	</Field.Group>
</form>
