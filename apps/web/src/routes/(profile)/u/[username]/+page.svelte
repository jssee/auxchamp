<script lang="ts">
  let { data } = $props();

  const displayName = $derived(
    data.profile.name === data.profile.username ? data.profile.displayUsername : data.profile.name,
  );
</script>

<svelte:head>
  <title>{displayName} · AuxChamp</title>
</svelte:head>

<div class="col-content py-10">
  <div class="mx-auto max-w-2xl rounded-xl border border-border bg-card p-6 shadow-sm">
    <p class="text-sm text-muted-foreground">Profile</p>
    <h1 class="mt-2 text-3xl font-semibold tracking-tight">{displayName}</h1>
    <p class="mt-1 text-muted-foreground">@{data.profile.displayUsername}</p>
  </div>
</div>
