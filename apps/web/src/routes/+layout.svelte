<script lang="ts">
	import { ModeWatcher } from 'mode-watcher';
    import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

    import Header from '$lib/components/Header.svelte';
    import { Toaster } from '$lib/components/ui/sonner';
    import favicon from "$lib/assets/favicon.svg";
	import '../app.css';

    injectSpeedInsights();

	const { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <!-- Seline analytics -->
  <script
    async
    src="https://cdn.seline.com/seline.js"
    data-token="5d1b0e6affbaf65"
  ></script>
</svelte:head>

<ModeWatcher />
<Toaster />

<div class="grid h-svh grid-rows-[auto_1fr]">
	<Header />
	<main class="overflow-y-auto">
		{@render children()}
	</main>
</div>
