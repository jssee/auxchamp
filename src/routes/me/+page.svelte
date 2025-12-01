<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import * as Item from "$lib/components/ui/item";
  import * as Field from "$lib/components/ui/field";
  import { updatePassword } from "$lib/auth/auth.remote";
  import { deleteMe, updateMe } from "./me.remote";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  let id = $props.id();

  let confirmingDelete = $state(false);
  let deleteConfirmation = $state("");
  let phraseMatches = $derived(deleteConfirmation === "delete my account");
</script>

<main class="grid-layout grid-row-2 h-full">
  <div class="col-content flex flex-col gap-7">
    <section class="pt-7">
      <form {...updateMe}>
        <Field.Set>
          <Field.Legend>Profile</Field.Legend>
          <Field.Description>
            Unique, and a little bit dangerous. Just like you.
          </Field.Description>
          <Field.Separator />
          <Field.Group>
            <Field.Field orientation="responsive">
              <Field.Content>
                <Field.Label for="name">Username</Field.Label>
                <Field.Description class="text-balance">
                  This is the handle that other users will see.
                </Field.Description>
                {#each updateMe.fields.name.issues() as issue}
                  <Field.Error>{issue.message}</Field.Error>
                {/each}
              </Field.Content>
              <Input
                id="name-{id}"
                placeholder={data.user.name}
                {...updateMe.fields.name.as("text")}
              />
            </Field.Field>
            <Field.Field orientation="responsive">
              <Field.Content>
                <Field.Label for="name">Email</Field.Label>
                <Field.Description class="text-balance">
                  We will never share your email with anyone, or send you any
                  spam.
                </Field.Description>
                {#each updateMe.fields.email.issues() as issue}
                  <Field.Error>{issue.message}</Field.Error>
                {/each}
              </Field.Content>
              <Input
                id="email-{id}"
                placeholder={data.user.email}
                {...updateMe.fields.email.as("email")}
              />
            </Field.Field>
            <Field.Separator />
            <Field.Field orientation="responsive" class="justify-end">
              <Button type="reset" variant="outline">Reset</Button>
              <Button type="submit">Update</Button>
            </Field.Field>
          </Field.Group>
        </Field.Set>
      </form>
    </section>

    <section class="pt-7">
      <form {...updatePassword}>
        <Field.Set>
          <Field.Legend>Password</Field.Legend>
          {#each updatePassword.fields.allIssues() as issue}
            <Field.Error>{issue.message}</Field.Error>
          {/each}
          <Field.Separator />
          <Field.Group>
            <Field.Field orientation="responsive">
              <Field.Content>
                <Field.Label for="new-password-{id}">New Password</Field.Label>
              </Field.Content>
              <Input
                id="new-password-{id}"
                {...updatePassword.fields.newPassword.as("password")}
              />
            </Field.Field>
            <Field.Field orientation="responsive">
              <Field.Content>
                <Field.Label for="current-password-{id}">
                  Current Password
                </Field.Label>
              </Field.Content>
              <Input
                id="current-password-{id}"
                {...updatePassword.fields.currentPassword.as("password")}
              />
            </Field.Field>
            <Field.Separator />
            <Field.Field orientation="responsive" class="justify-end">
              <Button type="submit">Update Password</Button>
            </Field.Field>
          </Field.Group>
        </Field.Set>
      </form>
    </section>

    <section class="">
      <Item.Root variant="outline" class="border-red-400/30">
        <Item.Content>
          <Item.Title>Delete Account</Item.Title>
          <Item.Description class="text-balance">
            This will delete your account and any associated data. This action
            is irreversible.
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
    </section>
  </div>
</main>
