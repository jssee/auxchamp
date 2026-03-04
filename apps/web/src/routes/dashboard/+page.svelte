<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/auth-client';
	import { privateData as createPrivateData } from '$lib/app.remote';

	const sessionQuery = authClient.useSession();
	const privateDataQuery = createPrivateData();

	$effect(() => {
		if (!$sessionQuery.isPending && !$sessionQuery.data) {
			goto('/login');
		}
	});
</script>

{#if $sessionQuery.isPending}
	<div>Loading...</div>
{:else if !$sessionQuery.data}
	<div>Redirecting to login...</div>
{:else}
	<div>
		<h1>Dashboard</h1>
		<p>Welcome {$sessionQuery.data.user.name}</p>
		<p>
			API:
			{#await privateDataQuery then data}
				{data?.message ?? 'Unavailable'}
			{:catch}
				Unavailable
			{/await}
		</p>
	</div>
{/if}
