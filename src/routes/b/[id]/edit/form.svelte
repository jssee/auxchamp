<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import * as Field from "$lib/components/ui/field";
  import * as Select from "$lib/components/ui/select";
  import { updateBattle, deleteBattle } from "$lib/remote/battle.remote";

  let { battle } = $props();
  let id = $props.id();

  let visibility = $state(battle.visibility);
  let doubleSubmissions = $state(battle.doubleSubmissions);
</script>

<!-- Update form -->
<form action="{updateBattle.action}?id={battle.id}" method="post">
  <Field.Set>
    <Field.Legend>Edit Battle</Field.Legend>
    <Field.Description>Update your battle settings.</Field.Description>
    <Field.Separator />
    <Field.Group>
      <Field.Field orientation="responsive">
        <Field.Content>
          <Field.Label for="name-{id}">Name</Field.Label>
          <Field.Description>The name of your battle.</Field.Description>
        </Field.Content>
        <Input
          id="name-{id}"
          name="name"
          type="text"
          value={battle.name}
          required
        />
      </Field.Field>

      <Field.Field orientation="responsive">
        <Field.Content>
          <Field.Label for="visibility-{id}">Visibility</Field.Label>
          <Field.Description>
            Who can see and join this battle.
          </Field.Description>
        </Field.Content>
        <Select.Root type="single" name="visibility" bind:value={visibility}>
          <Select.Trigger id="visibility-{id}">
            {visibility === "public" ? "Public" : "Private"}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="public" label="Public" />
            <Select.Item value="private" label="Private" />
          </Select.Content>
        </Select.Root>
      </Field.Field>

      <Field.Field orientation="responsive">
        <Field.Content>
          <Field.Label for="maxPlayers-{id}">Max Players</Field.Label>
          <Field.Description>
            Maximum number of players (2-32).
          </Field.Description>
        </Field.Content>
        <Input
          id="maxPlayers-{id}"
          name="maxPlayers"
          type="number"
          min={2}
          max={32}
          value={battle.maxPlayers}
          required
        />
      </Field.Field>

      <Field.Field orientation="horizontal">
        <Checkbox
          id="doubleSubmissions-{id}"
          bind:checked={doubleSubmissions}
        />
        <input
          type="hidden"
          name="doubleSubmissions"
          value={doubleSubmissions ? "true" : ""}
        />
        <Field.Content>
          <Field.Label for="doubleSubmissions-{id}">
            Double Submissions
          </Field.Label>
          <Field.Description>
            Allow players to submit more than one track per stage.
          </Field.Description>
        </Field.Content>
      </Field.Field>

      <Field.Separator />
      <Field.Field orientation="responsive" class="justify-end">
        <Button type="submit">Update Battle</Button>
      </Field.Field>
    </Field.Group>
  </Field.Set>
</form>

<!-- Delete form (separate) -->
<form {...deleteBattle} class="mt-8">
  <Field.Set>
    <Field.Legend>Danger Zone</Field.Legend>
    <Field.Description>Irreversible actions.</Field.Description>
    <Field.Separator />
    <Field.Group>
      <Field.Field orientation="responsive">
        <Field.Content>
          <Field.Label>Cancel Battle</Field.Label>
          <Field.Description>
            This will cancel the battle. This action cannot be undone.
          </Field.Description>
        </Field.Content>
        <input type="hidden" name="id" value={battle.id} />
        <Button type="submit" variant="destructive">Delete Battle</Button>
      </Field.Field>
    </Field.Group>
  </Field.Set>
</form>
