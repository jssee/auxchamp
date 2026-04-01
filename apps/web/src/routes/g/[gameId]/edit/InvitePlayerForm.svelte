<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Field from "$lib/components/ui/field";
  import { Input } from "$lib/components/ui/input";
  import { fieldInvalid } from "$lib/utils";
  import { invitePlayer } from "$lib/game.remote";

  let { gameId }: { gameId: string } = $props();
</script>

<form class="mt-3" {...invitePlayer}>
  <input {...invitePlayer.fields.gameId.as("hidden", gameId)} />

  <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
    <Field.Field
      class="min-w-0"
      data-invalid={fieldInvalid(invitePlayer.fields.targetUserEmail.issues())}
    >
      <Field.Label for="invite-player-email">Invite by email</Field.Label>
      <Input
        id="invite-player-email"
        placeholder="Invite by email"
        required
        {...invitePlayer.fields.targetUserEmail.as("email")}
      />
      <Field.Error errors={invitePlayer.fields.targetUserEmail.issues()} />
    </Field.Field>

    <Button
      type="submit"
      class="w-full self-start sm:mt-6 sm:w-auto"
      disabled={invitePlayer.pending > 0}
    >
      {invitePlayer.pending > 0 ? "Inviting..." : "Invite"}
    </Button>
  </div>
</form>
