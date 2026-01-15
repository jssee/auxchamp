<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import * as Field from "$lib/components/ui/field";
  import { submitTrack, createPlaylist } from "$lib/remote/stage.remote";
  import type { PageProps } from "./$types";

  let creatingPlaylist = $state(false);
  let playlistError = $state<string | null>(null);

  async function handleCreatePlaylist(stageId: string) {
    creatingPlaylist = true;
    playlistError = null;
    try {
      const result = await createPlaylist({ stageId });
      if (result.playlistUrl) {
        window.location.reload();
      }
    } catch (err) {
      playlistError = err instanceof Error ? err.message : "Failed to create playlist";
    } finally {
      creatingPlaylist = false;
    }
  }

  let { data }: PageProps = $props();

  function extractTrackId(url: string): string | null {
    const match = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

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
          {@const trackId = sub.spotifyUrl
            ? extractTrackId(sub.spotifyUrl)
            : null}
          <div class="space-y-2">
            {#if trackId}
              <iframe
                title="Spotify embed"
                src="https://open.spotify.com/embed/track/{trackId}"
                width="100%"
                height="80"
                allow="encrypted-media"
                style="border-radius: 12px"
              ></iframe>
            {:else}
              <p class="text-sm text-muted-foreground">{sub.spotifyUrl}</p>
            {/if}
            {#if sub.note}
              <p class="text-sm text-muted-foreground">{sub.note}</p>
            {/if}
          </div>
        {/each}
      </Card.Content>
    </Card.Root>
  {/if}

  {#if data.otherSubmissions.length > 0}
    <Card.Root>
      <Card.Header>
        <Card.Title>All Submissions</Card.Title>
      </Card.Header>
      <Card.Content class="space-y-4">
        {#each data.otherSubmissions as sub}
          {@const trackId = sub.spotifyUrl
            ? extractTrackId(sub.spotifyUrl)
            : null}
          <div class="space-y-2">
            <p class="text-sm font-medium">{sub.user.name}</p>
            {#if trackId}
              <iframe
                title="Spotify embed"
                src="https://open.spotify.com/embed/track/{trackId}"
                width="100%"
                height="80"
                allow="encrypted-media"
                style="border-radius: 12px"
              ></iframe>
            {:else}
              <p class="text-sm text-muted-foreground">{sub.spotifyUrl}</p>
            {/if}
            {#if sub.note}
              <p class="text-sm text-muted-foreground">{sub.note}</p>
            {/if}
          </div>
        {/each}
      </Card.Content>
    </Card.Root>
  {/if}
</main>
