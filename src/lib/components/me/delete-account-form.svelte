<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import * as Item from "$lib/components/ui/item";
  import * as Field from "$lib/components/ui/field";
  import { deleteMe } from "../../../routes/me/me.remote";

  let confirmingDelete = $state(false);
  let deleteConfirmation = $state("");
  let phraseMatches = $derived(deleteConfirmation === "delete my account");
</script>

<Item.Root variant="outline" class="border-red-400/30">
  <Item.Content>
    <Item.Title>Delete Account</Item.Title>
    <Item.Description class="text-balance">
      This will delete your account and any associated data. This action is
      irreversible.
    </Item.Description>
  </Item.Content>
  <Item.Actions>
    <div class:invisible={confirmingDelete}>
      <Button
        variant="destructive"
        size="sm"
        onclick={() => (confirmingDelete = true)}
        disabled={confirmingDelete}
      >
        Delete Account
      </Button>
    </div>
  </Item.Actions>
  {#if confirmingDelete}
    <Field.Field orientation="horizontal">
      <Input
        bind:value={deleteConfirmation}
        placeholder="Type 'delete my account' to confirm"
      />
      <Button
        variant="ghost"
        onclick={() => {
          confirmingDelete = false;
          deleteConfirmation = "";
        }}
      >
        Cancel
      </Button>
      <form {...deleteMe}>
        <Button variant="destructive" disabled={!phraseMatches}>
          Confirm Deletion
        </Button>
      </form>
    </Field.Field>
  {/if}
</Item.Root>
