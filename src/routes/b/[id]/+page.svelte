<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  const phaseVariant = {
    upcoming: "secondary",
    submission: "default",
    voting: "outline",
    closed: "destructive",
  } as const;
</script>

<main class="col-content space-y-6">
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

  {#if data.stages.length > 0}
    <Card.Root>
      <Card.Header>
        <Card.Title>Stages</Card.Title>
      </Card.Header>
      <Card.Content>
        <ul class="space-y-2">
          {#each data.stages as stage}
            <li>
              <a
                href="/b/{data.battle.id}/s/{stage.id}"
                class="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50 transition-colors"
              >
                <div>
                  <span class="font-medium">Stage {stage.stageNumber}:</span>
                  <span class="text-muted-foreground ml-1">{stage.vibe}</span>
                </div>
                <Badge variant={phaseVariant[stage.phase]}>{stage.phase}</Badge>
              </a>
            </li>
          {/each}
        </ul>
      </Card.Content>
    </Card.Root>
  {/if}
</main>
