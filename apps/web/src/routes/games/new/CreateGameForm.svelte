<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { createGame } from '$lib/game.remote';
</script>

<form {...createGame}>
	<Field.Group class="gap-4">
		<Field.Field data-invalid={createGame.fields.name.issues()?.length ? 'true' : undefined}>
			<Field.Label for="name">Name</Field.Label>
			<Input id="name" required {...createGame.fields.name.as('text')} />
			<Field.Error errors={createGame.fields.name.issues()} />
		</Field.Field>

		<Field.Field data-invalid={createGame.fields.description.issues()?.length ? 'true' : undefined}>
			<Field.Label for="description">Description</Field.Label>
			<Textarea id="description" rows={2} {...createGame.fields.description.as('text')} />
			<Field.Description>Optional. Add context players should see before round one starts.</Field.Description>
			<Field.Error errors={createGame.fields.description.issues()} />
		</Field.Field>

		<div class="grid gap-4 sm:grid-cols-2">
			<Field.Field data-invalid={createGame.fields.submissionWindowDays.issues()?.length ? 'true' : undefined}>
				<Field.Label for="submissionDays">Submission window (days)</Field.Label>
				<Input id="submissionDays" min="1" step="1" {...createGame.fields.submissionWindowDays.as('number')} />
				<Field.Description>How long players have to submit a track each round.</Field.Description>
				<Field.Error errors={createGame.fields.submissionWindowDays.issues()} />
			</Field.Field>

			<Field.Field data-invalid={createGame.fields.votingWindowDays.issues()?.length ? 'true' : undefined}>
				<Field.Label for="votingDays">Voting window (days)</Field.Label>
				<Input id="votingDays" min="1" step="1" {...createGame.fields.votingWindowDays.as('number')} />
				<Field.Description>How long players can vote after submissions close.</Field.Description>
				<Field.Error errors={createGame.fields.votingWindowDays.issues()} />
			</Field.Field>
		</div>

		<Button type="submit" class="w-full" disabled={createGame.pending > 0}>
			{createGame.pending > 0 ? 'Creating...' : 'Create Game'}
		</Button>
	</Field.Group>
</form>
