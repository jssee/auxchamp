<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<main class="col-content">
  <Card.Root>
    <Card.Header>
      <Card.Title>{data.battle.name}</Card.Title>
      <Card.Description>
        {data.battle.visibility} · {data.battle.status}
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <dl class="grid gap-2 text-sm">
        <div class="flex justify-between">
          <dt class="text-muted-foreground">Max players</dt>
          <dd>{data.battle.maxPlayers}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-muted-foreground">Double submissions</dt>
          <dd>{data.battle.doubleSubmissions ? "Yes" : "No"}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-muted-foreground">Created</dt>
          <dd>{new Date(data.battle.createdAt).toLocaleDateString()}</dd>
        </div>
      </dl>
    </Card.Content>
    <Card.Footer>
      {#if data.battle.creatorId === data.user?.id && data.battle.status !== "cancelled"}
        <Button href="/b/{data.battle.id}/edit">Edit</Button>
      {/if}
    </Card.Footer>
  </Card.Root>
</main>
