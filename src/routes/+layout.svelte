<script lang="ts">
  import { ModeWatcher } from "mode-watcher";
  import "../app.css";
  import favicon from "$lib/assets/favicon.svg";
  import AppHeader from "$lib/components/app-header.svelte";

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher />

<AppHeader />
{@render children()}
