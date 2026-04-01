<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import Counter from "$lib/components/counter.svelte";
  import * as Field from "$lib/components/ui/field";
  import * as Card from "$lib/components/ui/card";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Input } from "$lib/components/ui/input";
  import { createGame } from "$lib/game.remote";

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
      <Field.Error errors={createGame.fields.description.issues()} />
    </Field.Field>

    <header>
      <h3 class="tracking-tigher font-display text-xs font-medium uppercase">
        Phase durations
      </h3>
      <p class="text-sm text-muted-foreground">
        How long (in days) players have to submit and vote for each round.
      </p>
    </header>

    <div class="grid grid-cols-2 gap-4 **:justify-center">
      <Card.Root class="has:data-invalid:border-red-500">
        <Card.Content class="grid w-auto">
          <Field.Field
            data-invalid={createGame.fields.submissionWindowDays.issues()
              ?.length
              ? "true"
              : undefined}
          >
            <Field.Label for="submissionDays">Submission</Field.Label>
            <input
              id="submissionDays"
              class="visually-hidden"
              {...createGame.fields.submissionWindowDays.as("number")}
            />
            <Counter bind:value={submissionDays} min={1} max={14} />
            <Field.Error
              errors={createGame.fields.submissionWindowDays.issues()}
            />
          </Field.Field>
        </Card.Content>
      </Card.Root>

      <Card.Root class="has:data-invalid:border-red-500">
        <Card.Content class="grid w-auto">
          <Field.Field
            data-invalid={createGame.fields.votingWindowDays.issues()?.length
              ? "true"
              : undefined}
          >
            <Field.Label for="votingDays">Voting</Field.Label>
            <input
              id="votingDays"
              type="hidden"
              name={createGame.fields.votingWindowDays.as("number").name}
              value={votingDays}
            />
            <Counter bind:value={votingDays} min={1} max={14} />
            <Field.Error errors={createGame.fields.votingWindowDays.issues()} />
          </Field.Field>
        </Card.Content>
      </Card.Root>
    </div>

    <Button type="submit" size="lg" disabled={createGame.pending > 0}>
      {createGame.pending > 0 ? "Creating..." : "Create Game"}
    </Button>
  </Field.Group>
</form>
