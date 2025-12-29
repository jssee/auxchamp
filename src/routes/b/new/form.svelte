<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import * as Field from "$lib/components/ui/field";
  import * as Select from "$lib/components/ui/select";
  import { createBattle } from "$lib/remote/battle.remote";

  let id = $props.id();
  let visibility = $state("private");
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
          <Field.Label for="doubleSubmissions-{id}">
            Allow Double Submissions
          </Field.Label>
          {#each createBattle.fields.doubleSubmissions.issues() as issue}
            <Field.Error>{issue.message}</Field.Error>
          {/each}
        </Field.Content>
        <Checkbox
          id="doubleSubmissions-{id}"
          name="doubleSubmissions"
          value="true"
        />
      </Field.Field>

      <Field.Separator />
      <Field.Field orientation="responsive" class="justify-end">
        <Button type="reset" variant="outline">Reset</Button>
        <Button type="submit">Create</Button>
      </Field.Field>
    </Field.Group>
  </Field.Set>
</form>
