<script lang="ts">
  import Star from "@lucide/svelte/icons/star";
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import * as Field from "$lib/components/ui/field";
  import SpotifyEmbed from "$lib/components/spotify-embed.svelte";
  import { getRankLabel } from "$lib/utils/format";
  import {
    submitTrack,
    createPlaylist,
    castVotes,
  } from "$lib/remote/stage.remote";
  import type { PageProps } from "./$types";

  let creatingPlaylist = $state(false);
  let playlistError = $state<string | null>(null);
  let selectedSubmissions = $state<Set<string>>(new Set());
  let votingError = $state<string | null>(null);
  let submittingVotes = $state(false);

  async function handleCreatePlaylist(stageId: string) {
    creatingPlaylist = true;
    playlistError = null;
    try {
      const result = await createPlaylist({ stageId });
      if (result.playlistUrl) {
        window.location.reload();
      }
    } catch (err) {
      playlistError =
        err instanceof Error ? err.message : "Failed to create playlist";
    } finally {
      creatingPlaylist = false;
    }
  }

  function toggleSelection(submissionId: string) {
    const newSet = new Set(selectedSubmissions);
    if (newSet.has(submissionId)) {
      newSet.delete(submissionId);
    } else if (newSet.size < 3) {
      newSet.add(submissionId);
    }
    selectedSubmissions = newSet;
  }

  async function handleSubmitVotes() {
    if (selectedSubmissions.size !== 3) return;

    submittingVotes = true;
    votingError = null;
    try {
      const result = await castVotes({
        stageId: data.stage.id,
        submissionIds: Array.from(selectedSubmissions),
      });
      if (result.success) {
        window.location.reload();
      }
    } catch (err) {
      votingError =
        err instanceof Error ? err.message : "Failed to submit votes";
    } finally {
      submittingVotes = false;
    }
  }

  let { data }: PageProps = $props();

  function formatDeadline(date: Date): string {
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

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
      <div class="flex items-center justify-between">
        <Card.Title
          >Stage {data.stage.stageNumber}: {data.stage.vibe}</Card.Title
        >
        <Badge variant={phaseVariant[data.stage.phase]}
          >{data.stage.phase}</Badge
        >
      </div>
      {#if data.stage.description}
        <Card.Description>{data.stage.description}</Card.Description>
      {/if}
    </Card.Header>
    <Card.Content>
      <dl class="grid gap-2 text-sm">
        <div class="flex justify-between">
          <dt class="text-muted-foreground">Submission deadline</dt>
          <dd>{formatDeadline(data.stage.submissionDeadline)}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-muted-foreground">Voting deadline</dt>
          <dd>{formatDeadline(data.stage.votingDeadline)}</dd>
        </div>
      </dl>
    </Card.Content>
    {#if data.stage.playlistUrl}
      <Card.Footer>
        <a
          href={data.stage.playlistUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm text-primary hover:underline"
        >
          Listen to Stage Playlist on Spotify
        </a>
      </Card.Footer>
    {:else if data.canCreatePlaylist}
      <Card.Footer class="flex-col items-start gap-2">
        <Button
          variant="outline"
          onclick={() => handleCreatePlaylist(data.stage.id)}
          disabled={creatingPlaylist}
        >
          {creatingPlaylist ? "Creating..." : "Create Playlist Early"}
        </Button>
        {#if playlistError}
          <p class="text-sm text-destructive">{playlistError}</p>
        {/if}
      </Card.Footer>
    {/if}
  </Card.Root>

  {#if data.canSubmit}
    <Card.Root>
      <Card.Header>
        <Card.Title>Submit a Track</Card.Title>
        <Card.Description>
          {data.userSubmissions.length} of {data.maxSubmissions} submission{data.maxSubmissions >
          1
            ? "s"
            : ""} used
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <form {...submitTrack} class="space-y-4">
          <input type="hidden" name="stageId" value={data.stage.id} />
          <Field.Group>
            <Field.Field>
              <Field.Label for="spotifyUrl">Spotify URL</Field.Label>
              {#each submitTrack.fields.spotifyUrl.issues() as issue}
                <Field.Error>{issue.message}</Field.Error>
              {/each}
              <Input
                id="spotifyUrl"
                {...submitTrack.fields.spotifyUrl.as("url")}
                placeholder="https://open.spotify.com/track/..."
              />
            </Field.Field>
            <Field.Field>
              <Field.Label for="note">Note (optional)</Field.Label>
              {#each submitTrack.fields.note.issues() as issue}
                <Field.Error>{issue.message}</Field.Error>
              {/each}
              <Textarea
                id="note"
                name="note"
                maxlength={280}
                placeholder="Why does this track fit the vibe?"
              />
            </Field.Field>
            <Button type="submit">Submit Track</Button>
          </Field.Group>
        </form>
      </Card.Content>
    </Card.Root>
  {/if}

  {#if data.userSubmissions.length > 0}
    <Card.Root>
      <Card.Header>
        <Card.Title>Your Submissions</Card.Title>
      </Card.Header>
      <Card.Content class="space-y-4">
        {#each data.userSubmissions as sub}
          <div class="space-y-2">
            <SpotifyEmbed url={sub.spotifyUrl} />
            {#if sub.note}
              <p class="text-sm text-muted-foreground">{sub.note}</p>
            {/if}
          </div>
        {/each}
      </Card.Content>
    </Card.Root>
  {/if}

  {#if data.canVote}
    <Card.Root>
      <Card.Header>
        <Card.Title>Cast Your Votes</Card.Title>
        <Card.Description>
          Select 3 submissions to award your stars ({selectedSubmissions.size}/3
          selected)
        </Card.Description>
      </Card.Header>
      <Card.Content class="space-y-4">
        {#each data.votableSubmissions as sub}
          {@const isSelected = selectedSubmissions.has(sub.id)}
          <button
            type="button"
            class="w-full space-y-2 rounded-lg border-2 p-3 text-left transition-colors {isSelected
              ? 'border-primary bg-primary/5'
              : 'border-transparent hover:border-muted'}"
            onclick={() => toggleSelection(sub.id)}
          >
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium">{sub.user.name}</p>
              <Star
                class="size-5 {isSelected
                  ? 'fill-primary text-primary'
                  : 'text-muted-foreground'}"
              />
            </div>
            <SpotifyEmbed url={sub.spotifyUrl} interactive={false} />
            {#if sub.note}
              <p class="text-sm text-muted-foreground">{sub.note}</p>
            {/if}
          </button>
        {/each}
      </Card.Content>
      <Card.Footer class="flex-col items-start gap-2">
        <Button
          onclick={handleSubmitVotes}
          disabled={selectedSubmissions.size !== 3 || submittingVotes}
        >
          {submittingVotes ? "Submitting..." : "Submit Votes"}
        </Button>
        {#if votingError}
          <p class="text-sm text-destructive">{votingError}</p>
        {/if}
      </Card.Footer>
    </Card.Root>
  {:else if data.stage.phase === "voting" && data.otherSubmissions.length < 4}
    <Card.Root>
      <Card.Header>
        <Card.Title>Voting Unavailable</Card.Title>
        <Card.Description>
          Not enough submissions for voting (minimum 4 required)
        </Card.Description>
      </Card.Header>
    </Card.Root>
  {/if}

  {#if data.hasVoted || data.stage.phase === "closed"}
    {#if data.voteResults.length > 0}
      <Card.Root>
        <Card.Header>
          <Card.Title>Results</Card.Title>
          {#if data.hasVoted && data.stage.phase !== "closed"}
            <Card.Description
              >You voted! Results will be final when voting closes.</Card.Description
            >
          {/if}
        </Card.Header>
        <Card.Content class="space-y-6">
          {#each data.voteResults as result}
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <Badge variant={result.rank === 1 ? "default" : "secondary"}>
                  {getRankLabel(result.rank)}
                </Badge>
                <span class="text-sm font-medium"
                  >{result.submission.user.name}</span
                >
                <span class="ml-auto text-sm text-muted-foreground">
                  {result.starsReceived} star{result.starsReceived !== 1
                    ? "s"
                    : ""}
                </span>
              </div>
              <SpotifyEmbed url={result.submission.spotifyUrl} />
              {#if result.submission.note}
                <p class="text-sm text-muted-foreground">
                  {result.submission.note}
                </p>
              {/if}
              {#if result.voters.length > 0}
                <div
                  class="flex items-center gap-1 text-xs text-muted-foreground"
                >
                  <span>Voted by:</span>
                  {#each result.voters as voter, i}
                    <span
                      >{voter.name}{i < result.voters.length - 1
                        ? ","
                        : ""}</span
                    >
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </Card.Content>
        <Card.Footer>
          <a
            href="/b/{data.battle.id}/s/{data.stage.id}/results"
            class="text-sm text-primary hover:underline"
          >
            View Full Results
          </a>
        </Card.Footer>
      </Card.Root>
    {/if}
  {:else if data.otherSubmissions.length > 0 && !data.canVote && data.stage.phase !== "submission"}
    <Card.Root>
      <Card.Header>
        <Card.Title>All Submissions</Card.Title>
      </Card.Header>
      <Card.Content class="space-y-4">
        {#each data.otherSubmissions as sub}
          <div class="space-y-2">
            <p class="text-sm font-medium">{sub.user.name}</p>
            <SpotifyEmbed url={sub.spotifyUrl} />
            {#if sub.note}
              <p class="text-sm text-muted-foreground">{sub.note}</p>
            {/if}
          </div>
        {/each}
      </Card.Content>
    </Card.Root>
  {/if}
</main>
