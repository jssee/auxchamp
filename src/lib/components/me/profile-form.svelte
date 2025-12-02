<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import * as Field from "$lib/components/ui/field";
  import { updateMe } from "../../../routes/me/me.remote";
  import type { Session } from "$lib/auth";

  let { user }: { user: Session["user"] } = $props();
  let id = $props.id();
</script>

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
          <Field.Label for="name-{id}">Username</Field.Label>
          <Field.Description class="text-balance">
            This is the handle that other users will see.
          </Field.Description>
          {#each updateMe.fields.name.issues() as issue}
            <Field.Error>{issue.message}</Field.Error>
          {/each}
        </Field.Content>
        <Input
          id="name-{id}"
          placeholder={user.name}
          {...updateMe.fields.name.as("text")}
        />
      </Field.Field>
      <Field.Field orientation="responsive">
        <Field.Content>
          <Field.Label for="email-{id}">Email</Field.Label>
          <Field.Description class="text-balance">
            We will never share your email with anyone, or send you any spam.
          </Field.Description>
          {#each updateMe.fields.email.issues() as issue}
            <Field.Error>{issue.message}</Field.Error>
          {/each}
        </Field.Content>
        <Input
          id="email-{id}"
          placeholder={user.email}
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
