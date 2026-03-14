<script lang="ts">
  const { data } = $props();
</script>

<div class="container mx-auto max-w-2xl space-y-8 px-4 py-12">
  <header class="space-y-2">
    <p class="text-sm text-neutral-400">Public profile</p>
    <h1 class="font-bold text-4xl">
      {data.profile.name !== data.profile.username ? data.profile.name : data.profile.displayUsername}
    </h1>
    <p class="text-lg text-neutral-400">@{data.profile.displayUsername}</p>
  </header>

  <dl class="grid gap-6 sm:grid-cols-2">
    <div class="space-y-1">
      <dt class="text-sm text-neutral-400">Username</dt>
      <dd class="font-medium text-lg">@{data.profile.displayUsername}</dd>
    </div>

    <div class="space-y-1">
      <dt class="text-sm text-neutral-400">Joined</dt>
      <dd class="font-medium text-lg">{new Date(data.profile.createdAt).toLocaleDateString()}</dd>
    </div>
  </dl>
</div>
