<script lang="ts">
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<main class="grid-layout h-full">
  <div class="col-content py-10">
    <h1 class="text-2xl font-semibold">{data.profile.name}</h1>
    <p class="text-muted-foreground">
      Member since {data.profile.createdAt.toLocaleDateString()}
    </p>
  </div>
</main>
