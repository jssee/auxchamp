<script lang="ts">
	import { goto } from '$app/navigation';
	import { signIn } from '$lib/auth/auth.remote';
	import { signInSchema } from '$lib/auth/schema';
	import * as v from 'valibot';

	let { switchToSignUp } = $props<{ switchToSignUp: () => void }>();

	let email = $state('');
	let password = $state('');
	let isSubmitting = $state(false);
	let errors = $state<{
		email?: string;
		password?: string;
		form?: string;
	}>({});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		errors = {};

		const result = v.safeParse(signInSchema, { email, password });
		if (!result.success) {
			const flattened = v.flatten(result.issues);
			errors = {
				email: flattened.nested?.email?.[0],
				password: flattened.nested?.password?.[0]
			};
			return;
		}

		isSubmitting = true;

		try {
			const response = await signIn(result.output);
			if (response.ok) {
				goto('/dashboard');
				return;
			}

			errors = {
				form: response.message
			};
		} catch (error) {
			errors = {
				form: error instanceof Error ? error.message : 'Sign in failed. Please try again.'
			};
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="mx-auto mt-10 w-full max-w-md p-6">
	<h1 class="mb-6 text-center font-bold text-3xl">Welcome Back</h1>

	<form class="space-y-4" onsubmit={handleSubmit}>
		{#if errors.form}
			<p class="text-sm text-red-500" role="alert">{errors.form}</p>
		{/if}

		<div class="space-y-1">
			<label for="sign-in-email">Email</label>
			<input
				id="sign-in-email"
				name="email"
				type="email"
				class="w-full border"
				required
				value={email}
				oninput={(event: Event) => {
					const target = event.target as HTMLInputElement;
					email = target.value;
				}}
			/>
			{#if errors.email}
				<p class="text-sm text-red-500" role="alert">{errors.email}</p>
			{/if}
		</div>

		<div class="space-y-1">
			<label for="sign-in-password">Password</label>
			<input
				id="sign-in-password"
				name="password"
				type="password"
				class="w-full border"
				required
				value={password}
				oninput={(event: Event) => {
					const target = event.target as HTMLInputElement;
					password = target.value;
				}}
			/>
			{#if errors.password}
				<p class="text-sm text-red-500" role="alert">{errors.password}</p>
			{/if}
		</div>

		<button type="submit" class="w-full" disabled={isSubmitting}>
			{isSubmitting ? 'Submitting...' : 'Sign In'}
		</button>
	</form>

	<div class="mt-4 text-center">
		<button type="button" class="text-indigo-600 hover:text-indigo-800" onclick={switchToSignUp}>
			Need an account? Sign Up
		</button>
	</div>
</div>
