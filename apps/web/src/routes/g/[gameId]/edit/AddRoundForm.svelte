<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { addRound } from "$lib/game.remote";

  let { gameId }: { gameId: string } = $props();
</script>

<form class="mt-3" {...addRound}>
  <input {...addRound.fields.gameId.as("hidden", gameId)} />

  <Field.Group class="gap-3">
    <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <Field.Field
        class="min-w-0"
        data-invalid={addRound.fields.theme.issues()?.length
          ? "true"
          : undefined}
      >
        <Field.Label for="round-theme">Round theme</Field.Label>
        <Input
          id="round-theme"
          placeholder="Round theme"
          required
          {...addRound.fields.theme.as("text")}
        />
        <Field.Error errors={addRound.fields.theme.issues()} />
      </Field.Field>

      <Button
        type="submit"
        class="w-full self-start sm:mt-6 sm:w-auto"
        disabled={addRound.pending > 0}
      >
        {addRound.pending > 0 ? "Adding..." : "Add Round"}
      </Button>
    </div>

    <Field.Field
      data-invalid={addRound.fields.description.issues()?.length
        ? "true"
        : undefined}
    >
      <Field.Label for="round-description">Description</Field.Label>
      <Input
        id="round-description"
        placeholder="Description (optional)"
        {...addRound.fields.description.as("text")}
      />
      <Field.Description
        >Optional context players should see for this round.</Field.Description
      >
      <Field.Error errors={addRound.fields.description.issues()} />
    </Field.Field>
  </Field.Group>
</form>
