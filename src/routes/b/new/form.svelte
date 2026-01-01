<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Switch } from "$lib/components/ui/switch";
  import * as Field from "$lib/components/ui/field";
  import * as Select from "$lib/components/ui/select";
  import { DateTimePicker } from "$lib/components/ui/datetime-picker";
  import { createBattle } from "$lib/remote/battle.remote";

  type StageInput = {
    title: string;
    submissionDeadline: string;
    votingDeadline: string;
  };

  let id = $props.id();
  let visibility = $state("private");
  let timezone = $state("America/Los_Angeles");
  let doubleSubmissions = $state(false);

  let stages = $state<StageInput[]>([
    { title: "", submissionDeadline: "", votingDeadline: "" },
  ]);

  function addStage() {
    stages = [
      ...stages,
      { title: "", submissionDeadline: "", votingDeadline: "" },
    ];
  }

  function removeStage(index: number) {
    stages = stages.filter((_, i) => i !== index);
  }
</script>

<form {...createBattle}>
  <Field.Set>
    <Field.Legend>Create Battle</Field.Legend>
    <Field.Separator />
    <Field.Group>
      <Field.Field orientation="responsive">
        <Field.Content>
          <Field.Label for="name-{id}">Name</Field.Label>
          {#each createBattle.fields.name.issues() as issue}
            <Field.Error>{issue.message}</Field.Error>
          {/each}
        </Field.Content>
        <Input id="name-{id}" {...createBattle.fields.name.as("text")} />
      </Field.Field>

      <Field.Field orientation="responsive">
        <Field.Content>
          <Field.Label for="visibility-{id}">Visibility</Field.Label>
          {#each createBattle.fields.visibility.issues() as issue}
            <Field.Error>{issue.message}</Field.Error>
          {/each}
        </Field.Content>
        <input type="hidden" name="visibility" value={visibility} />
        <Select.Root type="single" bind:value={visibility}>
          <Select.Trigger id="visibility-{id}">
            {visibility === "public" ? "Public" : "Private"}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="private" label="Private" />
            <Select.Item value="public" label="Public" />
          </Select.Content>
        </Select.Root>
      </Field.Field>

      <Field.Field orientation="responsive">
        <Field.Content>
          <Field.Label for="maxPlayers-{id}">Max Players</Field.Label>
          {#each createBattle.fields.maxPlayers.issues() as issue}
            <Field.Error>{issue.message}</Field.Error>
          {/each}
        </Field.Content>
        <Input
          {...createBattle.fields.maxPlayers.as("number")}
          id="maxPlayers-{id}"
          min={2}
          max={32}
        />
      </Field.Field>

      <Field.Field orientation="responsive">
        <Field.Content>
          <Field.Label for="timezone-{id}">Timezone</Field.Label>
        </Field.Content>
        <input type="hidden" name="authoritativeTimezone" value={timezone} />
        <Select.Root type="single" bind:value={timezone}>
          <Select.Trigger id="timezone-{id}">
            {timezone || "Select timezone"}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="America/New_York" label="Eastern (ET)" />
            <Select.Item value="America/Chicago" label="Central (CT)" />
            <Select.Item value="America/Denver" label="Mountain (MT)" />
            <Select.Item value="America/Los_Angeles" label="Pacific (PT)" />
          </Select.Content>
        </Select.Root>
      </Field.Field>

      <Field.Separator />
      <Field.Title>Stages</Field.Title>

      {#each stages as stage, i}
        <div class="space-y-4 rounded-lg border p-4">
          <div class="flex items-center justify-between">
            <span class="font-medium">Stage {i + 1}</span>
            {#if stages.length > 1}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onclick={() => removeStage(i)}
              >
                Remove
              </Button>
            {/if}
          </div>

          <Field.Field>
            <Field.Label>Title</Field.Label>
            <Input name="stages[{i}].title" bind:value={stage.title} required />
          </Field.Field>

          <div class="grid grid-cols-2 gap-4">
            <Field.Field>
              <Field.Label>Submission Deadline</Field.Label>
              <DateTimePicker
                name="stages[{i}].submissionDeadline"
                bind:value={stage.submissionDeadline}
                placeholder="Submissions close..."
                required
              />
            </Field.Field>

            <Field.Field>
              <Field.Label>Voting Deadline</Field.Label>
              <DateTimePicker
                name="stages[{i}].votingDeadline"
                bind:value={stage.votingDeadline}
                placeholder="Voting closes..."
                required
              />
            </Field.Field>
          </div>
        </div>
      {/each}

      <Button type="button" variant="outline" onclick={addStage}>
        Add Stage
      </Button>

      <Field.Field orientation="horizontal">
        <Switch id="doubleSubmissions-{id}" bind:checked={doubleSubmissions} />
        <input
          type="hidden"
          name="doubleSubmissions"
          value={doubleSubmissions ? "true" : ""}
        />
        <Field.Content>
          <Field.Label for="doubleSubmissions-{id}">
            Allow Double Submissions
          </Field.Label>
          {#each createBattle.fields.doubleSubmissions.issues() as issue}
            <Field.Error>{issue.message}</Field.Error>
          {/each}
        </Field.Content>
      </Field.Field>

      <Field.Separator />
      <Field.Field orientation="responsive" class="justify-end">
        <Button type="reset" variant="outline">Reset</Button>
        <Button type="submit">Create</Button>
      </Field.Field>
    </Field.Group>
  </Field.Set>
</form>
