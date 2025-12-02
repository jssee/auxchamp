<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import * as Field from "$lib/components/ui/field";
  import { updatePassword } from "$lib/auth/auth.remote";

  let id = $props.id();
</script>

<form {...updatePassword}>
  <Field.Set>
    <Field.Legend>Password</Field.Legend>
    <Field.Description>
      You will have to sign in again after changing your password.
    </Field.Description>
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
