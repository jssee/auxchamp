<script lang="ts">
	import { acceptInvite } from '$lib/game.remote';

	import { Button } from '$lib/components/ui/button';
	import * as Field from '$lib/components/ui/field';

	const { data, children } = $props();
	let game = $derived(data.game);

	let can = $derived((action: (typeof game.actions)[number]) => game.actions.includes(action));
</script>

<div class="container mx-auto max-w-2xl space-y-8 px-4 py-8">
	<!-- Header -->
	<div>
		<div class="flex items-center gap-3">
			<h1 class="font-bold text-2xl">
				<a href="/g/{game.id}" class="hover:underline">{game.name}</a>
			</h1>
			<span
				class="rounded-full px-2 py-0.5 text-xs font-medium uppercase
					{game.state === 'draft' ? 'bg-yellow-100 text-yellow-800' : ''}
					{game.state === 'active' ? 'bg-green-100 text-green-800' : ''}
					{game.state === 'completed' ? 'bg-neutral-100 text-neutral-600' : ''}"
			>
				{game.state}
			</span>
		</div>
		{#if game.description}
			<p class="mt-1 text-neutral-500">{game.description}</p>
		{/if}
	</div>

	<!-- Accept invite banner -->
	{#if can('accept_invite')}
		<form class="rounded border border-blue-200 bg-blue-50 p-4" {...acceptInvite}>
			<input {...acceptInvite.fields.gameId.as('hidden', game.id)} />
			<div class="flex items-center justify-between">
				<p class="text-sm">You've been invited to this game.</p>
				<Button type="submit" size="sm" disabled={acceptInvite.pending > 0}>
					{acceptInvite.pending > 0 ? 'Accepting...' : 'Accept Invite'}
				</Button>
			</div>
			<Field.Error errors={acceptInvite.fields.gameId.issues()} />
		</form>
	{/if}

	{@render children()}
</div>
