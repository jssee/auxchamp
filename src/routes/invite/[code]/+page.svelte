<script lang="ts">
  import { page } from "$app/state";
  import * as Card from "$lib/components/ui/card";
  import * as Field from "$lib/components/ui/field";
  import { Button } from "$lib/components/ui/button";
  import { joinBattle } from "$lib/remote/invite.remote";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  const redirectTo = $derived(`/invite/${page.params.code}`);
</script>

<main class="col-content grid h-full place-items-center">
  <Card.Root class="w-full max-w-md">
    {#if "error" in data}
      {@const isInvalid = data.error === "invalid"}
      <Card.Header>
        <Card.Title class="text-xl">
          {isInvalid ? "Invalid Invite" : "Battle Closed"}
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <p class="text-muted-foreground">
          {isInvalid
            ? "This invite link is invalid or has expired."
            : "This battle is no longer accepting new players."}
        </p>
      </Card.Content>
      <Card.Footer>
        <Button href="/" variant="outline">Go Home</Button>
      </Card.Footer>
    {:else}
      {@const battleData = data}
      {#if battleData.isFull}
        <Card.Header>
          <Card.Title class="text-xl">Battle Full</Card.Title>
        </Card.Header>
        <Card.Content>
          <p class="text-muted-foreground">
            <strong>{battleData.battle.name}</strong> has reached its player limit.
          </p>
        </Card.Content>
        <Card.Footer>
          <Button href="/" variant="outline">Go Home</Button>
        </Card.Footer>
      {:else if !battleData.user}
        <Card.Header>
          <Card.Title class="text-xl">Join Battle</Card.Title>
        </Card.Header>
        <Card.Content>
          <p class="text-muted-foreground">
            You've been invited to join <strong>{battleData.battle.name}</strong
            >.
          </p>
          <p class="mt-2 text-muted-foreground">
            Sign in or create an account to join.
          </p>
        </Card.Content>
        <Card.Footer class="flex gap-2">
          <Button href="/signin?redirectTo={encodeURIComponent(redirectTo)}">
            Sign In
          </Button>
          <Button
            href="/signup?redirectTo={encodeURIComponent(redirectTo)}"
            variant="outline"
          >
            Sign Up
          </Button>
        </Card.Footer>
      {:else}
        <Card.Header>
          <Card.Title class="text-xl">Join Battle</Card.Title>
        </Card.Header>
        <Card.Content>
          <p class="text-muted-foreground">
            You've been invited to join <strong>{battleData.battle.name}</strong
            >.
          </p>
        </Card.Content>
        <Card.Footer>
          <form {...joinBattle}>
            {#each joinBattle.fields.allIssues() as issue}
              <Field.Error>{issue.message}</Field.Error>
            {/each}
            <input type="hidden" name="battleId" value={battleData.battle.id} />
            <Button type="submit">Join Battle</Button>
          </form>
        </Card.Footer>
      {/if}
    {/if}
  </Card.Root>
</main>
