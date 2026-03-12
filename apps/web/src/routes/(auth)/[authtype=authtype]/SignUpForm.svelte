<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Field from "$lib/components/ui/field";
  import { Input } from "$lib/components/ui/input";

  import { signUp } from "./auth.remote";

  let id = $props.id();
</script>

<form {...signUp}>
  {#each signUp.fields.allIssues() as issue}
    <Field.Error>{issue.message}</Field.Error>
  {/each}

  <Field.Set>
    <Field.Field>
      <Field.Label for="username-{id}">Username</Field.Label>
      <Input
        id="username-{id}"
        autocomplete="username"
        placeholder="your_name"
        {...signUp.fields.username.as("text")}
      />
      <div class="*:leading-snug">
        {#each signUp.fields.username.issues() as issue}
          <Field.Error>{issue.message}</Field.Error>
        {/each}
      </div>
    </Field.Field>

    <Field.Field>
      <Field.Label for="name-{id}">Name <span class="text-muted-foreground">(optional)</span></Field.Label>
      <Input
        id="name-{id}"
        autocomplete="name"
        placeholder="Jane Doe"
        {...signUp.fields.name.as("text")}
      />
      <div class="*:leading-snug">
        {#each signUp.fields.name.issues() as issue}
          <Field.Error>{issue.message}</Field.Error>
        {/each}
      </div>
    </Field.Field>

    <Field.Field>
      <Field.Label for="email-{id}">Email</Field.Label>
      <Input
        id="email-{id}"
        autocomplete="email"
        placeholder="you@example.com"
        {...signUp.fields.email.as("email")}
      />
      <div class="*:leading-snug">
        {#each signUp.fields.email.issues() as issue}
          <Field.Error>{issue.message}</Field.Error>
        {/each}
      </div>
    </Field.Field>

    <Field.Field>
      <Field.Label for="password-{id}">Password</Field.Label>
      <Input
        id="password-{id}"
        autocomplete="new-password"
        {...signUp.fields.password.as("password")}
      />
      <div class="*:leading-snug">
        {#each signUp.fields.password.issues() as issue}
          <Field.Error>{issue.message}</Field.Error>
        {/each}
      </div>
    </Field.Field>

    <Button type="submit">Sign up</Button>
  </Field.Set>
</form>
