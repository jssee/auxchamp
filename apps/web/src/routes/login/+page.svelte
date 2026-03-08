<script lang="ts">
	import SignInForm from '$lib/components/SignInForm.svelte';
	import SignUpForm from '$lib/components/SignUpForm.svelte';

	let showSignIn = $state(true);
</script>

{#if showSignIn}
	<SignInForm switchToSignUp={() => showSignIn = false} />
{:else}
	<SignUpForm switchToSignIn={() => showSignIn = true} />
{/if}
