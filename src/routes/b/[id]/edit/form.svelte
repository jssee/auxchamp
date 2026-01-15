<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Switch } from "$lib/components/ui/switch";
  import * as Field from "$lib/components/ui/field";
  import * as Select from "$lib/components/ui/select";
  import { updateBattle, cancelBattle } from "$lib/remote/battle.remote";

  let { battle } = $props();
  let id = $props.id();

  let visibility = $state(battle.visibility);
  let doubleSubmissions = $state(battle.doubleSubmissions);
  let copied = $state(false);
</script>

<!-- Update form -->
<form {...updateBattle}>
  <input type="hidden" name="id" value={battle.id} />
  <Field.Set>
    <Field.Legend>Edit Battle</Field.Legend>
    <Field.Description>Update your battle settings.</Field.Description>
    <Field.Separator />
    <Field.Group>
      <Field.Field orientation="responsive">
        <Field.Content>
          <Field.Label for="name-{id}">Name</Field.Label>
          {#each updateBattle.fields.name.issues() as issue}
            <Field.Error>{issue.message}</Field.Error>
          {/each}
        </Field.Content>
        <Input
          id="name-{id}"
          {...updateBattle.fields.name.as("text")}
          value={battle.name}
        />
      </Field.Field>

      <Field.Field orientation="responsive">
        <Field.Content>
          <Field.Label for="visibility-{id}">Visibility</Field.Label>
          {#each updateBattle.fields.visibility.issues() as issue}
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
          {#each updateBattle.fields.maxPlayers.issues() as issue}
            <Field.Error>{issue.message}</Field.Error>
          {/each}
        </Field.Content>
        <Input
          {...updateBattle.fields.maxPlayers.as("number")}
          id="maxPlayers-{id}"
          min={2}
          max={32}
          value={battle.maxPlayers}
        />
      </Field.Field>

      <Field.Field orientation="horizontal">
        <Switch id="doubleSubmissions-{id}" bind:checked={doubleSubmissions} />
        <input
          type="hidden"
          name="doubleSubmissions"
          value={doubleSubmissions ? "true" : ""}
        />
        <Field.Content>
          <Field.Label for="doubleSubmissions-{id}">
            Double Submissions
          </Field.Label>
          {#each updateBattle.fields.doubleSubmissions.issues() as issue}
            <Field.Error>{issue.message}</Field.Error>
          {/each}
        </Field.Content>
      </Field.Field>

      <Field.Separator />
      <Field.Field orientation="responsive" class="justify-end">
        <Button type="submit">Update Battle</Button>
      </Field.Field>
    </Field.Group>
  </Field.Set>
</form>

<!-- Invite Link section -->
{#if battle.inviteCode}
  <div class="mt-8">
    <Field.Set>
      <Field.Legend>Invite Link</Field.Legend>
      <Field.Description>Share this link to invite players to your battle.</Field.Description>
      <Field.Separator />
      <Field.Group>
        <Field.Field orientation="responsive">
          <Field.Content>
            <Field.Label>Link</Field.Label>
          </Field.Content>
          <div class="flex gap-2">
            <Input
              readonly
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${battle.inviteCode}`}
              class="font-mono text-sm"
            />
            <Button
              type="button"
              variant="outline"
              onclick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `${window.location.origin}/invite/${battle.inviteCode}`
                  );
                  copied = true;
                  setTimeout(() => (copied = false), 2000);
                } catch {
                  // Clipboard API failed - fail silently
                }
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </Field.Field>
      </Field.Group>
    </Field.Set>
  </div>
{/if}

<!-- Delete form (separate) -->
<form {...cancelBattle} class="mt-8">
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
