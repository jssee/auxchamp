<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Field from "$lib/components/ui/field";
  import { Input } from "$lib/components/ui/input";
  import { fieldInvalid } from "$lib/utils";

  import { signUp } from "./auth.remote";

  let id = $props.id();
</script>

<form {...signUp}>
  <Field.Error errors={signUp.fields.allIssues()} />

  <Field.Set>
    <Field.Field data-invalid={fieldInvalid(signUp.fields.username.issues())}>
      <Field.Label for="username-{id}">Username</Field.Label>
      <Input
        id="username-{id}"
        autocomplete="username"
        placeholder="your_name"
        {...signUp.fields.username.as("text")}
      />
      <Field.Error errors={signUp.fields.username.issues()} />
    </Field.Field>

    <Field.Field data-invalid={fieldInvalid(signUp.fields.name.issues())}>
      <Field.Label for="name-{id}"
        >Name <span class="text-muted-foreground">(optional)</span></Field.Label
      >
      <Input
        id="name-{id}"
        autocomplete="name"
        placeholder="Jane Doe"
        {...signUp.fields.name.as("text")}
      />
      <Field.Error errors={signUp.fields.name.issues()} />
    </Field.Field>

    <Field.Field data-invalid={fieldInvalid(signUp.fields.email.issues())}>
      <Field.Label for="email-{id}">Email</Field.Label>
      <Input
        id="email-{id}"
        autocomplete="email"
        placeholder="you@example.com"
        {...signUp.fields.email.as("email")}
      />
      <Field.Error errors={signUp.fields.email.issues()} />
    </Field.Field>

    <Field.Field data-invalid={fieldInvalid(signUp.fields.password.issues())}>
      <Field.Label for="password-{id}">Password</Field.Label>
      <Input
        id="password-{id}"
        autocomplete="new-password"
        {...signUp.fields.password.as("password")}
      />
      <Field.Error errors={signUp.fields.password.issues()} />
    </Field.Field>

    <Button type="submit">Sign up</Button>
  </Field.Set>
</form>
