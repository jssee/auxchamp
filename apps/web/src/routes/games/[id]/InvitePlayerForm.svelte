<script lang="ts">
	import { invitePlayer } from '$lib/game.remote';

	let { gameId }: { gameId: string } = $props();
</script>

<form class="mt-3 flex gap-2" {...invitePlayer}>
	<input {...invitePlayer.fields.gameId.as('hidden', gameId)} />
	<input
		placeholder="Invite by email"
		class="flex-1 border px-3 py-1 text-sm"
		required
		{...invitePlayer.fields.targetUserEmail.as('email')}
	/>
	<button type="submit" class="border px-3 py-1 text-sm" disabled={invitePlayer.pending > 0}>
		{invitePlayer.pending > 0 ? 'Inviting...' : 'Invite'}
	</button>
</form>
{#each invitePlayer.fields.targetUserEmail.issues() as issue}
	<p class="mt-1 text-xs text-red-500">{issue.message}</p>
{/each}
