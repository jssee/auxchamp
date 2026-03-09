<script lang="ts">
	import { ModeWatcher } from 'mode-watcher';
    import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

	import Header from '$lib/components/Header.svelte';
	import '../app.css';

    injectSpeedInsights();

	const { children } = $props();
</script>

<ModeWatcher />

<div class="grid h-svh grid-rows-[auto_1fr]">
	<Header />
	<main class="overflow-y-auto">
		{@render children()}
	</main>
</div>
