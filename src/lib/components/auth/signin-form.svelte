<script lang="ts">
  import { signIn } from "$lib/auth/auth.remote";
  import * as Field from "$lib/components/ui/field";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";

  let id = $props.id();
</script>

<form {...signIn}>
  {#each signIn.fields.allIssues() as issue}
    <Field.Error>{issue.message}</Field.Error>
  {/each}

  <Field.Set>
    <Field.Field>
      <Field.Label for="email-{id}">Email</Field.Label>
      <Input
        id="email-{id}"
        autocomplete="email"
        placeholder="you@example.com"
        {...signIn.fields.email.as("email")}
      />
      <div class="[&>*]:leading-snug">
        {#each signIn.fields.email.issues() as issue}
          <Field.Error>{issue.message}</Field.Error>
        {/each}
      </div>
    </Field.Field>

    <Field.Field>
      <Field.Label for="password-{id}">Password</Field.Label>
      <Input
        id="password-{id}"
        autocomplete="current-password"
        {...signIn.fields.password.as("password")}
      />
      {#each signIn.fields.password.issues() as issue}
        <Field.Error>{issue.message}</Field.Error>
      {/each}
    </Field.Field>
    <Button type="submit">Sign up</Button>
  </Field.Set>
</form>
