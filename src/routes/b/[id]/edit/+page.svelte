<script lang="ts">
  import { page } from "$app/state";
  import { getBattle } from "$lib/remote/battle.remote";
  import * as Empty from "$lib/components/ui/empty";
  import { Button } from "$lib/components/ui/button";
  import Form from "./form.svelte";
</script>

<main class="col-content">
  <svelte:boundary>
    {@const battle = await getBattle(page.params.id!)}
    <Form {battle} />

    {#snippet pending()}
      <div class="animate-pulse">Loading...</div>
    {/snippet}

    {#snippet failed(error, reset)}
      <Empty.Root>
        <Empty.Content>
          <Empty.Title>Something went wrong</Empty.Title>
          <Empty.Description>{(error as Error).message}</Empty.Description>
          <Button onclick={reset}>Try again</Button>
        </Empty.Content>
      </Empty.Root>
    {/snippet}
  </svelte:boundary>
</main>
