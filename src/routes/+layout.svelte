<script lang="ts">
  import { ModeWatcher } from "mode-watcher";
  import { afterNavigate } from "$app/navigation";
  import "../app.css";
  import favicon from "$lib/assets/favicon.svg";
  import AppHeader from "$lib/components/app-header.svelte";
  import { authClient, authContext } from "$lib/auth/client";

  let { children } = $props();

  // Initialize reactive session and set in context for child components
  const session = authClient.useSession();
  authContext.set(session);

  // Refresh session after navigation to sync auth state with server cookies
  afterNavigate(() => {
    authClient.$store.notify("$sessionSignal");
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher />

<div class="grid-layout h-svh">
  <AppHeader />
  {@render children()}
</div>
