<script lang="ts">
	import { goto } from '$app/navigation';
	import { signUp } from '$lib/auth/auth.remote';
	import { signUpSchema } from '$lib/auth/schema';
	import * as v from 'valibot';

	let { switchToSignIn } = $props<{ switchToSignIn: () => void }>();

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let isSubmitting = $state(false);
	let errors = $state<{
		name?: string;
		email?: string;
		password?: string;
		form?: string;
	}>({});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		errors = {};

		const result = v.safeParse(signUpSchema, { name, email, password });
		if (!result.success) {
			const flattened = v.flatten(result.issues);
			errors = {
				name: flattened.nested?.name?.[0],
				email: flattened.nested?.email?.[0],
				password: flattened.nested?.password?.[0]
			};
			return;
		}

		isSubmitting = true;

		try {
			const response = await signUp(result.output);
			if (response.ok) {
				goto('/dashboard');
				return;
			}

			errors = {
				form: response.message
			};
		} catch (error) {
			errors = {
				form: error instanceof Error ? error.message : 'Sign up failed. Please try again.'
			};
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="mx-auto mt-10 w-full max-w-md p-6">
	<h1 class="mb-6 text-center font-bold text-3xl">Create Account</h1>

	<form class="space-y-4" onsubmit={handleSubmit}>
		{#if errors.form}
			<p class="text-sm text-red-500" role="alert">{errors.form}</p>
		{/if}

		<div class="space-y-1">
			<label for="sign-up-name">Name</label>
			<input
				id="sign-up-name"
				name="name"
				class="w-full border"
				required
				minlength="2"
				value={name}
				oninput={(event: Event) => {
					const target = event.target as HTMLInputElement;
					name = target.value;
				}}
			/>
			{#if errors.name}
				<p class="text-sm text-red-500" role="alert">{errors.name}</p>
			{/if}
		</div>

		<div class="space-y-1">
			<label for="sign-up-email">Email</label>
			<input
				id="sign-up-email"
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
			<label for="sign-up-password">Password</label>
			<input
				id="sign-up-password"
				name="password"
				type="password"
				class="w-full border"
				required
				minlength="8"
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
			{isSubmitting ? 'Submitting...' : 'Sign Up'}
		</button>
	</form>

	<div class="mt-4 text-center">
		<button type="button" class="text-indigo-600 hover:text-indigo-800" onclick={switchToSignIn}>
			Already have an account? Sign In
		</button>
	</div>
</div>
