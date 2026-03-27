<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import Counter from "$lib/components/counter.svelte";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { createGame } from "$lib/game.remote";

  // Form field names with `n:` prefix so SvelteKit coerces FormData strings to numbers
  const submissionName =
    createGame.fields.submissionWindowDays.as("number").name;
  const votingName = createGame.fields.votingWindowDays.as("number").name;

  let submissionDays = $state(
    createGame.fields.submissionWindowDays.value() ?? 1,
  );
  let votingDays = $state(createGame.fields.votingWindowDays.value() ?? 1);
</script>

<form {...createGame}>
  <Field.Group class="gap-4">
    <Field.Field
      data-invalid={createGame.fields.name.issues()?.length
        ? "true"
        : undefined}
    >
      <Field.Label for="name">Name</Field.Label>
      <Input id="name" required {...createGame.fields.name.as("text")} />
      <Field.Error errors={createGame.fields.name.issues()} />
    </Field.Field>

    <Field.Field
      data-invalid={createGame.fields.description.issues()?.length
        ? "true"
        : undefined}
    >
      <Field.Label for="description">Description</Field.Label>
      <Textarea
        id="description"
        rows={2}
        {...createGame.fields.description.as("text")}
      />
      <Field.Description
        >Optional. Add context players should see before round one starts.</Field.Description
      >
      <Field.Error errors={createGame.fields.description.issues()} />
    </Field.Field>

    <div class="grid gap-4 sm:grid-cols-2">
      <Field.Field
        data-invalid={createGame.fields.submissionWindowDays.issues()?.length
          ? "true"
          : undefined}
      >
        <Field.Label>Submission window (days)</Field.Label>
        <input type="hidden" name={submissionName} value={submissionDays} />
        <Counter bind:value={submissionDays} min={1} max={14} />
        <Field.Description
          >How long players have to submit a track each round.</Field.Description
        >
        <Field.Error errors={createGame.fields.submissionWindowDays.issues()} />
      </Field.Field>

      <Field.Field
        data-invalid={createGame.fields.votingWindowDays.issues()?.length
          ? "true"
          : undefined}
      >
        <Field.Label>Voting window (days)</Field.Label>
        <input type="hidden" name={votingName} value={votingDays} />
        <Counter bind:value={votingDays} min={1} max={14} />
        <Field.Description
          >How long players can vote after submissions close.</Field.Description
        >
        <Field.Error errors={createGame.fields.votingWindowDays.issues()} />
      </Field.Field>
    </div>

    <Button type="submit" class="w-full" disabled={createGame.pending > 0}>
      {createGame.pending > 0 ? "Creating..." : "Create Game"}
    </Button>
  </Field.Group>
</form>
