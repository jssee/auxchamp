<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Field from "$lib/components/ui/field";
  import { Input } from "$lib/components/ui/input";
  import { fieldInvalid } from "$lib/utils";

  import { signIn } from "./auth.remote";

  let id = $props.id();
</script>

<form {...signIn}>
  <Field.Error errors={signIn.fields.allIssues()} />

  <Field.Set>
    <Field.Field data-invalid={fieldInvalid(signIn.fields.email.issues())}>
      <Field.Label for="email-{id}">Email</Field.Label>
      <Input
        id="email-{id}"
        autocomplete="email"
        placeholder="you@example.com"
        {...signIn.fields.email.as("email")}
      />
      <Field.Error errors={signIn.fields.email.issues()} />
    </Field.Field>

    <Field.Field data-invalid={fieldInvalid(signIn.fields.password.issues())}>
      <Field.Label for="password-{id}">Password</Field.Label>
      <Input
        id="password-{id}"
        autocomplete="current-password"
        {...signIn.fields.password.as("password")}
      />
      <Field.Error errors={signIn.fields.password.issues()} />
    </Field.Field>

    <Button type="submit">Sign in</Button>
  </Field.Set>
</form>
