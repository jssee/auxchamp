<script lang="ts">
  import * as Item from "$lib/components/ui/item";

  type Submission = {
    submissionId: string;
    playerId: string;
    spotifyTrackUrl: string;
    starCount: number;
  };

  type Props = {
    submissions: Submission[];
    playerNameById: Map<string, string>;
  };

  const { submissions, playerNameById }: Props = $props();
</script>

{#if submissions.length === 0}
  <p class="text-sm text-neutral-400">No submissions were scored.</p>
{:else}
  <Item.Group>
    {#each submissions as sub, i (sub.submissionId)}
      <Item.Root size="sm">
        <Item.Media>
          <span class="w-5 text-sm text-neutral-400">{i + 1}.</span>
        </Item.Media>
        <Item.Content>
          <Item.Title class="truncate">{sub.spotifyTrackUrl}</Item.Title>
          <Item.Description>
            {playerNameById.get(sub.playerId) ?? "Unknown"}
          </Item.Description>
        </Item.Content>
        <Item.Actions>
          <span class="text-sm font-medium">
            {#if sub.starCount > 0}
              {"★".repeat(sub.starCount)}
            {:else}
              <span class="text-neutral-300">☆</span>
            {/if}
          </span>
        </Item.Actions>
      </Item.Root>
      {#if i !== submissions.length - 1}
        <Item.Separator />
      {/if}
    {/each}
  </Item.Group>
{/if}
