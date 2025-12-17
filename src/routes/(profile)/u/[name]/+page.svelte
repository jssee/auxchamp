<script lang="ts">
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<main class="col-content">
  <h1 class="text-2xl font-semibold">{data.profile.name}</h1>
  <p class="text-muted-foreground">
    Member since {data.profile.createdAt.toLocaleDateString()}
  </p>
</main>
