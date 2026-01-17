<script lang="ts">
  import { extractTrackId } from "$lib/utils/spotify";

  interface Props {
    url: string | null;
    interactive?: boolean;
  }

  let { url, interactive = true }: Props = $props();

  const trackId = $derived(url ? extractTrackId(url) : null);
</script>

{#if trackId}
  <iframe
    title="Spotify embed"
    src="https://open.spotify.com/embed/track/{trackId}"
    width="100%"
    height="80"
    allow="encrypted-media"
    style="border-radius: 12px;{interactive ? '' : ' pointer-events: none;'}"
  ></iframe>
{:else if url}
  <p class="text-sm text-muted-foreground">{url}</p>
{/if}
