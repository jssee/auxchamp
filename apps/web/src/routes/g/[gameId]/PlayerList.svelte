<script lang="ts">
	import type { Player } from '@auxchamp/api/schema';
	import * as Item from '$lib/components/ui/item';

	type Props = { players: Player[] };

	const { players }: Props = $props();
</script>

<Item.Group>
	{#each players as p, i (p.id)}
		<Item.Root size="sm">
			<Item.Content>
				<Item.Title>{p.userName}</Item.Title>
				<Item.Description>
					{p.role === 'creator' ? 'Creator' : ''}
					{p.status === 'invited' ? 'Invited' : ''}
					{p.status === 'left' ? 'Left' : ''}
					{p.status === 'removed' ? 'Removed' : ''}
				</Item.Description>
			</Item.Content>
		</Item.Root>
		{#if i !== players.length - 1}
			<Item.Separator />
		{/if}
	{/each}
</Item.Group>
